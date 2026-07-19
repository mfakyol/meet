import { z } from "zod";

// All environment access lives here, validated once at startup. In production we
// fail fast rather than fall back to insecure defaults (e.g. CORS `*`).
const isProd = process.env.NODE_ENV === "production";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5001),
  // Mesh is O(n²); this cap is both a UX and a DoS guardrail.
  MAX_PER_ROOM: z.coerce.number().int().positive().max(50).default(8),
  // Comma-separated list of allowed client origins. Required in production —
  // never ship `origin: "*"`.
  CLIENT_URL: z.string().optional(),
  // Trust proxy hops when behind nginx. `0` (default) = don't trust any.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const raw = parsed.data;

// Origins allowed for CORS / Socket.io. In prod, `*` is refused.
const origins = (raw.CLIENT_URL ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

if (isProd && origins.length === 0) {
  // eslint-disable-next-line no-console
  console.error("CLIENT_URL is required in production (refusing to default CORS to '*').");
  process.exit(1);
}

export const env = {
  nodeEnv: raw.NODE_ENV,
  isProd,
  port: raw.PORT,
  maxPerRoom: raw.MAX_PER_ROOM,
  trustProxy: raw.TRUST_PROXY,
  // In development, fall back to permissive CORS for convenience.
  corsOrigin: origins.length > 0 ? origins : ("*" as const),
} as const;

export type Env = typeof env;
