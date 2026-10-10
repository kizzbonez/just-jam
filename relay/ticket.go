package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

const ticketAudience = "tonelink:relay"

var errTicket = errors.New("invalid ticket")

// Claims is the room ticket the web app signs after it has checked the
// session, the room PIN and membership. The relay trusts nothing else.
type Claims struct {
	// Sub is the user id.
	Sub  string `json:"sub"`
	Room string `json:"room"`
	Name string `json:"name"`
	Inst string `json:"inst"`
	Host bool   `json:"host"`
	// Max is the room capacity.
	Max int `json:"max"`
	// Ava is the avatar version, 0 when the user has none.
	Ava int      `json:"ava"`
	Exp int64    `json:"exp"`
	Aud audience `json:"aud"`
}

// audience accepts both JSON forms a JWT may use: one string or a list.
type audience []string

func (a *audience) UnmarshalJSON(data []byte) error {
	var one string
	if json.Unmarshal(data, &one) == nil {
		*a = audience{one}
		return nil
	}
	var many []string
	if err := json.Unmarshal(data, &many); err != nil {
		return err
	}
	*a = many
	return nil
}

func (a audience) has(want string) bool {
	for _, item := range a {
		if item == want {
			return true
		}
	}
	return false
}

func decodeSegment(segment string, into any) error {
	raw, err := base64.RawURLEncoding.DecodeString(segment)
	if err != nil {
		return err
	}
	return json.Unmarshal(raw, into)
}

// verifyTicket checks an HS256 JWT: algorithm, signature, audience, expiry and
// the claims the relay depends on. Every failure returns the same error.
func verifyTicket(token string, secret []byte, now time.Time) (*Claims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil, errTicket
	}
	var header struct {
		Alg string `json:"alg"`
	}
	if decodeSegment(parts[0], &header) != nil || header.Alg != "HS256" {
		return nil, errTicket
	}
	signature, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return nil, errTicket
	}
	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(parts[0] + "." + parts[1]))
	if !hmac.Equal(signature, mac.Sum(nil)) {
		return nil, errTicket
	}
	var claims Claims
	if decodeSegment(parts[1], &claims) != nil {
		return nil, errTicket
	}
	if !claims.Aud.has(ticketAudience) || claims.Exp <= now.Unix() {
		return nil, errTicket
	}
	if claims.Sub == "" || claims.Room == "" || claims.Max < 1 || claims.Max > maxRoomSize {
		return nil, errTicket
	}
	return &claims, nil
}
