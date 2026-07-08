import http from "node:http";
import express from "express";
import cors from "cors";
import { Server, type Socket } from "socket.io";

const PORT = Number(process.env.PORT) || 5001;
// Mesh (peer-to-peer) scales poorly beyond a handful of participants, so cap
// the room size. Every peer connects directly to every other peer.
const MAX_PER_ROOM = Number(process.env.MAX_PER_ROOM) || 8;

interface Peer {
  id: string;
  name: string;
  audio: boolean;
  video: boolean;
}

// roomId -> (socketId -> Peer)
const rooms = new Map<string, Map<string, Peer>>();

function roomPeers(roomId: string): Peer[] {
  return [...(rooms.get(roomId)?.values() ?? [])];
}

const app = express();
app.use(cors());
app.get("/health", (_req, res) => res.json({ status: "ok", rooms: rooms.size }));
// Lightweight pre-join info for the lobby (does not create the room).
app.get("/api/rooms/:roomId", (req, res) => {
  const peers = rooms.get(req.params.roomId);
  res.json({ exists: !!peers, count: peers?.size ?? 0, max: MAX_PER_ROOM });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || "*" },
  // Large ICE/SDP payloads travel over signaling.
  maxHttpBufferSize: 1e7,
});

io.on("connection", (socket: Socket) => {
  socket.on(
    "join",
    (
      payload: { roomId?: string; name?: string; audio?: boolean; video?: boolean },
      ack?: (res: { ok: true; selfId: string; peers: Peer[] } | { ok: false; error: string }) => void
    ) => {
      const roomId = String(payload?.roomId || "").trim();
      const name = String(payload?.name || "Guest").trim().slice(0, 40) || "Guest";
      if (!roomId) {
        ack?.({ ok: false, error: "Missing room id." });
        return;
      }

      let peers = rooms.get(roomId);
      if (!peers) {
        peers = new Map();
        rooms.set(roomId, peers);
      }
      if (peers.size >= MAX_PER_ROOM) {
        ack?.({ ok: false, error: `Room is full (max ${MAX_PER_ROOM}).` });
        return;
      }

      const self: Peer = {
        id: socket.id,
        name,
        audio: payload?.audio !== false,
        video: payload?.video !== false,
      };

      // The list of already-present peers is returned to the newcomer, who then
      // initiates a connection to each — so only newcomers create offers (no glare).
      const existing = roomPeers(roomId);

      peers.set(socket.id, self);
      socket.data.roomId = roomId;
      socket.join(roomId);

      socket.to(roomId).emit("peer-joined", self);
      ack?.({ ok: true, selfId: socket.id, peers: existing });
    }
  );

  // Relay an SDP offer/answer or ICE candidate to a specific peer.
  socket.on("signal", (payload: { to?: string; data?: unknown }) => {
    if (!payload?.to) return;
    io.to(payload.to).emit("signal", { from: socket.id, data: payload.data });
  });

  // Broadcast mic/camera on-off state to the room.
  socket.on("state", (payload: { audio?: boolean; video?: boolean }) => {
    const roomId: string | undefined = socket.data.roomId;
    if (!roomId) return;
    const peer = rooms.get(roomId)?.get(socket.id);
    if (!peer) return;
    if (typeof payload?.audio === "boolean") peer.audio = payload.audio;
    if (typeof payload?.video === "boolean") peer.video = payload.video;
    socket.to(roomId).emit("peer-state", { id: socket.id, audio: peer.audio, video: peer.video });
  });

  socket.on("chat", (payload: { text?: string }) => {
    const roomId: string | undefined = socket.data.roomId;
    const text = String(payload?.text || "").slice(0, 2000);
    if (!roomId || !text.trim()) return;
    const name = rooms.get(roomId)?.get(socket.id)?.name ?? "Guest";
    io.to(roomId).emit("chat", { from: socket.id, name, text, ts: Date.now() });
  });

  function leave() {
    const roomId: string | undefined = socket.data.roomId;
    if (!roomId) return;
    const peers = rooms.get(roomId);
    peers?.delete(socket.id);
    socket.to(roomId).emit("peer-left", { id: socket.id });
    if (peers && peers.size === 0) rooms.delete(roomId);
    socket.data.roomId = undefined;
    socket.leave(roomId);
  }

  socket.on("leave", leave);
  socket.on("disconnect", leave);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Signaling server listening on :${PORT}`);
});
