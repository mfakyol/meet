import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@/types";

// Fully-typed socket for this app's signaling protocol.
export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// The Vite dev server (and prod nginx) proxy `/socket.io` → the signaling server.
export function createSocket(): AppSocket {
  return io({ path: "/socket.io", transports: ["websocket", "polling"] });
}
