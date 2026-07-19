import { z } from "zod";

// One validation source for every inbound Socket.io payload. Types are derived
// via `z.infer` so we never trust `payload: any` off the wire.

// roomId: a safe, bounded slug. Rejects empty/oversized/control-char ids.
const roomId = z
  .string()
  .trim()
  .min(1, "Missing room id.")
  .max(64, "Room id too long.")
  .regex(/^[A-Za-z0-9._-]+$/, "Invalid room id.");

const name = z
  .string()
  .trim()
  .max(40)
  .transform((s) => s || "Guest")
  .default("Guest");

export const joinSchema = z.object({
  roomId,
  name,
  audio: z.boolean().default(true),
  video: z.boolean().default(true),
});

export const signalSchema = z.object({
  to: z.string().min(1).max(64),
  // SDP offer/answer or ICE candidate — opaque to the relay, but bounded.
  data: z.unknown(),
});

export const stateSchema = z.object({
  audio: z.boolean().optional(),
  video: z.boolean().optional(),
});

export const chatSchema = z.object({
  text: z.string().trim().min(1).max(2000),
});

export type JoinInput = z.infer<typeof joinSchema>;
export type SignalInput = z.infer<typeof signalSchema>;
export type StateInput = z.infer<typeof stateSchema>;
export type ChatInput = z.infer<typeof chatSchema>;
