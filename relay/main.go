// Command relay is the ToneLink QUIC relay: it admits ticket holders into
// rooms and forwards their audio packets to the other members, over
// WebTransport (HTTP/3 datagrams) or a WebSocket fallback. It keeps everything
// in memory and never decodes audio.
package main

import (
	"context"
	"errors"
	"flag"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

// healthcheck lets the container probe itself; the image has no shell or curl.
func healthcheck(adminAddr string) int {
	_, port, err := net.SplitHostPort(adminAddr)
	if err != nil {
		return 1
	}
	client := &http.Client{Timeout: 3 * time.Second}
	res, err := client.Get("http://127.0.0.1:" + port + "/healthz")
	if err != nil {
		return 1
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return 1
	}
	return 0
}

func run() error {
	cfg, err := loadConfig()
	if err != nil {
		return err
	}
	certs, err := newCertStore(cfg)
	if err != nil {
		return err
	}
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	go certs.rotateLoop(ctx)

	hub := newHub()
	relay := newRelay(cfg, certs, hub)
	admin := newAdminServer(cfg, certs, hub)
	fallback := newWebSocketServer(cfg, relay)

	failed := make(chan error, 3)
	go func() { failed <- relay.wt.ListenAndServe() }()
	go func() { failed <- admin.ListenAndServe() }()
	go func() { failed <- fallback.ListenAndServe() }()
	slog.Info("relay listening", "webtransport", cfg.Addr, "websocket", cfg.WSAddr, "admin", cfg.AdminAddr)

	select {
	case <-ctx.Done():
	case err := <-failed:
		if !errors.Is(err, http.ErrServerClosed) {
			return err
		}
	}
	shutdown, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	_ = admin.Shutdown(shutdown)
	_ = fallback.Shutdown(shutdown)
	return relay.wt.Close()
}

func main() {
	probe := flag.Bool("healthcheck", false, "probe the local admin API and exit")
	flag.Parse()
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))
	if *probe {
		os.Exit(healthcheck(envOr("RELAY_ADMIN_ADDR", ":8081")))
	}
	if err := run(); err != nil {
		slog.Error("relay stopped", "err", err)
		os.Exit(1)
	}
}
