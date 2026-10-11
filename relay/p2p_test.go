package main

import (
	"encoding/json"
	"strings"
	"testing"
)

func threeInARoom(t *testing.T) (*Hub, *Peer, *Peer, *Peer) {
	t.Helper()
	hub := newHub()
	a, b, c := testPeer("a", true), testPeer("b", false), testPeer("c", false)
	for _, peer := range []*Peer{a, b, c} {
		mustJoin(t, hub, peer)
	}
	for _, peer := range []*Peer{a, b, c} {
		drain(peer)
	}
	return hub, a, b, c
}

func queued(p *Peer) int { return len(p.out) }

func TestSignalReachesOnlyItsTargetWithTheSendersSlot(t *testing.T) {
	hub, a, b, c := threeInARoom(t)
	hub.Signal(a, b.slot, json.RawMessage(`{"k":"offer","sdp":"v=0"}`))
	got := drain(b)
	if len(got) != 1 || got[0]["t"] != "signal" || got[0]["slot"].(float64) != float64(a.slot) {
		t.Fatalf("target saw %v", got)
	}
	if data := got[0]["data"].(map[string]any); data["k"] != "offer" {
		t.Fatalf("payload was altered: %v", data)
	}
	if len(drain(c)) != 0 || len(drain(a)) != 0 {
		t.Fatal("a signal must not reach anyone but its target")
	}
}

func TestSignalRefusesBadInput(t *testing.T) {
	hub, a, b, _ := threeInARoom(t)
	huge := json.RawMessage(`{"sdp":"` + strings.Repeat("x", maxSignalBytes) + `"}`)
	hub.Signal(a, b.slot, huge)
	hub.Signal(a, b.slot, json.RawMessage(`{not json`))
	hub.Signal(a, a.slot, json.RawMessage(`{"k":"offer"}`))
	hub.Signal(a, 9, json.RawMessage(`{"k":"offer"}`))
	if len(drain(b)) != 0 || len(drain(a)) != 0 {
		t.Fatal("oversized, malformed, self-addressed and unseated signals must be dropped")
	}
}

func TestSignalNeverDisconnectsABusyTarget(t *testing.T) {
	hub, a, b, _ := threeInARoom(t)
	for i := 0; i < controlBacklog*2; i++ {
		hub.Signal(a, b.slot, json.RawMessage(`{"k":"ice","list":[]}`))
	}
	select {
	case <-b.done:
		t.Fatal("a flood of signals closed the target's connection")
	default:
	}
	if got := len(drain(b)); got != controlBacklog {
		t.Fatalf("target kept %d signals, want a full backlog of %d", got, controlBacklog)
	}
}

func TestAudioSkipsPlayersTheSenderReachesDirectly(t *testing.T) {
	_, a, b, c := threeInARoom(t)
	relay := &Relay{}
	packet := func() []byte { return make([]byte, audioHeaderLen+4) }
	send := func() {
		b := packet()
		b[0] = typeAudio
		relay.handlePacket(a, b)
	}
	send()
	if queued(b) != 1 || queued(c) != 1 {
		t.Fatalf("without links both should receive, got %d and %d", queued(b), queued(c))
	}
	a.setDirect([]uint8{b.slot})
	send()
	if queued(b) != 1 || queued(c) != 2 {
		t.Fatalf("linked player got %d packets, the other %d; want 1 and 2", queued(b), queued(c))
	}
	a.setDirect(nil)
	send()
	if queued(b) != 2 {
		t.Fatal("clearing the links must resume forwarding")
	}
}

func TestLeavingClearsTheSlotFromEveryMask(t *testing.T) {
	hub, a, b, c := threeInARoom(t)
	a.setDirect([]uint8{b.slot, c.slot})
	hub.Leave(b, "left")
	if a.direct.Load()&slotBit(b.slot) != 0 {
		t.Fatal("the leaver's slot is still marked as linked")
	}
	if a.direct.Load()&slotBit(c.slot) == 0 {
		t.Fatal("other links must be kept")
	}
	a.setDirect([]uint8{0, 200})
	if a.direct.Load() != 0 {
		t.Fatal("slots outside the mask must be ignored")
	}
}
