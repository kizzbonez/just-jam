package main

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/base64"
	"log/slog"
	"math/big"
	"net"
	"sync"
	"time"
)

// Browsers accept a certificate pinned by hash (serverCertificateHashes) only
// when it is ECDSA P-256 and valid for no more than 14 days. The relay stays
// under that and rotates well before expiry.
const (
	certLifetime   = 13 * 24 * time.Hour
	certBackdate   = time.Hour
	rotateInterval = 6 * 24 * time.Hour
)

// CertInfo is what the web app needs in order to hand clients a pinned hash.
type CertInfo struct {
	// Hash is the base64 SHA-256 of the DER certificate. Empty when Pinned is false.
	Hash     string    `json:"hash"`
	NotAfter time.Time `json:"notAfter"`
	// Pinned is false when an operator supplied a CA-issued certificate.
	Pinned bool `json:"pinned"`
}

// CertStore serves the relay's TLS certificate and rotates self-signed ones.
type CertStore struct {
	mu    sync.RWMutex
	cert  *tls.Certificate
	info  CertInfo
	hosts []string
}

func newCertStore(cfg *Config) (*CertStore, error) {
	store := &CertStore{hosts: cfg.CertHosts}
	if cfg.CertFile != "" && cfg.KeyFile != "" {
		cert, err := tls.LoadX509KeyPair(cfg.CertFile, cfg.KeyFile)
		if err != nil {
			return nil, err
		}
		store.cert = &cert
		return store, nil
	}
	return store, store.rotate()
}

func (s *CertStore) rotate() error {
	cert, info, err := selfSigned(s.hosts, time.Now())
	if err != nil {
		return err
	}
	s.mu.Lock()
	s.cert, s.info = cert, info
	s.mu.Unlock()
	slog.Info("certificate issued", "notAfter", info.NotAfter, "hash", info.Hash)
	return nil
}

// rotateLoop replaces the self-signed certificate until ctx ends.
func (s *CertStore) rotateLoop(ctx context.Context) {
	if !s.Info().Pinned {
		return
	}
	ticker := time.NewTicker(rotateInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := s.rotate(); err != nil {
				slog.Error("certificate rotation failed", "err", err)
			}
		}
	}
}

func (s *CertStore) GetCertificate(*tls.ClientHelloInfo) (*tls.Certificate, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.cert, nil
}

func (s *CertStore) Info() CertInfo {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.info
}

func selfSigned(hosts []string, now time.Time) (*tls.Certificate, CertInfo, error) {
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, CertInfo{}, err
	}
	serial, err := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 126))
	if err != nil {
		return nil, CertInfo{}, err
	}
	template := &x509.Certificate{
		SerialNumber:          serial,
		Subject:               pkix.Name{CommonName: "ToneLink relay"},
		NotBefore:             now.Add(-certBackdate),
		NotAfter:              now.Add(certLifetime - certBackdate),
		KeyUsage:              x509.KeyUsageDigitalSignature,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
	}
	for _, host := range hosts {
		if ip := net.ParseIP(host); ip != nil {
			template.IPAddresses = append(template.IPAddresses, ip)
		} else {
			template.DNSNames = append(template.DNSNames, host)
		}
	}
	der, err := x509.CreateCertificate(rand.Reader, template, template, &key.PublicKey, key)
	if err != nil {
		return nil, CertInfo{}, err
	}
	sum := sha256.Sum256(der)
	info := CertInfo{
		Hash:     base64.StdEncoding.EncodeToString(sum[:]),
		NotAfter: template.NotAfter,
		Pinned:   true,
	}
	return &tls.Certificate{Certificate: [][]byte{der}, PrivateKey: key}, info, nil
}
