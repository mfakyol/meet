# Frontend — Structure & Component Standards

Reusable structure for React + Vite + TypeScript SPAs. Optimizes for separation of
concerns, discoverability, and a consistent component model. This repo is a WebRTC
mesh client, so the heavy stateful logic lives in **hooks** (`useRoom`) rather than
a global store.

## Layout

```
src/
  pages/         # route-level screens (compose components; little logic)
  layouts/       # shared shells / route wrappers (Main, …) — add when needed
  components/
    ui/          # brand-neutral design-system primitives (Button, Input, Modal)
    <feature>/   # feature-scoped components grouped in one folder (VideoTile, ChatPanel)
  hooks/         # reusable logic (useRoom, useMediaDevices, …)
  lib/           # framework-adjacent helpers (WebRTC/ICE config, socket client)
  stores/        # client state — one store per domain (add only if state is shared across routes)
  services/      # typed API calls — one module per resource (e.g. rooms lobby info)
  schemas/       # client-side validation (Zod)
  types/         # shared types (Peer, signaling payloads — mirror the server)
  utils/         # pure, framework-free helpers
  styles/        # global styles
  assets/        # images, icons
main.tsx         # app bootstrap (providers, router, root render)
```

## Layering & responsibilities

- **pages** compose layouts + components and own route-level wiring.
- **components/ui** are presentational, app-agnostic primitives. **components/<feature>**
  are app-specific (VideoTile, ChatPanel) and may read hooks/stores.
- **hooks** own the reusable stateful logic. `useRoom` is the heart of this app:
  it owns the socket connection, the map of `RTCPeerConnection`s, local media, and
  the derived participant list. Keep WebRTC/socket lifecycle here, not in components.
- **lib** holds the low-level building blocks a hook composes: ICE server config,
  the socket.io client factory, SDP helpers.
- **stores** hold state shared **across routes**; one store per domain. This app
  mostly doesn't need them — prefer local state + `useRoom`. Don't add a store
  until state genuinely outlives a single page.
- **services** own all HTTP IO. Wrap the client to return a **discriminated result**
  (`{ success: true, data } | { success: false, error }`) instead of throwing.

## Component-model rules

- Keep a feature's components in **one place**. Don't split the same feature across
  top-level `components/` and a `components/<feature>/` subfolder — pick one.
- Prefer small, focused components; colocate a component's private helpers, extract
  shared ones to `utils/`.
- Co-locate `state` with usage; lift into `useRoom`/a store only when shared.
- Guard route access in a layout wrapper rather than per page (when auth is added).

## Naming conventions

- Components `PascalCase.tsx`; hooks `useCamelCase.ts`; stores `x.store.ts`;
  services `x.service.ts`; lib/utils `camelCase.ts`.

## Imports

- Prefer a path alias (e.g. `@/`) for intra-`src` imports so they don't break when
  files move and stay grep-able. Configure it in both `tsconfig.json` (`paths`) and
  `vite.config` (`resolve.alias`).
  - ✅ `import VideoTile from '@/components/room/VideoTile'`
  - ❌ `import VideoTile from '../components/VideoTile'`

## Frontend security defaults

- **Never** `dangerouslySetInnerHTML` with user/remote data (chat messages,
  participant names). Rely on React escaping — display names and chat text arrive
  from other peers via the server and are untrusted.
- **getUserMedia / getDisplayMedia** only over HTTPS (or `localhost`). WebRTC is
  gated on a secure context; the deployed app must be served over TLS.
- **postMessage** (if used): always check `event.source`/`event.origin` and reject
  messages that aren't from the expected window.
- Validate/normalize any redirect or room-id input (must be a safe slug) to avoid
  open redirects and malformed room joins.
- External links: `target="_blank"` → add `rel="noreferrer"` (or `noopener`).
- Show raw error details only in development (`import.meta.env.DEV`); keep
  production messages generic.
- Keep user-facing strings ready for i18n; avoid hardcoding copy deep in components.

## App-level CSP note

A strict Content-Security-Policy belongs on **whatever serves the app HTML** — here
that's the client's **nginx** container (`client/nginx/default.conf`), **not** the
Socket.io/Express server (which serves JSON + the WebSocket, not the page). Set CSP
headers at nginx.
