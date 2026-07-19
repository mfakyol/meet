# Project-Specific — Meet (WebRTC video calls)

Notes unique to **this** repo. General standards live in the sibling docs
(`nodejs-backend-security.md`, `backend-file-structure.md`, `frontend-structure.md`).

## Topology
- Two independent apps, deployed separately:
  - `client/` — React + Vite + Tailwind v4 SPA, dev on `:5173`. Built to static
    files, served by an **nginx** container in prod (`client/nginx/default.conf`).
  - `server/` — Express + Socket.io, dev on `:5001`. Serves **only** `/health`,
    `/api/*`, and the Socket.io endpoint — it does **not** serve the app HTML.
- **Implication:** an app-level CSP belongs on the client's **nginx**, not the
  server's `helmet` (which only affects JSON/WebSocket responses).
- Vite dev server proxies `/socket.io` (with `ws: true`) and `/api` → `:5001`.
- Prod: host nginx terminates TLS (WebRTC requires HTTPS/WSS) and fronts the
  client container on `127.0.0.1:8087`. See `deploy/nginx-host.conf.example` and
  `docker-compose.prod.yml`.

## Architecture (the core of the app)
- **Mesh WebRTC**: every participant opens a direct `RTCPeerConnection` to every
  other participant. **Media never touches the server** — it's peer-to-peer. The
  server is signaling only.
- Because mesh is `O(n²)`, room size is capped by `MAX_PER_ROOM` (default 8). This
  is both a UX and a DoS guardrail — don't remove it.
- **Glare avoidance:** on `join`, the newcomer receives the list of already-present
  peers and initiates the offer to each; existing peers only answer. So only
  newcomers create offers.

## Signaling protocol (server ↔ client events)
- `join` `{ roomId, name, audio, video }` → ack `{ ok, selfId, peers }`; also
  emits `peer-joined` to the room.
- `signal` `{ to, data }` → relayed to `to` as `{ from, data }` (SDP offer/answer
  or ICE candidate). **Relay integrity gap:** currently any socket can target any
  `to`; should be restricted to same-room peers (see security doc).
- `state` `{ audio, video }` → broadcast as `peer-state` (mic/cam indicators).
- `chat` `{ text }` → broadcast as `chat { from, name, text, ts }`. Ephemeral,
  never persisted.
- `leave` / `disconnect` → `peer-left { id }`; empty rooms are deleted.

## Client structure (current)
- `hooks/useRoom.ts` is the orchestrator (~155 lines): it composes three focused
  hooks and owns the derived participant/chat UI state. The three concerns:
  - `hooks/useLocalMedia.ts` — camera/mic + screen share, toggles.
  - `hooks/usePeerConnections.ts` — the mesh of `RTCPeerConnection`s, ICE buffering,
    offer/answer, track replacement (stable imperative handle, no React churn).
  - `hooks/useSignaling.ts` — the socket lifecycle + typed emit/on.
- `lib/ice.ts` — STUN/TURN ICE config (`VITE_TURN_*`); `lib/socket.ts` — typed
  socket.io client factory.
- `types/` mirrors the server signaling protocol (`signaling.ts` + `room.ts`
  view models). `utils/roomId.ts` normalizes/validates a room slug.
- Path alias `@/` → `src/` (configured in `tsconfig.json` + `vite.config.ts`).
- Components live under `components/room/` (`VideoTile`, `ChatPanel`, `RoomControls`,
  `NameGate`). Pages: `HomePage` (create/join), `RoomPage`.

## Server structure (current)
- Layered per `backend-file-structure.md`. Entry points:
  `src/index.ts` (composition root: listen + graceful shutdown) and
  `src/app.ts` (builds Express + Socket.io, wires handlers — import in tests).
- `config/` (typed env + pino logger), `http/` (health + rooms routes/controllers),
  `socket/handlers/` (one file per event), `services/` (`RoomService`, `RateLimiter`),
  `state/RoomStore.ts`, `schemas/` (Zod), `errors/AppError.ts`, `types/`.

## Data / state
- **No database.** All room/peer state lives behind `state/RoomStore.ts`
  (`rooms: Map<roomId, Map<socketId, Peer>>`), the only place the raw Map is
  touched. Ephemeral — restarting the server drops all rooms; per-process, so
  scaling out needs a shared adapter.
- No user accounts, no auth. Anyone with a room link can join (until it's full).

## TURN (optional)
- Public STUN handles most networks. For symmetric NAT / strict firewalls, run a
  TURN server (coturn) and build the client with `VITE_TURN_URL` /
  `VITE_TURN_USERNAME` / `VITE_TURN_CREDENTIAL`.

## Testing
- **No test suite currently** on either side (no `test` script in `client` or
  `server`). Don't claim tests in docs/README. Target: Vitest + `socket.io-client`
  integration tests for the server on refactor (see `backend-file-structure.md`).

## Conventions for this repo/owner
- **Do not add a `Co-Authored-By` trailer** to commits (owner preference).
- Prefer small, single-concern commits.

## Open follow-ups
- **Server:** ✅ done — layered structure, Zod validation on every event, CORS
  locked to `CLIENT_URL` (fail-fast in prod), relay-integrity (same-room `signal`
  only), per-socket rate limiting, graceful shutdown, `helmet`, pino logging,
  `.env.example`. Remaining: add an automated Vitest + `socket.io-client` suite
  (a manual smoke test currently covers join/signal/chat/state/leave).
- **Client:** ✅ done — `useRoom.ts` split into `useLocalMedia` /
  `usePeerConnections` / `useSignaling` (+ `lib/socket.ts`), `@/` path alias,
  server signaling types mirrored in `types/`, components grouped under
  `components/room/`. Remaining: a client test suite.
