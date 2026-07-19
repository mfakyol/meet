# Backend — File Structure Standards

Reusable layered structure for Node + Express + Socket.io + TypeScript services.
Optimizes for clear dependency direction, testability, and predictable file
locations. For this repo the transport is **Socket.io signaling** (not a REST/DB
API), so the "data layer" is in-memory room state rather than a database.

## Layout

```
src/
  config/        # env parsing/validation, CORS/socket options — startup & infra
  http/          # Express side: routes + controllers for /health, /api/*
    routes/      #   endpoint → handler wiring ONLY (no logic)
    controllers/ #   HTTP in/out; parse request, call service, shape response — thin
  socket/        # Socket.io side: connection wiring + per-event handlers
    handlers/    #   one file per event (join, signal, state, chat, leave)
  services/      # business logic, framework-agnostic (no req/res, no socket)
  state/         # in-memory data layer (RoomStore) — the only place rooms live
  schemas/       # input validation (Zod) — event & request payload DTOs
  errors/        # AppError and typed error helpers
  types/         # shared types (Peer, signaling payloads) + .d.ts shims
index.ts         # composition root: build state, start HTTP+socket, wire shutdown
app.ts           # build the Express app + register socket handlers, export them
test/            # tests mirroring src/, integration tests over a real socket client
```

## Principles

- **Dependency direction is one-way:** `routes/handlers → services → state`.
  Lower layers never import higher ones. A socket handler and an HTTP controller
  are peers — both thin, both delegate to services.
- **Routes/handlers only wire.** A route maps method+path to handler; a socket
  handler maps an event name to validation + a service call and nothing else.
- **Controllers & handlers stay thin.** They translate transport ⇄ domain and
  delegate. Once a handler grows past trivial state calls, push logic into a `service`.
- **Services are transport-agnostic.** No `req`/`res`, no `socket` — pure
  functions/classes that are unit-testable and reusable from either transport.
- **State is centralized.** All room/peer mutation goes through one `RoomStore`
  in `state/` (the in-memory analogue of a model layer). No handler touches the
  raw `Map` directly.
- **One validation source.** Define event/request schemas once (Zod) and reuse
  for types (`z.infer`). Validate every inbound payload at the boundary.
- **One error model.** A single `AppError` (code, message) plus one place that
  turns it into an HTTP response or a socket ack `{ ok: false, error }`.
- **Config isolated & typed.** All env access in `config/env`, validated once,
  fail-fast in production.
- **Separate `app` from `server`.** `app.ts` builds the Express app and registers
  socket handlers (import it in tests); `index.ts` constructs dependencies and
  listens. Keeps tests fast and transport-focused.

## Naming conventions

- `feature.routes.ts`, `feature.controller.ts`, `feature.service.ts`, `feature.schema.ts`
- Socket handlers `event.handler.ts` (`join.handler.ts`, `signal.handler.ts`)
- State/domain classes `PascalCase.ts` (`RoomStore.ts`)
- Middleware `camelCase.ts`
- Keep one feature's files consistently named across layers so they're easy to find.

## Testing layout

- `test/` mirrors `src/`; name files `feature.test.ts`.
- Prefer integration tests that connect a real `socket.io-client` to the built
  `app`/server on an ephemeral port and assert the emitted events/acks
  (join → peers list, signal relay, chat broadcast, leave cleanup).
- Unit-test services and `RoomStore` directly — they have no transport deps.
- Import the built `app` (not the live `index.ts`) so no fixed port is needed.
