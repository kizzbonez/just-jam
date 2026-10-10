# ToneLink QUIC

Ultra-low-latency browser jamming studio. Instrument audio is captured from an
audio interface, framed in an AudioWorklet, encoded with WebCodecs and sent as
unreliable datagrams over WebTransport (HTTP/3) through a small QUIC relay.

This README is a placeholder while the project is being built. See
[CHANGELOG.md](CHANGELOG.md) for what exists so far.

## Run it

```bash
npm run env:init            # writes .env with generated secrets
docker compose up -d --build
docker compose logs web     # shows the one-time setup token
```

Then open <http://127.0.0.1:3410/setup>.
