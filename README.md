# Meet — browser video calls

A small Zoom-like video conferencing app. Mesh **WebRTC** (peer-to-peer — media
never touches the server) with a lightweight **Socket.io** signaling server.

## Features

- Create a room and share the link — others join instantly, no accounts
- Camera + microphone toggle, **screen sharing**
- Responsive video grid, participant names, mute indicators
- Live **text chat**
- Up to 8 participants (mesh); media stays P2P

## Stack

- **client** — Vite + React + TypeScript + Mantine (Sass). WebRTC mesh in
  `src/hooks/` (`useRoom` + `useLocalMedia`/`usePeerConnections`/`useSignaling`).
- **server** — Express + Socket.io (TypeScript). Signaling only: relays SDP
  offers/answers + ICE candidates, broadcasts chat and mic/cam state. Rooms are
  in-memory (ephemeral); no database.

## Develop

```bash
# server
cd server && npm install && npm run dev      # :5001

# client (proxies /socket.io + /api to :5001)
cd client && npm install && npm run dev       # :5173
```

## Deploy

Behind a host nginx that terminates TLS (WebRTC requires HTTPS):

```bash
docker compose -f docker-compose.prod.yml up -d --build   # client on 127.0.0.1:8087
```

See `deploy/nginx-host.conf.example`.

### TURN (optional)

Public STUN handles most networks. If two peers can't connect directly
(symmetric NAT / strict firewalls), run a TURN server (e.g. coturn) and build
the client with `VITE_TURN_URL` / `VITE_TURN_USERNAME` / `VITE_TURN_CREDENTIAL`.
