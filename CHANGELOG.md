# Changelog

All notable changes to ToneLink QUIC are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-10-11

Rooms and the QUIC relay. Players can open a room, share its link and be
admitted to the relay. Audio itself arrives in 0.3.0.

### Added

- Go relay built on quic-go: WebTransport sessions over HTTP/3, admission by
  short-lived signed ticket, lock-free datagram fan-out with a bounded queue
  per receiver, and a reliable control stream for presence, state, kick and
  room close.
- Self-signed ECDSA relay certificate, rotated every six days, that browsers
  pin by hash. A CA-issued certificate can be supplied instead.
- Studio lobby: create private or public rooms with an optional PIN and a
  player limit, join by room id or pasted link, live player counts from the
  relay, copy-link and close-room controls for the host.
- Room entry screen with PIN check. A correct PIN is remembered for twelve
  hours in a cookie scoped to that room.
- Profile page with display name, instrument tag and a profile picture that
  is cropped and re-encoded in the browser before upload.
- Saved audio settings (device, channel mode, codec, frame size, bitrate,
  buffer mode) with validation that a frame fits in one datagram.
- Session history and an owner-only studio settings page for the
  registration policy and invite code.
- `e2e/relay-probe.mjs`, a browser smoke test for the relay.

## [0.1.0] - 2026-10-11

Foundation release: the app shell, the design system and a complete account
system. No audio yet.

### Added

- Next.js 16 (App Router, Cache Components) project with Tailwind CSS 4, a
  PostgreSQL schema managed by Prisma 7 and a Docker Compose stack whose
  published ports bind to `127.0.0.1` only.
- Rack-hardware design system: carbon and crimson tokens, faceplate, well and
  etched-line utilities, panel keys, lever switches, indicator LEDs, readouts
  and rack units with mounting ears.
- Email and password accounts hashed with bcrypt, signed JWT session cookies
  backed by a revocable session table, and a proxy that keeps every page, API
  route and static asset behind sign-in.
- Two-factor authentication (TOTP) with replay protection, one-time recovery
  codes, account lockout after repeated failures and a devices list with
  remote sign-out.
- First-run setup wizard gated by a one-time token printed to the server log.
  It creates the owner account with two-factor already enabled and sets the
  registration policy (open, invite only or closed).
- Lint-enforced size budgets: 200 lines per file, 40 lines per function
  (60 for components), complexity 10.

[Unreleased]: https://github.com/kizzbonez/just-jam/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/kizzbonez/just-jam/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/kizzbonez/just-jam/releases/tag/v0.1.0
