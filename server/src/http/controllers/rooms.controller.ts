import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import type { RoomStore } from "../../state/RoomStore.js";

const ROOM_ID = /^[A-Za-z0-9._-]{1,64}$/;

// Lightweight pre-join info for the lobby (does not create the room). Thin:
// validate the param, read state, shape the response.
export function roomInfoController(store: RoomStore) {
  return (req: Request, res: Response) => {
    const roomId = req.params.roomId;
    if (!ROOM_ID.test(roomId)) {
      res.status(400).json({ error: "Invalid room id." });
      return;
    }
    res.json({ exists: store.has(roomId), count: store.size(roomId), max: env.maxPerRoom });
  };
}
