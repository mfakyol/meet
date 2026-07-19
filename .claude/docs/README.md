# Engineering Docs

Reference docs for how this codebase is built. Read the relevant one before making
structural or security decisions.

## Reusable across projects (copy these into any repo's `.claude/docs/`)
- [`nodejs-backend-security.md`](nodejs-backend-security.md) — Node/Express + Socket.io security checklist.
- [`backend-file-structure.md`](backend-file-structure.md) — layered backend structure (Express + Socket.io).
- [`frontend-structure.md`](frontend-structure.md) — React client structure & component/security standards.

## Project-specific (do not copy blindly)
- [`PROJECT-meet.md`](PROJECT-meet.md) — decisions unique to this repo (mesh WebRTC,
  signaling protocol, topology, the planned refactor).
