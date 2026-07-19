import { Router } from "express";
import type { RoomStore } from "../../state/RoomStore.js";
import { healthController } from "../controllers/health.controller.js";
import { roomInfoController } from "../controllers/rooms.controller.js";

// Endpoint → handler wiring only (no logic).
export function buildRoutes(store: RoomStore): Router {
  const router = Router();
  router.get("/health", healthController(store));
  router.get("/api/rooms/:roomId", roomInfoController(store));
  return router;
}
