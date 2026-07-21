# Meet — peer-to-peer video calls in the browser

A Zoom-style video conferencing app built on **mesh WebRTC**: audio and video
flow **directly between participants** and never touch the server. A lightweight
**Socket.io** service handles signaling only — no media, no database, no accounts.

> **Tech:** React · TypeScript · Vite · Mantine · WebRTC · Socket.io · Express · Docker

<!-- Add a short screen-recording GIF and a live demo link here:
![demo](docs/demo.gif) · **Live demo:** https://… -->

---

## Highlights

- 🎥 **Instant rooms** — create a room, share the link, others join in seconds. No sign-up.
- 🖥️ **Screen sharing as its own tile** — your screen is published as a *separate*
  track, so people see your camera **and** your screen side by side (works even
  without a camera).
- 💬 **Live chat** with an emoji picker, scoped to the room and never persisted.
- 🎛️ **Device selection** — switch camera / microphone / speaker on the fly
  (`replaceTrack`, no renegotiation; `setSinkId` for output).
- 🚪 **Join without waiting** — you enter the room immediately; the camera/mic
  permission prompt runs in parallel and your tracks are published once granted.
  Deny it and you're in **view-only** mode, not stuck.
- 🌍 **i18n** — Turkish + English, live switch (react-i18next).
- 📱 **Responsive** — proper mobile layout (single-column grid, compact control
  bar, full-screen chat overlay, iOS focus-zoom fix).
- 🔒 **Secure signaling** — same-room relay integrity, Zod-validated payloads,
  per-socket rate limiting, locked CORS, `helmet`.

## Architecture

```
┌──────────┐   SDP / ICE over Socket.io    ┌──────────┐
│  Peer A  │ ◄───────  signaling  ───────► │  Peer B  │
└────┬─────┘                                └────┬─────┘
     │            direct RTCPeerConnection        │
     └───────────  audio + video (P2P)  ──────────┘
                (media never reaches the server)
```

- **Mesh topology:** every participant opens a direct `RTCPeerConnection` to
  every other participant. The server only relays SDP offers/answers and ICE
  candidates. Because mesh is `O(n²)`, room size is capped (`MAX_PER_ROOM`, default 8)
  — this is both a UX and a DoS guardrail.
- **Perfect negotiation:** connections use the WebRTC *perfect-negotiation*
  pattern (polite/impolite roles) so either side can (re)negotiate at any time —
  e.g. adding/removing a screen track — with offer glare resolved automatically.
- **Signaling protocol** (`socket ↔ client`): `join` → `{ selfId, peers }` +
  `peer-joined`; `signal` (SDP/ICE, restricted to same-room peers); `state`
  (mic/cam) → `peer-state`; `screen` → `peer-screen`; `chat`; `leave`/`disconnect`
  → `peer-left`.

## Tech stack

| | |
|---|---|
| **Client** | Vite · React 19 · TypeScript · Mantine (+ Sass modules) · react-i18next · Tabler icons |
| **Server** | Node · Express · Socket.io · TypeScript · Zod · pino |
| **Transport** | WebRTC (mesh) · public STUN, optional TURN (coturn) |
| **Deploy** | Docker Compose · nginx (TLS termination) |

The WebRTC lifecycle lives entirely in focused hooks — `useRoom` orchestrates
`useLocalMedia` (camera/mic/screen), `usePeerConnections` (the mesh + perfect
negotiation), and `useSignaling` (typed socket). The server is a layered
structure: `config` · `http` · `socket/handlers` · `services` · `state/RoomStore`
· `schemas` (Zod) · `errors`.

## Getting started

```bash
# 1) signaling server  →  http://localhost:5001
cd server && npm install && npm run dev

# 2) client (proxies /socket.io + /api to :5001)  →  http://localhost:5173
cd client && npm install && npm run dev
```

Open `http://localhost:5173`, create a room, and open the link in a second tab.

> **Camera/mic need a secure context.** They work on `localhost`; over a LAN IP
> (e.g. testing from a phone) the browser requires **HTTPS**.

## Configuration

**Server** (`server/.env`, see `.env.example`):

| var | default | notes |
|---|---|---|
| `PORT` | `5001` | |
| `MAX_PER_ROOM` | `8` | mesh capacity cap |
| `CLIENT_URL` | — | allowed CORS origin(s), comma-separated. **Required in production** |
| `TRUST_PROXY` | `0` | proxy hops to trust behind nginx |

**Client** (build-time, optional TURN for symmetric NAT / strict firewalls):
`VITE_TURN_URL` · `VITE_TURN_USERNAME` · `VITE_TURN_CREDENTIAL`.

## Deployment

Two independent apps behind a host nginx that terminates TLS (WebRTC requires
HTTPS/WSS in production):

```bash
docker compose -f docker-compose.prod.yml up -d --build   # client on 127.0.0.1:8087
```

See `deploy/nginx-host.conf.example`.

## Engineering notes

A few problems that were more interesting than they look:

- **Screen share vs. camera as separate tiles** — instead of swapping the camera
  track, the screen is added as its own track/stream and matched to a peer via a
  signaled MediaStream id, so both render as distinct cells and renegotiation
  publishes it to everyone (including mid-share joiners).
- **Glare-free renegotiation** — the naïve "only the newcomer offers" scheme
  breaks when either side later renegotiates (screen on/off); perfect negotiation
  fixes it cleanly.
- **Permission never blocks entry** — joining used to await `getUserMedia`, so you
  couldn't get in until you allowed/denied. Now you're in immediately and media is
  published when (if) it arrives.
- **Graceful device handling** — requesting camera+mic together no longer fails
  entirely when only one exists; declines don't re-prompt; insecure contexts fall
  back to view-only instead of crashing.

## Limitations & roadmap

- Mesh caps practical room size (~8). A future **SFU** (mediasoup/LiveKit) would
  scale to larger calls and enable server-side recording.
- Rooms are in-memory and per-process — scaling out needs a shared Socket.io
  adapter (e.g. Redis).
- No accounts/persistence by design (ephemeral rooms).
