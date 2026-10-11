# Changelog

All notable changes to ToneLink QUIC are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-10-11

First complete release: the guide, a public home page, a security pass and
everything needed to put the studio on a public hostname.

### Added

- In-app guide with seven illustrated pages: getting started, audio setup,
  rooms, latency and buffering, account security, self-hosting and
  troubleshooting.
- Public home page at `/` explaining the idea, with a working model of a
  channel in the hero. The studio itself stays behind sign-in.
- `RELAY_BIND` setting for the relay's UDP port, and a "Playing with people
  elsewhere" section in the guide and README. WebTransport is UDP, so an HTTP
  tunnel can publish the web app but not the relay.
- HSTS once `APP_URL` is https, and a `/.well-known/security.txt`.
- `npm run shots`: regenerates every screenshot from a live stack with three
  players, including the first-run wizard on a fresh install.
- secsuite targets for the source tree, the running site and the built images.
- The end-to-end test now also closes the room and checks everyone is told.

### Changed

- The repository is now `kizzbonez/tonelink`.
- Anonymous requests for anything that is not a known page get a 404 instead
  of a redirect to sign-in, so protected files and probes for paths such as
  `/.env` reveal nothing. Dotfiles are never served.
- The image optimizer route is behind sign-in. It could otherwise serve
  protected files from `/public`.
- The audio test asserts that the buffer follows its target rather than
  staying under a fixed number of milliseconds.

### Security

- The runtime web image no longer contains npm, which removed eight high
  severity findings in modules that never ran there.
- Relay dependencies `golang.org/x/net`, `x/crypto` and `x/text` upgraded past
  two high severity advisories.
- `mysql2` and `deepmerge-ts`, pulled in by the Prisma CLI, are pinned to
  patched versions. `npm audit --omit=dev` reports no vulnerabilities.

## [0.4.0] - 2026-10-11

Telemetry and live control of transport and buffering.

### Added

- Transport rack: change codec, frame size and bitrate while playing. Options
  that cannot fit one datagram are disabled, and switching codec shortens the
  frame when it must. Readouts show bitrate on the wire, packets per second
  and payload size.
- Jitter buffer rack: adaptive tuning on or off, with a fixed buffer size to
  use when it is off.
- Telemetry rack per remote player: estimated interface-to-ears latency with
  its breakdown, buffer held and target, 99th percentile lateness, jitter,
  packet loss, dropouts, receive bitrate and drift correction, plus a
  one-minute trace of buffer, target and lateness with dropout marks and a
  hover readout.
- Relay round trip and send bitrate in the console header.
- Playback device picker, where the browser supports choosing an output.
- Audio defaults panel on the profile page. Settings changed inside a room
  are saved automatically and used the next time.

### Changed

- Drift correction is limited to 0.2% (about 3.5 cents) instead of 0.5%, so
  pitch stays steady while the buffer is being recentred.
- The buffer skips ahead only on sustained excess, judged on the smoothed
  fill, so a normal burst of arrivals no longer triggers a skip.

## [0.3.0] - 2026-10-11

Audio. Two players in a room now hear each other.

### Added

- Audio engine that bypasses WebRTC entirely. A capture AudioWorklet frames
  the interface input, a transport worker encodes it with WebCodecs and sends
  each frame as one WebTransport datagram, and a playback AudioWorklet per
  remote player plays it through a purpose-built jitter buffer. The page's
  main thread is never in the audio path.
- Capture with every speech stage off (echo cancellation, noise suppression,
  automatic gain), 48 kHz stereo, with channel routing: stereo, mono from
  input 1, mono from input 2, or a mono sum.
- Three codecs: Opus in low-delay mode at 96 to 510 kbps, and uncompressed
  16-bit or 24-bit PCM. Frame sizes of 2.5, 5, 10 and 20 ms.
- Jitter buffer with drift correction of at most half a percent, a crossfaded
  skip when a network stall leaves too much queued, fade-out on underrun and
  concealment of lost packets.
- Adaptive buffer tuning that sizes each player's buffer from the measured
  99th percentile packet lateness, plus a penalty that decays after dropouts.
- Studio console: input rack with interface and channel selection, LED peak
  meters, a waveform scope, mute and monitor switches; a mixer with one strip
  per remote player carrying a level meter, volume fader, pan knob, local mute
  and, for the host, a remove-from-room key.
- `window.__tonelink.diagnostics()`, a read-only snapshot of a live session.
- `npm run e2e`: two real browsers with fake audio interfaces join a room and
  the test verifies pitch, channel, level, bitrate, loss and dropouts.

### Changed

- Registration, first-run setup and the change-password form ask for the new
  password twice.

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

[Unreleased]: https://github.com/kizzbonez/tonelink/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/kizzbonez/tonelink/compare/v0.4.0...v1.0.0
[0.4.0]: https://github.com/kizzbonez/tonelink/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/kizzbonez/tonelink/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/kizzbonez/tonelink/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/kizzbonez/tonelink/releases/tag/v0.1.0
