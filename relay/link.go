package main

import (
	"context"
	"sync/atomic"

	"github.com/coder/websocket"
	"github.com/quic-go/webtransport-go"
)

// link is what the room router needs from a player's connection. There are
// two kinds: WebTransport, where audio travels as unreliable QUIC datagrams,
// and WebSocket, a TCP fallback that passes through ordinary HTTPS proxies
// and tunnels. Both carry the same bytes, so the two kinds can share a room.
type link interface {
	// sendDatagram writes one audio or ping packet.
	sendDatagram(b []byte) error
	// sendControl writes one JSON control message, newline terminated.
	sendControl(line []byte) error
	// alive reports whether the connection is still open.
	alive() bool
	close(code uint32, reason string)
}

// wtLink is a WebTransport session plus its reliable control stream.
type wtLink struct {
	sess   *webtransport.Session
	stream *webtransport.Stream
}

func (l *wtLink) sendDatagram(b []byte) error { return l.sess.SendDatagram(b) }

func (l *wtLink) sendControl(line []byte) error {
	_, err := l.stream.Write(line)
	return err
}

func (l *wtLink) alive() bool { return l.sess.Context().Err() == nil }

func (l *wtLink) close(code uint32, reason string) {
	_ = l.sess.CloseWithError(webtransport.SessionErrorCode(code), reason)
}

// wsLink is a WebSocket: binary messages are packets, text messages are control.
type wsLink struct {
	conn *websocket.Conn
	ctx  context.Context
	// broken is set by the first failed write. On TCP that is final.
	broken atomic.Bool
}

func (l *wsLink) write(kind websocket.MessageType, data []byte) error {
	err := l.conn.Write(l.ctx, kind, data)
	if err != nil {
		l.broken.Store(true)
	}
	return err
}

func (l *wsLink) sendDatagram(b []byte) error { return l.write(websocket.MessageBinary, b) }

func (l *wsLink) sendControl(line []byte) error { return l.write(websocket.MessageText, line) }

func (l *wsLink) alive() bool { return !l.broken.Load() && l.ctx.Err() == nil }

func (l *wsLink) close(code uint32, reason string) {
	// The relay's close codes sit in the range WebSocket reserves for applications.
	_ = l.conn.Close(websocket.StatusCode(code), reason)
}
