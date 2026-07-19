// Single error model. Handlers/controllers throw AppError; one place turns it
// into an HTTP response or a socket ack `{ ok: false, error }`. Internal details
// never leak to clients in production.

export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  /** Safe to show the client. Non-expose errors are masked in prod. */
  readonly expose: boolean;

  constructor(code: string, message: string, status = 400, expose = true) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.expose = expose;
  }
}

/** Message safe to send to a client for the given error. */
export function clientMessage(err: unknown, isProd: boolean): string {
  if (err instanceof AppError && err.expose) return err.message;
  return isProd ? "Something went wrong." : err instanceof Error ? err.message : String(err);
}
