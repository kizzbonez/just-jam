package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"testing"
	"time"
)

var testSecret = []byte("unit-test-relay-secret-0123456789abcdef")

func b64(v any) string {
	raw, _ := json.Marshal(v)
	return base64.RawURLEncoding.EncodeToString(raw)
}

func sign(t *testing.T, alg string, claims map[string]any, secret []byte) string {
	t.Helper()
	body := b64(map[string]string{"alg": alg, "typ": "JWT"}) + "." + b64(claims)
	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(body))
	return body + "." + base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func validClaims(now time.Time) map[string]any {
	return map[string]any{
		"sub": "user-1", "room": "room-1", "name": "Ana", "inst": "Bass",
		"host": true, "max": 6, "ava": 2,
		"aud": ticketAudience, "exp": now.Add(time.Minute).Unix(),
	}
}

func TestVerifyTicketAcceptsValid(t *testing.T) {
	now := time.Now()
	claims, err := verifyTicket(sign(t, "HS256", validClaims(now), testSecret), testSecret, now)
	if err != nil {
		t.Fatalf("expected a valid ticket, got %v", err)
	}
	if claims.Sub != "user-1" || claims.Room != "room-1" || !claims.Host || claims.Max != 6 {
		t.Fatalf("unexpected claims: %+v", claims)
	}
}

func TestVerifyTicketAcceptsAudienceList(t *testing.T) {
	now := time.Now()
	c := validClaims(now)
	c["aud"] = []string{"other", ticketAudience}
	if _, err := verifyTicket(sign(t, "HS256", c, testSecret), testSecret, now); err != nil {
		t.Fatalf("audience list should be accepted: %v", err)
	}
}

func TestVerifyTicketRejects(t *testing.T) {
	now := time.Now()
	mutate := func(change func(map[string]any)) map[string]any {
		c := validClaims(now)
		change(c)
		return c
	}
	cases := map[string]string{
		"wrong secret":   sign(t, "HS256", validClaims(now), []byte("another-secret-another-secret-123")),
		"expired":        sign(t, "HS256", mutate(func(c map[string]any) { c["exp"] = now.Add(-time.Second).Unix() }), testSecret),
		"wrong audience": sign(t, "HS256", mutate(func(c map[string]any) { c["aud"] = "tonelink:session" }), testSecret),
		"alg none":       sign(t, "none", validClaims(now), testSecret),
		"no room":        sign(t, "HS256", mutate(func(c map[string]any) { c["room"] = "" }), testSecret),
		"huge room":      sign(t, "HS256", mutate(func(c map[string]any) { c["max"] = 500 }), testSecret),
		"garbage":        "not.a.token",
		"empty":          "",
	}
	for name, token := range cases {
		if _, err := verifyTicket(token, testSecret, now); err == nil {
			t.Errorf("%s: expected rejection", name)
		}
	}
}

func TestVerifyTicketRejectsTamperedPayload(t *testing.T) {
	now := time.Now()
	token := sign(t, "HS256", validClaims(now), testSecret)
	forged := validClaims(now)
	forged["host"] = true
	forged["sub"] = "someone-else"
	parts := []byte(token)
	first, last := indexDot(parts, 0), indexDot(parts, 1)
	tampered := string(parts[:first+1]) + b64(forged) + string(parts[last:])
	if _, err := verifyTicket(tampered, testSecret, now); err == nil {
		t.Fatal("a payload swapped under the old signature must be rejected")
	}
}

func indexDot(b []byte, nth int) int {
	seen := 0
	for i, c := range b {
		if c == '.' {
			if seen == nth {
				return i
			}
			seen++
		}
	}
	return -1
}
