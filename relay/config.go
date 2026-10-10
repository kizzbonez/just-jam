package main

import (
	"errors"
	"os"
	"strings"
)

// Config is read once from the environment at start-up.
type Config struct {
	// Addr is the UDP address WebTransport (HTTP/3) listens on.
	Addr string
	// AdminAddr is the TCP address of the internal admin API. Never publish it.
	AdminAddr string
	// Secret verifies room tickets and guards the admin API.
	Secret []byte
	// AllowedOrigins lists the web origins permitted to open sessions.
	AllowedOrigins map[string]bool
	// CertHosts are the names and addresses the self-signed certificate covers.
	CertHosts []string
	// CertFile and KeyFile, when both set, replace the self-signed certificate.
	CertFile string
	KeyFile  string
}

func envOr(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func splitList(value string) []string {
	var out []string
	for _, item := range strings.Split(value, ",") {
		if item = strings.TrimSpace(item); item != "" {
			out = append(out, item)
		}
	}
	return out
}

func loadConfig() (*Config, error) {
	secret := os.Getenv("RELAY_SHARED_SECRET")
	if len(secret) < 32 {
		return nil, errors.New("RELAY_SHARED_SECRET must be at least 32 characters")
	}
	origins := make(map[string]bool)
	for _, origin := range splitList(os.Getenv("RELAY_ALLOWED_ORIGINS")) {
		origins[strings.TrimRight(origin, "/")] = true
	}
	if len(origins) == 0 {
		return nil, errors.New("RELAY_ALLOWED_ORIGINS must list at least one origin")
	}
	return &Config{
		Addr:           envOr("RELAY_ADDR", ":4433"),
		AdminAddr:      envOr("RELAY_ADMIN_ADDR", ":8081"),
		Secret:         []byte(secret),
		AllowedOrigins: origins,
		CertHosts:      splitList(envOr("RELAY_CERT_HOSTS", "127.0.0.1,localhost")),
		CertFile:       os.Getenv("TLS_CERT_FILE"),
		KeyFile:        os.Getenv("TLS_KEY_FILE"),
	}, nil
}
