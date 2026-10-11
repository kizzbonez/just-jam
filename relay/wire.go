package main

// Packet layout shared with the browser engine (src/features/studio/engine/wire.ts).
// The same bytes travel as a QUIC datagram or as a binary WebSocket message.
//
//	byte 0     type
//	byte 1     source slot (audio: written by the relay, never trusted from clients)
//	bytes 2..  type-specific; the relay forwards them untouched
const (
	typeAudio byte = 0xA1
	typePing  byte = 0xB1
	typePong  byte = 0xB2

	audioHeaderLen = 10
	maxDatagramLen = 1400
)

const (
	maxRoomSize    = 16
	maxControlLine = 8192
	maxStateBytes  = 512
	// maxSignalBytes bounds one WebRTC negotiation message between two players.
	maxSignalBytes = 6144
)

// Close codes the browser maps to messages. They are valid both as
// WebTransport session error codes and as WebSocket application close codes.
const (
	closeProtocol uint32 = 4000
	closeRoomFull uint32 = 4001
	closeBanned   uint32 = 4002
	closeKicked   uint32 = 4003
	closeReplaced uint32 = 4004
	closeRoomGone uint32 = 4005
)
