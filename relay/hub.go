package main

import (
	"encoding/json"
	"errors"
	"sync"
	"sync/atomic"
	"time"
)

const banTTL = 6 * time.Hour

var (
	errRoomFull = errors.New("room is full")
	errBanned   = errors.New("removed from this room by the host")
)

// Messages the relay sends on the control stream.
type (
	welcomeMsg struct {
		T     string     `json:"t"`
		Slot  uint8      `json:"slot"`
		Peers []PeerInfo `json:"peers"`
	}
	peerJoinedMsg struct {
		T    string   `json:"t"`
		Peer PeerInfo `json:"peer"`
	}
	peerLeftMsg struct {
		T      string `json:"t"`
		Slot   uint8  `json:"slot"`
		Reason string `json:"reason"`
	}
	peerStateMsg struct {
		T     string          `json:"t"`
		Slot  uint8           `json:"slot"`
		State json.RawMessage `json:"state"`
	}
	simpleMsg struct {
		T string `json:"t"`
	}
)

// Room holds the peers of one jam. Membership changes happen under Hub.mu;
// the datagram path reads the fanout snapshot without taking any lock.
type Room struct {
	id     string
	peers  map[uint8]*Peer
	fanout atomic.Pointer[[]*Peer]
}

func (r *Room) refresh() {
	list := make([]*Peer, 0, len(r.peers))
	for _, peer := range r.peers {
		list = append(list, peer)
	}
	r.fanout.Store(&list)
}

func (r *Room) freeSlot() uint8 {
	for slot := uint8(1); slot != 0; slot++ {
		if _, taken := r.peers[slot]; !taken {
			return slot
		}
	}
	return 0
}

func (r *Room) byUser(userID string) *Peer {
	for _, peer := range r.peers {
		if peer.claims.Sub == userID {
			return peer
		}
	}
	return nil
}

func (r *Room) infos() []PeerInfo {
	infos := make([]PeerInfo, 0, len(r.peers))
	for _, peer := range r.peers {
		infos = append(infos, peer.info())
	}
	return infos
}

func (r *Room) broadcast(message any, except *Peer) {
	for _, peer := range r.peers {
		if peer != except {
			peer.sendControl(message)
		}
	}
}

// Hub is the in-memory room router. Nothing here is persisted.
type Hub struct {
	mu    sync.Mutex
	rooms map[string]*Room
	// bans maps "room|user" to the time the ban ends.
	bans map[string]time.Time
	now  func() time.Time
}

func newHub() *Hub {
	return &Hub{rooms: make(map[string]*Room), bans: make(map[string]time.Time), now: time.Now}
}

func banKey(roomID, userID string) string { return roomID + "|" + userID }

func (h *Hub) banned(roomID, userID string) bool {
	key := banKey(roomID, userID)
	until, found := h.bans[key]
	if found && h.now().After(until) {
		delete(h.bans, key)
		return false
	}
	return found
}

// Join places the peer in its room and tells everyone. A second connection by
// the same user replaces the first, so a reload never leaves a ghost behind.
func (h *Hub) Join(p *Peer) error {
	h.mu.Lock()
	defer h.mu.Unlock()
	roomID := p.claims.Room
	if h.banned(roomID, p.claims.Sub) {
		return errBanned
	}
	room := h.rooms[roomID]
	if room == nil {
		room = &Room{id: roomID, peers: make(map[uint8]*Peer)}
	}
	if old := room.byUser(p.claims.Sub); old != nil {
		h.remove(room, old, "replaced")
		old.closeSoon(closeReplaced, "replaced by a newer connection")
	}
	if len(room.peers) >= p.claims.Max {
		return errRoomFull
	}
	h.rooms[roomID] = room
	p.room, p.slot = room, room.freeSlot()
	welcome := welcomeMsg{T: "welcome", Slot: p.slot, Peers: room.infos()}
	room.peers[p.slot] = p
	room.refresh()
	room.broadcast(peerJoinedMsg{T: "peer-joined", Peer: p.info()}, p)
	p.sendControl(welcome)
	return nil
}

// Leave is safe to call more than once and after a kick or replacement.
func (h *Hub) Leave(p *Peer, reason string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if p.room != nil {
		h.remove(p.room, p, reason)
	}
}

func (h *Hub) remove(room *Room, p *Peer, reason string) {
	if room.peers[p.slot] != p {
		return
	}
	p.gone.Store(true)
	delete(room.peers, p.slot)
	room.refresh()
	room.broadcast(peerLeftMsg{T: "peer-left", Slot: p.slot, Reason: reason}, nil)
	if len(room.peers) == 0 {
		delete(h.rooms, room.id)
	}
}

// SetState stores the peer's published state and relays it to the room.
func (h *Hub) SetState(p *Peer, state json.RawMessage) {
	if len(state) == 0 || len(state) > maxStateBytes || !json.Valid(state) {
		return
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	if p.room == nil || p.gone.Load() {
		return
	}
	p.state = state
	p.room.broadcast(peerStateMsg{T: "peer-state", Slot: p.slot, State: state}, p)
}

// Kick removes a peer and keeps them out for banTTL. Only the host may kick.
func (h *Hub) Kick(by *Peer, slot uint8) bool {
	h.mu.Lock()
	defer h.mu.Unlock()
	room := by.room
	if room == nil || !by.claims.Host || slot == by.slot {
		return false
	}
	target := room.peers[slot]
	if target == nil {
		return false
	}
	h.bans[banKey(room.id, target.claims.Sub)] = h.now().Add(banTTL)
	target.sendControl(simpleMsg{T: "kicked"})
	h.remove(room, target, "kicked")
	target.closeSoon(closeKicked, "removed by the host")
	return true
}

// CloseRoom disconnects everyone. It returns how many peers were in the room.
func (h *Hub) CloseRoom(roomID string) int {
	h.mu.Lock()
	defer h.mu.Unlock()
	room := h.rooms[roomID]
	if room == nil {
		return 0
	}
	count := len(room.peers)
	for _, peer := range room.peers {
		peer.gone.Store(true)
		peer.sendControl(simpleMsg{T: "closed"})
		peer.closeSoon(closeRoomGone, "room closed by the host")
	}
	delete(h.rooms, roomID)
	return count
}

// Counts reports how many peers are in each live room.
func (h *Hub) Counts() map[string]int {
	h.mu.Lock()
	defer h.mu.Unlock()
	counts := make(map[string]int, len(h.rooms))
	for id, room := range h.rooms {
		counts[id] = len(room.peers)
	}
	return counts
}
