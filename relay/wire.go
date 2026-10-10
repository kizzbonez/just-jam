package main

import "github.com/quic-go/webtransport-go"

// Datagram layout shared with the browser engine (src/features/studio/engine/wire.ts).
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
	maxControlLine = 2048
	maxStateBytes  = 512
)

// Session close codes the browser maps to messages.
const (
	closeProtocol webtransport.SessionErrorCode = 4000
	closeRoomFull webtransport.SessionErrorCode = 4001
	closeBanned   webtransport.SessionErrorCode = 4002
	closeKicked   webtransport.SessionErrorCode = 4003
	closeReplaced webtransport.SessionErrorCode = 4004
	closeRoomGone webtransport.SessionErrorCode = 4005
)
