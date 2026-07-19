# Node.js / Express + Socket.io — Security Standards

Reusable security checklist for Node + Express + Socket.io + TypeScript services.
Apply these by default; treat exceptions as decisions that need justification. This
service is a **signaling relay** (no database, no user accounts), so the emphasis is
on validating socket payloads, locking origins, and preventing relay abuse.

## Input & validation
- Validate **every** external input at the boundary with a schema library (e.g.
  Zod): HTTP `body`/`params`/`query` **and** every inbound Socket.io event payload
  (`join`, `signal`, `state`, `chat`). Reject/ignore malformed payloads.
- Derive types from the schema (`z.infer`) so validation and types share one
  source of truth. Don't trust `payload: any` shapes off the wire.
- Cap sizes: max name length, max chat length, and clamp `maxHttpBufferSize` to
  what real SDP/ICE payloads need (currently `1e7`) — smaller is safer.
- Validate/normalize `roomId` to a safe slug before use; reject empty/oversized ids.
- Never trust `from`/`to` fields blindly — a client may only signal peers that are
  in the **same room** as itself (see Authorization).

## Authorization (relay integrity)
- A socket may only `signal` a target that shares one of its rooms. Without this
  check any client can relay SDP/ICE to arbitrary socket ids (cross-room injection).
- `state` and `chat` must act on the sender's **own** room membership only; derive
  the room from `socket.data`, never from a client-supplied room id on those events.
- Enforce room capacity server-side (`MAX_PER_ROOM`) on `join` — never rely on the
  client to self-limit.
- Default deny: if a socket isn't a member of the room it references, drop the event.

## Rate limiting & abuse
- Rate-limit connection-level abuse: cap `join` attempts and `chat`/`signal` message
  rate per socket to prevent flooding/relay amplification. Keyed per socket (and
  optionally per IP).
- A single mesh room is `O(n²)` connections — the `MAX_PER_ROOM` cap is a DoS
  control, not just UX. Keep it.
- Note: an in-memory limiter/room map is **per-process** — running more than one
  instance needs a shared adapter (e.g. `@socket.io/redis-adapter`) or sticky
  sessions, or peers in the "same" room land on different processes.

## Transport & headers
- Use `helmet` on the Express side for security headers; enable HSTS in production.
- Lock **both** CORS and the Socket.io `cors.origin` to the known client origin(s)
  — do **not** ship `origin: "*"` in production (it currently defaults to `*`).
  Set `CLIENT_URL` explicitly and reject others.
- WebRTC requires a secure context: serve over HTTPS/WSS in production. Set
  `trust proxy` correctly when behind nginx (and only then — a wrong value lets
  clients spoof `X-Forwarded-For`).
- Terminate TLS at the host nginx (`deploy/nginx-host.conf.example`); the app
  containers speak plain HTTP internally.

## Errors, logging & data hygiene
- One central error path. **Never leak stack traces or internal messages** to
  clients in production; HTTP errors return a generic 500, socket errors return a
  generic ack `{ ok: false, error }`.
- Don't log full SDP/ICE payloads or participant PII in production. Prefer
  structured logging (pino) with a connection/room id over `console.*`.
- Chat and names are ephemeral and untrusted — never persist or echo them into
  logs/HTML unescaped.

## Config, secrets & lifecycle
- Centralize config in one typed module; validate required vars, fail fast in prod
  (e.g. require `CLIENT_URL` in production instead of falling back to `*`).
- Keep `.env` out of version control; commit a `.env.example` with safe placeholders
  (`PORT`, `MAX_PER_ROOM`, `CLIENT_URL`, optional TURN vars).
- Expose a health endpoint (`/health`) — already present; keep it cheap and
  dependency-free (there's no DB to check here).
- Handle graceful shutdown (`SIGTERM`/`SIGINT`): stop accepting connections, notify
  peers / let sockets drain, close the HTTP+socket server, force-exit timeout fallback.

## TURN / infrastructure
- If you run a TURN server, its long-term credentials are secrets — don't commit
  them; inject via env at build/deploy. Prefer short-lived (time-limited) TURN
  credentials over static ones for anything public.

## Quick pre-ship checklist
- [ ] Every socket event payload schema-validated; sizes capped
- [ ] `signal`/`state`/`chat` restricted to the sender's own room (relay integrity)
- [ ] Room capacity enforced server-side; join/message rate-limited
- [ ] Socket.io `cors.origin` + Express CORS locked to `CLIENT_URL` (no `*` in prod)
- [ ] helmet + HTTPS/WSS + correct `trust proxy` behind nginx
- [ ] Central error handling hides internals in prod; no PII/SDP in logs
- [ ] Secrets (CLIENT_URL, TURN creds) required in prod, not committed
- [ ] Health check present; graceful shutdown wired
