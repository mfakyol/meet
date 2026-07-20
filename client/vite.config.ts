import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    // Listen on all interfaces so the app is reachable via the machine's LAN IP.
    host: true,
    port: 5173,
    // Same-origin proxy → the client never hardcodes the backend location; it
    // talks to `/socket.io` + `/api` on whatever host served the page, and Vite
    // forwards to the signaling server running alongside it.
    proxy: {
      "/socket.io": { target: "http://localhost:5001", ws: true },
      "/api": "http://localhost:5001",
    },
  },
});
