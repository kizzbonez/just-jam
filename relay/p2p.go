package main

import "encoding/json"

// Players may link to each other directly with WebRTC. The relay's part is
// small: it passes their negotiation messages along, and it stops forwarding a
// player's audio to anyone that player says it already reaches itself.

type signalMsg struct {
	T    string          `json:"t"`
	Slot uint8           `json:"slot"`
	Data json.RawMessage `json:"data"`
}

// maskSlots is how many slots fit in a Peer.direct mask. Rooms hold at most
// maxRoomSize players and slots are handed out lowest first, so this is ample.
const maskSlots = 64

func slotBit(slot uint8) uint64 {
	if slot == 0 || slot >= maskSlots {
		return 0
	}
	return 1 << slot
}

// setDirect records which slots this peer reaches over its own links.
func (p *Peer) setDirect(slots []uint8) {
	var mask uint64
	for _, slot := range slots {
		mask |= slotBit(slot)
	}
	p.direct.Store(mask)
}

// forgetDirect clears a slot from every mask when its player leaves, so the
// next player seated there is not mistaken for someone already linked.
func (r *Room) forgetDirect(slot uint8) {
	keep := ^slotBit(slot)
	for _, peer := range r.peers {
		peer.direct.And(keep)
	}
}

// Signal passes one negotiation message to another player in the same room.
// The relay stamps the sender's slot, so nobody can speak for someone else.
// Delivery is best effort: a busy recipient misses the message, and the
// players' own retry covers that, rather than the recipient being cut off.
func (h *Hub) Signal(from *Peer, to uint8, data json.RawMessage) {
	if len(data) == 0 || len(data) > maxSignalBytes || !json.Valid(data) {
		return
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	if from.room == nil || from.gone.Load() || to == from.slot {
		return
	}
	if target := from.room.peers[to]; target != nil {
		target.offerControl(signalMsg{T: "signal", Slot: from.slot, Data: data})
	}
}
