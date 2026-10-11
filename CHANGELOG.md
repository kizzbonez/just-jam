# Changelog

All notable changes to ToneLink QUIC are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0-beta.2] - 2026-10-11

### Changed

- The adaptive jitter buffer settles in two seconds instead of about sixteen. A
  stream that has just started still gets 24 ms of headroom while its timing is
  measured, but the buffer is then cut to the measured need in one step, with a
  single crossfaded skip, instead of easing down at 1.5 ms a second. Arming,
  unmuting, changing codec or frame size and switching between relay and link
  all restart a stream, so each of them used to cost a quarter of a minute of
  extra latency.

## [1.2.0-beta.1] - 2026-10-11

On the `feat/webrtc-direct` branch, for trial before it is merged.

### Added

- Links between players' browsers. Each pair of browsers in a room negotiates a
  WebRTC data channel through the relay and sends audio straight across it, so
  the relay's distance no longer adds to their delay. The relay still seats
  players, carries room controls and forwards audio for any pair that cannot link.
- A `P2P` or `Relay` badge and the link's round trip on every mixer strip, a count
  of linked players in the console header, and latency estimates that use the
  link's own round trip.
- `P2P_MODE` (`on` or `off`) and `P2P_STUN_URLS`, and `?p2p=off` on a room address
  to keep one browser on the relay.
- `npm run e2e:p2p`: three real browsers covering linked, mixed and unlinked rooms.

### Changed

- The relay forwards negotiation messages between players and skips recipients a
  sender already reaches directly. Its control line limit is now 8 KiB and its
  control rate limit 60 messages a second.
- `npm run e2e` runs the relay-only suite and then the link suite.

### Security

- `RELAY_WS_URL` must now be a `wss://` address. Plain `ws://` is accepted only
  for this machine (`localhost`, `127.0.0.1`), so tickets and audio cannot be sent
  unencrypted across a network by a configuration mistake.
- A link is a direct connection, so each of the two players learns the other's
  public address, and each browser asks a STUN server (Google and Cloudflare by
  default) for its own. `P2P_MODE=off` turns links off.

## [1.1.1] - 2026-10-11

### Changed

- Before an input is armed, the interface rack now says what to do instead of
  drawing a flat scope that looks like a dead signal, and the Mute and Monitor
  switches are disabled until there is an input for them to act on.
- Screenshots regenerated, so they show the route badge beside the room name.

## [1.1.0] - 2026-10-11

A second way to reach the relay, for networks where UDP cannot get through,
and fixes found by putting the studio behind a CDN.

### Added

- WebSocket fallback. The relay accepts the same packets over a WebSocket on
  `127.0.0.1:4434`, which any HTTPS tunnel or reverse proxy can front. Set
  `RELAY_WS_URL` to its public `wss://` address. Each browser tries QUIC first
  and falls back within three seconds; players on either route share a room.
- A badge beside the room name shows the route in use, and a notice explains
  what the fallback costs: it is TCP, so latency is higher and less steady.
- `node e2e/ws-probe.mjs` connects through the public fallback address and
  prints its round trip, the figure that decides whether it is playable.
- The fallback also lets browsers without WebTransport join.
- The end-to-end test covers a room with one player on each route.

### Fixed

- A new build could run against an old audio engine. The worker and worklets
  load by URL, and a CDN in front of the app told browsers to keep them for
  hours. Their URLs now carry a fingerprint of the build.
- A refusal could be cached and then served to signed-in users. A CDN stored
  the 404 an anonymous visitor received for the engine script. Refusals are
  now sent `no-store`, and files behind sign-in are sent `private`.
- A relay address that only works on the server itself is now explained to the
  player, with what has to change, instead of a generic connection error.
- An audio engine that fails to load ends the session with a message instead
  of leaving the console stuck on "Connecting".

### Security

- `RELAY_WS_URL` must now be a `wss://` address. Plain `ws://` is accepted only
  for this machine (`localhost`, `127.0.0.1`), so tickets and audio cannot be sent
  unencrypted across a network by a configuration mistake.

- AES-GCM calls pin the authentication tag length.
- The web image has its own HEALTHCHECK.

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

- `RELAY_WS_URL` must now be a `wss://` address. Plain `ws://` is accepted only
  for this machine (`localhost`, `127.0.0.1`), so tickets and audio cannot be sent
  unencrypted across a network by a configuration mistake.

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

[Unreleased]: https://github.com/kizzbonez/tonelink/compare/v1.2.0-beta.2...HEAD
[1.2.0-beta.2]: https://github.com/kizzbonez/tonelink/compare/v1.2.0-beta.1...v1.2.0-beta.2
[1.2.0-beta.1]: https://github.com/kizzbonez/tonelink/compare/v1.1.1...v1.2.0-beta.1
[1.1.1]: https://github.com/kizzbonez/tonelink/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/kizzbonez/tonelink/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/kizzbonez/tonelink/compare/v0.4.0...v1.0.0
[0.4.0]: https://github.com/kizzbonez/tonelink/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/kizzbonez/tonelink/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/kizzbonez/tonelink/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/kizzbonez/tonelink/releases/tag/v0.1.0
