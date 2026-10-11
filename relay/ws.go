package main

import (
	"net/http"
	"time"

	"github.com/coder/websocket"
)

// The WebSocket endpoint is the fallback for networks and proxies that cannot
// carry QUIC: it is plain HTTP, so it passes through HTTPS reverse proxies and
// tunnels. It is TCP, which means a lost packet delays the ones behind it, so
// latency is higher and less steady than over WebTransport. The protocol is
// otherwise identical: binary messages are packets, text messages are control.

func (r *Relay) handleWebSocket(w http.ResponseWriter, req *http.Request) {
	if !r.checkOrigin(req) {
		http.Error(w, "origin not allowed", http.StatusForbidden)
		return
	}
	claims := r.admit(w, req)
	if claims == nil {
		return
	}
	conn, err := websocket.Accept(w, req, &websocket.AcceptOptions{
		// The Origin header was checked against the allow-list above.
		InsecureSkipVerify: true,
		// Audio is already compressed or is PCM that must not be delayed.
		CompressionMode: websocket.CompressionDisabled,
	})
	if err != nil {
		return
	}
	conn.SetReadLimit(maxControlLine + maxDatagramLen)
	ctx := req.Context()
	peer := r.join(&wsLink{conn: conn, ctx: ctx}, claims, "websocket")
	if peer == nil {
		return
	}
	defer r.leave(peer)
	limiter := &controlLimiter{}
	for {
		kind, data, err := conn.Read(ctx)
		if err != nil {
			return
		}
		if kind == websocket.MessageBinary {
			r.handlePacket(peer, data)
		} else if !r.handleControl(peer, data, limiter) {
			return
		}
	}
}

func newWebSocketServer(cfg *Config, relay *Relay) *http.Server {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /jam", relay.handleWebSocket)
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	return &http.Server{
		Addr:              cfg.WSAddr,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}
}
