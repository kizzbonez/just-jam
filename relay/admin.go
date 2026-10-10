package main

import (
	"crypto/subtle"
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

// The admin API is for the web app only. It listens on plain TCP inside the
// container network and is never published to the host.

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func requireSecret(secret []byte, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		if subtle.ConstantTimeCompare([]byte(token), secret) != 1 {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
			return
		}
		next(w, r)
	}
}

func newAdminServer(cfg *Config, certs *CertStore, hub *Hub) *http.Server {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("GET /internal/cert", requireSecret(cfg.Secret,
		func(w http.ResponseWriter, _ *http.Request) {
			writeJSON(w, http.StatusOK, certs.Info())
		}))
	mux.HandleFunc("GET /internal/rooms", requireSecret(cfg.Secret,
		func(w http.ResponseWriter, _ *http.Request) {
			writeJSON(w, http.StatusOK, map[string]any{"rooms": hub.Counts()})
		}))
	mux.HandleFunc("POST /internal/rooms/{id}/close", requireSecret(cfg.Secret,
		func(w http.ResponseWriter, r *http.Request) {
			closed := hub.CloseRoom(r.PathValue("id"))
			writeJSON(w, http.StatusOK, map[string]int{"disconnected": closed})
		}))
	return &http.Server{
		Addr:              cfg.AdminAddr,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
	}
}
