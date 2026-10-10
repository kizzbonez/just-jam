package main

import (
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"time"
)

func testPeer(user string, host bool) *Peer {
	return newPeer(nil, &Claims{Sub: user, Room: "room-1", Name: user, Host: host, Max: 3})
}

// drain returns the control messages queued for a peer, as decoded JSON lines.
func drain(p *Peer) []map[string]any {
	var messages []map[string]any
	for {
		select {
		case line := <-p.ctrl:
			var message map[string]any
			_ = json.Unmarshal(line, &message)
			messages = append(messages, message)
		default:
			return messages
		}
	}
}

func types(messages []map[string]any) string {
	var names []string
	for _, message := range messages {
		names = append(names, message["t"].(string))
	}
	return strings.Join(names, ",")
}

func mustJoin(t *testing.T, hub *Hub, p *Peer) {
	t.Helper()
	if err := hub.Join(p); err != nil {
		t.Fatalf("join failed: %v", err)
	}
}

func TestJoinAssignsSlotsAndAnnounces(t *testing.T) {
	hub := newHub()
	host, guest := testPeer("host", true), testPeer("guest", false)
	mustJoin(t, hub, host)
	mustJoin(t, hub, guest)
	if host.slot != 1 || guest.slot != 2 {
		t.Fatalf("slots = %d, %d; want 1, 2", host.slot, guest.slot)
	}
	if got := types(drain(host)); got != "welcome,peer-joined" {
		t.Fatalf("host saw %q", got)
	}
	welcome := drain(guest)[0]
	if peers := welcome["peers"].([]any); len(peers) != 1 {
		t.Fatalf("guest welcome should list the host, got %v", peers)
	}
}

func TestJoinRejectsWhenFull(t *testing.T) {
	hub := newHub()
	for _, user := range []string{"a", "b", "c"} {
		mustJoin(t, hub, testPeer(user, false))
	}
	if err := hub.Join(testPeer("d", false)); !errors.Is(err, errRoomFull) {
		t.Fatalf("expected room full, got %v", err)
	}
}

func TestSecondConnectionReplacesFirst(t *testing.T) {
	hub := newHub()
	first, second := testPeer("ana", false), testPeer("ana", false)
	mustJoin(t, hub, first)
	mustJoin(t, hub, second)
	if !first.gone.Load() {
		t.Fatal("the older connection should be marked gone")
	}
	if got := hub.Counts()["room-1"]; got != 1 {
		t.Fatalf("room should hold one peer, has %d", got)
	}
	// The stale connection's deferred Leave must not evict its replacement.
	hub.Leave(first, "left")
	if got := hub.Counts()["room-1"]; got != 1 {
		t.Fatalf("replacement was evicted, room has %d", got)
	}
}

func TestLeaveFreesSlotAndDropsEmptyRoom(t *testing.T) {
	hub := newHub()
	a, b := testPeer("a", false), testPeer("b", false)
	mustJoin(t, hub, a)
	mustJoin(t, hub, b)
	drain(b)
	hub.Leave(a, "left")
	if got := types(drain(b)); got != "peer-left" {
		t.Fatalf("b saw %q", got)
	}
	c := testPeer("c", false)
	mustJoin(t, hub, c)
	if c.slot != 1 {
		t.Fatalf("freed slot should be reused, got %d", c.slot)
	}
	hub.Leave(b, "left")
	hub.Leave(c, "left")
	if len(hub.Counts()) != 0 {
		t.Fatal("an empty room should be removed")
	}
}

func TestOnlyHostCanKickAndBanExpires(t *testing.T) {
	hub := newHub()
	now := time.Now()
	hub.now = func() time.Time { return now }
	host, guest, other := testPeer("host", true), testPeer("guest", false), testPeer("other", false)
	for _, p := range []*Peer{host, guest, other} {
		mustJoin(t, hub, p)
	}
	if hub.Kick(guest, other.slot) {
		t.Fatal("a guest must not be able to kick")
	}
	if hub.Kick(host, host.slot) {
		t.Fatal("the host cannot kick themselves")
	}
	drain(guest)
	if !hub.Kick(host, guest.slot) {
		t.Fatal("the host should be able to kick")
	}
	if got := types(drain(guest)); got != "kicked" {
		t.Fatalf("kicked peer saw %q", got)
	}
	if err := hub.Join(testPeer("guest", false)); !errors.Is(err, errBanned) {
		t.Fatalf("expected ban, got %v", err)
	}
	now = now.Add(banTTL + time.Minute)
	if err := hub.Join(testPeer("guest", false)); err != nil {
		t.Fatalf("ban should have expired: %v", err)
	}
}

func TestSetStateRelaysValidJSONOnly(t *testing.T) {
	hub := newHub()
	a, b := testPeer("a", false), testPeer("b", false)
	mustJoin(t, hub, a)
	mustJoin(t, hub, b)
	drain(a)
	drain(b)
	hub.SetState(a, json.RawMessage(`{"muted":true}`))
	hub.SetState(a, json.RawMessage(`{not json`))
	hub.SetState(a, json.RawMessage(`"`+strings.Repeat("x", maxStateBytes)+`"`))
	got := drain(b)
	if len(got) != 1 || got[0]["t"] != "peer-state" {
		t.Fatalf("b should see exactly one peer-state, got %v", got)
	}
	if len(drain(a)) != 0 {
		t.Fatal("the sender should not receive its own state")
	}
}

func TestCloseRoomDisconnectsEveryone(t *testing.T) {
	hub := newHub()
	a, b := testPeer("a", true), testPeer("b", false)
	mustJoin(t, hub, a)
	mustJoin(t, hub, b)
	drain(a)
	drain(b)
	if got := hub.CloseRoom("room-1"); got != 2 {
		t.Fatalf("closed %d peers, want 2", got)
	}
	if types(drain(a)) != "closed" || types(drain(b)) != "closed" {
		t.Fatal("both peers should be told the room closed")
	}
	if len(hub.Counts()) != 0 {
		t.Fatal("room should be gone")
	}
}
