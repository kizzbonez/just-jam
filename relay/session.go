package main

import (
	"bufio"
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/quic-go/quic-go"
	"github.com/quic-go/quic-go/http3"
	"github.com/quic-go/webtransport-go"
)

const (
	controlAcceptTimeout = 5 * time.Second
	controlRatePerSecond = 30
	idleTimeout          = 20 * time.Second
	keepAlive            = 5 * time.Second
)

// Relay is the WebTransport front door: it admits ticket holders and then
// forwards their datagrams to the rest of their room.
type Relay struct {
	cfg *Config
	hub *Hub
	wt  *webtransport.Server
}

type controlIn struct {
	T     string          `json:"t"`
	Slot  uint8           `json:"slot"`
	State json.RawMessage `json:"state"`
}

func newRelay(cfg *Config, certs *CertStore, hub *Hub) *Relay {
	relay := &Relay{cfg: cfg, hub: hub}
	mux := http.NewServeMux()
	mux.HandleFunc("/jam", relay.handleJam)
	h3 := &http3.Server{
		Addr:    cfg.Addr,
		Handler: mux,
		TLSConfig: &tls.Config{
			GetCertificate: certs.GetCertificate,
			MinVersion:     tls.VersionTLS13,
			NextProtos:     []string{http3.NextProtoH3},
		},
		QUICConfig: &quic.Config{
			EnableDatagrams:                  true,
			EnableStreamResetPartialDelivery: true,
			MaxIdleTimeout:                   idleTimeout,
			KeepAlivePeriod:                  keepAlive,
		},
	}
	webtransport.ConfigureHTTP3Server(h3)
	relay.wt = &webtransport.Server{H3: h3, CheckOrigin: relay.checkOrigin}
	return relay
}

func (r *Relay) checkOrigin(req *http.Request) bool {
	return r.cfg.AllowedOrigins[req.Header.Get("Origin")]
}

func (r *Relay) handleJam(w http.ResponseWriter, req *http.Request) {
	claims, err := verifyTicket(req.URL.Query().Get("ticket"), r.cfg.Secret, time.Now())
	if err != nil {
		http.Error(w, "invalid ticket", http.StatusUnauthorized)
		return
	}
	sess, err := r.wt.Upgrade(w, req)
	if err != nil {
		slog.Warn("upgrade failed", "err", err)
		return
	}
	r.serve(sess, claims)
}

func closeCodeFor(err error) webtransport.SessionErrorCode {
	switch {
	case errors.Is(err, errRoomFull):
		return closeRoomFull
	case errors.Is(err, errBanned):
		return closeBanned
	default:
		return closeProtocol
	}
}

// serve runs one participant from admission until their session ends.
func (r *Relay) serve(sess *webtransport.Session, claims *Claims) {
	ctx := sess.Context()
	acceptCtx, cancel := context.WithTimeout(ctx, controlAcceptTimeout)
	stream, err := sess.AcceptStream(acceptCtx)
	cancel()
	if err != nil {
		_ = sess.CloseWithError(closeProtocol, "expected a control stream")
		return
	}
	peer := newPeer(sess, claims)
	if err := r.hub.Join(peer); err != nil {
		_ = sess.CloseWithError(closeCodeFor(err), err.Error())
		return
	}
	slog.Info("peer joined", "room", claims.Room, "slot", peer.slot)
	defer func() {
		r.hub.Leave(peer, "left")
		peer.close(closeProtocol, "session ended")
		slog.Info("peer left", "room", claims.Room, "slot", peer.slot, "dropped", peer.dropped.Load())
	}()
	go peer.writeControl(stream)
	go peer.writeDatagrams()
	go r.readControl(peer, stream)
	r.pump(ctx, peer)
}

// pump is the hot path: one goroutine per sender, no locks, no allocation
// beyond what the QUIC stack does for the datagram itself.
func (r *Relay) pump(ctx context.Context, peer *Peer) {
	for {
		b, err := peer.sess.ReceiveDatagram(ctx)
		if err != nil {
			return
		}
		if len(b) < 2 || len(b) > maxDatagramLen {
			continue
		}
		switch b[0] {
		case typePing:
			b[0] = typePong
			peer.sendDatagram(b)
		case typeAudio:
			if len(b) < audioHeaderLen || peer.gone.Load() {
				continue
			}
			b[1] = peer.slot
			for _, other := range *peer.room.fanout.Load() {
				if other != peer {
					other.sendDatagram(b)
				}
			}
		}
	}
}

func (r *Relay) readControl(peer *Peer, stream *webtransport.Stream) {
	scanner := bufio.NewScanner(stream)
	scanner.Buffer(make([]byte, 0, 512), maxControlLine)
	windowStart, count := time.Now(), 0
	for scanner.Scan() {
		if time.Since(windowStart) > time.Second {
			windowStart, count = time.Now(), 0
		}
		if count++; count > controlRatePerSecond {
			peer.close(closeProtocol, "control rate exceeded")
			return
		}
		var message controlIn
		if json.Unmarshal(scanner.Bytes(), &message) != nil {
			continue
		}
		switch message.T {
		case "state":
			r.hub.SetState(peer, message.State)
		case "kick":
			if r.hub.Kick(peer, message.Slot) {
				slog.Info("peer kicked", "room", peer.claims.Room, "slot", message.Slot)
			}
		}
	}
}
