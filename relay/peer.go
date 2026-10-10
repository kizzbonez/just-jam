package main

import (
	"encoding/json"
	"io"
	"sync"
	"sync/atomic"
	"time"

	"github.com/quic-go/webtransport-go"
)

const (
	datagramBacklog = 128
	controlBacklog  = 64
	// closeGrace lets queued control lines reach the client before the session ends.
	closeGrace = 200 * time.Millisecond
)

// PeerInfo is how a participant is described to the others in the room.
type PeerInfo struct {
	Slot  uint8           `json:"slot"`
	User  string          `json:"userId"`
	Name  string          `json:"name"`
	Inst  string          `json:"inst"`
	Host  bool            `json:"host"`
	Ava   int             `json:"ava"`
	State json.RawMessage `json:"state,omitempty"`
}

// Peer is one connected participant.
type Peer struct {
	slot   uint8
	claims *Claims
	room   *Room
	// sess is nil in unit tests, which exercise room logic without a network.
	sess *webtransport.Session

	// out and ctrl decouple this peer's writes from whoever is sending to it, so
	// one slow receiver can never stall the rest of the room.
	out  chan []byte
	ctrl chan []byte

	// state is the last blob the client published. Guarded by Hub.mu.
	state json.RawMessage
	// gone is set once the peer is out of its room; its audio is then discarded.
	gone    atomic.Bool
	dropped atomic.Uint64

	done chan struct{}
	once sync.Once
}

func newPeer(sess *webtransport.Session, claims *Claims) *Peer {
	return &Peer{
		sess:   sess,
		claims: claims,
		out:    make(chan []byte, datagramBacklog),
		ctrl:   make(chan []byte, controlBacklog),
		done:   make(chan struct{}),
	}
}

func (p *Peer) info() PeerInfo {
	return PeerInfo{
		Slot:  p.slot,
		User:  p.claims.Sub,
		Name:  p.claims.Name,
		Inst:  p.claims.Inst,
		Host:  p.claims.Host,
		Ava:   p.claims.Ava,
		State: p.state,
	}
}

// sendDatagram never blocks. A full backlog means the receiver is not keeping
// up, and for live audio a late packet is worth no more than a lost one.
func (p *Peer) sendDatagram(b []byte) {
	select {
	case p.out <- b:
	default:
		p.dropped.Add(1)
	}
}

// sendControl queues one JSON line. Control messages must not be lost, so a
// peer that lets its backlog fill up is disconnected instead.
func (p *Peer) sendControl(message any) {
	line, err := json.Marshal(message)
	if err != nil {
		return
	}
	select {
	case p.ctrl <- append(line, '\n'):
	default:
		p.close(closeProtocol, "control backlog full")
	}
}

func (p *Peer) close(code webtransport.SessionErrorCode, reason string) {
	p.once.Do(func() {
		close(p.done)
		if p.sess != nil {
			_ = p.sess.CloseWithError(code, reason)
		}
	})
}

func (p *Peer) closeSoon(code webtransport.SessionErrorCode, reason string) {
	time.AfterFunc(closeGrace, func() { p.close(code, reason) })
}

func (p *Peer) writeDatagrams() {
	for {
		select {
		case <-p.done:
			return
		case b := <-p.out:
			// An oversized datagram is an error for that packet only.
			if err := p.sess.SendDatagram(b); err != nil && p.sess.Context().Err() != nil {
				return
			}
		}
	}
}

func (p *Peer) writeControl(w io.Writer) {
	for {
		select {
		case <-p.done:
			return
		case line := <-p.ctrl:
			if _, err := w.Write(line); err != nil {
				return
			}
		}
	}
}
