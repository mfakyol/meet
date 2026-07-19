import type { Request, Response } from "express";
import type { RoomStore } from "../../state/RoomStore.js";

// Cheap, dependency-free health check (no DB to probe here).
export function healthController(store: RoomStore) {
  return (_req: Request, res: Response) => {
    res.json({ status: "ok", rooms: store.roomCount });
  };
}
