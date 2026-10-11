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
	controlRatePerSecond = 60
	idleTimeout          = 20 * time.Second
	keepAlive            = 5 * time.Second
)

// Relay is the front door: it admits ticket holders, over WebTransport or the
// WebSocket fallback, and then forwards their packets to the rest of their room.
type Relay struct {
	cfg *Config
	hub *Hub
	wt  *webtransport.Server
}

type controlIn struct {
	T     string          `json:"t"`
	Slot  uint8           `json:"slot"`
	State json.RawMessage `json:"state"`
	// Data is a negotiation message for the player in Slot.
	Data json.RawMessage `json:"data"`
	// Slots lists the players the sender reaches directly.
	Slots []uint8 `json:"slots"`
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

// admit checks the room ticket on an incoming request.
func (r *Relay) admit(w http.ResponseWriter, req *http.Request) *Claims {
	claims, err := verifyTicket(req.URL.Query().Get("ticket"), r.cfg.Secret, time.Now())
	if err != nil {
		http.Error(w, "invalid ticket", http.StatusUnauthorized)
		return nil
	}
	return claims
}

func (r *Relay) handleJam(w http.ResponseWriter, req *http.Request) {
	claims := r.admit(w, req)
	if claims == nil {
		return
	}
	sess, err := r.wt.Upgrade(w, req)
	if err != nil {
		slog.Warn("upgrade failed", "err", err)
		return
	}
	ctx := sess.Context()
	acceptCtx, cancel := context.WithTimeout(ctx, controlAcceptTimeout)
	stream, err := sess.AcceptStream(acceptCtx)
	cancel()
	if err != nil {
		_ = sess.CloseWithError(webtransport.SessionErrorCode(closeProtocol), "expected a control stream")
		return
	}
	peer := r.join(&wtLink{sess: sess, stream: stream}, claims, "quic")
	if peer == nil {
		return
	}
	defer r.leave(peer)
	go r.readControlStream(peer, stream)
	for {
		b, err := sess.ReceiveDatagram(ctx)
		if err != nil {
			return
		}
		r.handlePacket(peer, b)
	}
}

func closeCodeFor(err error) uint32 {
	switch {
	case errors.Is(err, errRoomFull):
		return closeRoomFull
	case errors.Is(err, errBanned):
		return closeBanned
	default:
		return closeProtocol
	}
}

// join seats a new connection in its room and starts its writer. It returns
// nil, having closed the connection with the reason, when the room refuses.
func (r *Relay) join(conn link, claims *Claims, transport string) *Peer {
	peer := newPeer(conn, claims)
	if err := r.hub.Join(peer); err != nil {
		conn.close(closeCodeFor(err), err.Error())
		return nil
	}
	slog.Info("peer joined", "room", claims.Room, "slot", peer.slot, "transport", transport)
	go peer.writeLoop()
	return peer
}

func (r *Relay) leave(peer *Peer) {
	r.hub.Leave(peer, "left")
	peer.close(closeProtocol, "session ended")
	slog.Info("peer left", "room", peer.claims.Room, "slot", peer.slot, "dropped", peer.dropped.Load())
}

// handlePacket is the hot path: no locks, and no allocation beyond what the
// transport does for the packet itself.
func (r *Relay) handlePacket(peer *Peer, b []byte) {
	if len(b) < 2 || len(b) > maxDatagramLen {
		return
	}
	switch b[0] {
	case typePing:
		b[0] = typePong
		peer.sendDatagram(b)
	case typeAudio:
		if len(b) < audioHeaderLen || peer.gone.Load() {
			return
		}
		b[1] = peer.slot
		direct := peer.direct.Load()
		for _, other := range *peer.room.fanout.Load() {
			if other != peer && direct&slotBit(other.slot) == 0 {
				other.sendDatagram(b)
			}
		}
	}
}

// controlLimiter allows a fixed number of control messages per second.
type controlLimiter struct {
	windowStart time.Time
	count       int
}

func (l *controlLimiter) allow() bool {
	if time.Since(l.windowStart) > time.Second {
		l.windowStart, l.count = time.Now(), 0
	}
	l.count++
	return l.count <= controlRatePerSecond
}

// handleControl applies one control message. It returns false when the peer
// has exceeded the rate limit and has been disconnected.
func (r *Relay) handleControl(peer *Peer, line []byte, limiter *controlLimiter) bool {
	if !limiter.allow() {
		peer.close(closeProtocol, "control rate exceeded")
		return false
	}
	var message controlIn
	if json.Unmarshal(line, &message) != nil {
		return true
	}
	switch message.T {
	case "state":
		r.hub.SetState(peer, message.State)
	case "kick":
		if r.hub.Kick(peer, message.Slot) {
			slog.Info("peer kicked", "room", peer.claims.Room, "slot", message.Slot)
		}
	case "signal":
		r.hub.Signal(peer, message.Slot, message.Data)
	case "p2p":
		peer.setDirect(message.Slots)
	}
	return true
}

func (r *Relay) readControlStream(peer *Peer, stream *webtransport.Stream) {
	scanner := bufio.NewScanner(stream)
	scanner.Buffer(make([]byte, 0, 512), maxControlLine)
	limiter := &controlLimiter{}
	for scanner.Scan() {
		if !r.handleControl(peer, scanner.Bytes(), limiter) {
			return
		}
	}
}
