package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
)

const testOrigin = "https://studio.example.com"

func newTestRelay(t *testing.T) (*httptest.Server, *Relay) {
	t.Helper()
	cfg := &Config{Secret: testSecret, AllowedOrigins: map[string]bool{testOrigin: true}}
	relay := &Relay{cfg: cfg, hub: newHub()}
	server := httptest.NewServer(newWebSocketServer(cfg, relay).Handler)
	t.Cleanup(server.Close)
	return server, relay
}

func ticketFor(t *testing.T, user string, host bool) string {
	t.Helper()
	claims := validClaims(time.Now())
	claims["sub"], claims["name"], claims["host"] = user, user, host
	return sign(t, "HS256", claims, testSecret)
}

func dial(t *testing.T, server *httptest.Server, ticket, origin string) (*websocket.Conn, *http.Response, error) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	url := "ws" + strings.TrimPrefix(server.URL, "http") + "/jam?ticket=" + ticket
	options := &websocket.DialOptions{HTTPHeader: http.Header{"Origin": {origin}}}
	return websocket.Dial(ctx, url, options)
}

func mustDial(t *testing.T, server *httptest.Server, user string, host bool) *websocket.Conn {
	t.Helper()
	conn, _, err := dial(t, server, ticketFor(t, user, host), testOrigin)
	if err != nil {
		t.Fatalf("dial as %s: %v", user, err)
	}
	t.Cleanup(func() { _ = conn.CloseNow() })
	return conn
}

func read(t *testing.T, conn *websocket.Conn) (websocket.MessageType, []byte) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	kind, data, err := conn.Read(ctx)
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	return kind, data
}

func readControl(t *testing.T, conn *websocket.Conn) map[string]any {
	t.Helper()
	kind, data := read(t, conn)
	if kind != websocket.MessageText {
		t.Fatalf("expected a control message, got binary of %d bytes", len(data))
	}
	var message map[string]any
	if err := json.Unmarshal(data, &message); err != nil {
		t.Fatalf("control message is not JSON: %q", data)
	}
	return message
}

func write(t *testing.T, conn *websocket.Conn, kind websocket.MessageType, data []byte) {
	t.Helper()
	if err := conn.Write(context.Background(), kind, data); err != nil {
		t.Fatalf("write: %v", err)
	}
}

func TestWebSocketRejectsBadOriginAndTicket(t *testing.T) {
	server, _ := newTestRelay(t)
	if _, res, err := dial(t, server, ticketFor(t, "ana", true), "https://evil.example"); err == nil || res.StatusCode != http.StatusForbidden {
		t.Fatalf("a foreign origin must get 403, got %v %v", res, err)
	}
	if _, res, err := dial(t, server, "not.a.ticket", testOrigin); err == nil || res.StatusCode != http.StatusUnauthorized {
		t.Fatalf("a bad ticket must get 401, got %v %v", res, err)
	}
}

func TestWebSocketRoomFlow(t *testing.T) {
	server, _ := newTestRelay(t)
	host := mustDial(t, server, "host", true)
	if welcome := readControl(t, host); welcome["t"] != "welcome" || welcome["slot"].(float64) != 1 {
		t.Fatalf("unexpected welcome: %v", welcome)
	}
	guest := mustDial(t, server, "guest", false)
	if welcome := readControl(t, guest); len(welcome["peers"].([]any)) != 1 {
		t.Fatalf("guest should see the host: %v", welcome)
	}
	if joined := readControl(t, host); joined["t"] != "peer-joined" {
		t.Fatalf("host should be told about the guest: %v", joined)
	}

	// A ping comes straight back to its sender as a pong.
	write(t, host, websocket.MessageBinary, []byte{typePing, 0, 1, 2, 3, 4, 5, 6, 7, 8})
	if _, pong := read(t, host); pong[0] != typePong || pong[9] != 8 {
		t.Fatalf("unexpected pong: %v", pong)
	}

	// Audio reaches the other player with the sender's slot stamped by the relay.
	audio := make([]byte, audioHeaderLen+4)
	audio[0], audio[1], audio[audioHeaderLen] = typeAudio, 0xFF, 42
	write(t, guest, websocket.MessageBinary, audio)
	kind, forwarded := read(t, host)
	if kind != websocket.MessageBinary || forwarded[1] != 2 || forwarded[audioHeaderLen] != 42 {
		t.Fatalf("audio was not forwarded intact with slot 2: %v", forwarded)
	}

	// State is relayed, and only the host may remove a player.
	write(t, guest, websocket.MessageText, []byte(`{"t":"state","state":{"muted":true}}`))
	if state := readControl(t, host); state["t"] != "peer-state" {
		t.Fatalf("host should see the guest's state: %v", state)
	}
	write(t, host, websocket.MessageText, []byte(`{"t":"kick","slot":2}`))
	if kicked := readControl(t, guest); kicked["t"] != "kicked" {
		t.Fatalf("guest should be told they were removed: %v", kicked)
	}
	_, _, err := guest.Read(context.Background())
	if websocket.CloseStatus(err) != websocket.StatusCode(closeKicked) {
		t.Fatalf("guest connection should close with the kicked code, got %v", err)
	}
	if left := readControl(t, host); left["t"] != "peer-left" || left["reason"] != "kicked" {
		t.Fatalf("host should see the guest leave: %v", left)
	}
}

func TestWebSocketRefusesAFullRoom(t *testing.T) {
	server, relay := newTestRelay(t)
	for _, user := range []string{"a", "b", "c", "d", "e", "f"} {
		mustDial(t, server, user, false)
	}
	// The ticket allows six players; wait until all six are seated.
	deadline := time.Now().Add(2 * time.Second)
	for relay.hub.Counts()["room-1"] < 6 && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	extra := mustDial(t, server, "g", false)
	_, _, err := extra.Read(context.Background())
	if websocket.CloseStatus(err) != websocket.StatusCode(closeRoomFull) {
		t.Fatalf("a seventh player should be closed with the room-full code, got %v", err)
	}
}
