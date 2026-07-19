// Accept either a bare room code or a full room URL, and return a safe slug
// (or null if it isn't one). Guards against malformed joins / open redirects.
const ROOM_ID = /^[A-Za-z0-9._-]{1,64}$/;

export function extractRoomId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const id = trimmed.includes("/room/")
    ? trimmed.split("/room/")[1]?.split(/[?#]/)[0] ?? ""
    : trimmed;
  return ROOM_ID.test(id) ? id : null;
}
