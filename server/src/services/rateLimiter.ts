// Simple in-memory token-bucket limiter, keyed by an arbitrary string (per
// socket). Guards against join/signal/chat flooding and relay amplification.
// Per-process — scaling out needs a shared store.

interface Bucket {
  tokens: number;
  updatedAt: number;
}

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly capacity: number,
    private readonly refillPerSec: number
  ) {}

  /** Consume one token for `key`. Returns false when the bucket is empty. */
  allow(key: string): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(key) ?? { tokens: this.capacity, updatedAt: now };

    const elapsedSec = (now - bucket.updatedAt) / 1000;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + elapsedSec * this.refillPerSec);
    bucket.updatedAt = now;

    if (bucket.tokens < 1) {
      this.buckets.set(key, bucket);
      return false;
    }
    bucket.tokens -= 1;
    this.buckets.set(key, bucket);
    return true;
  }

  /** Drop a key's state (e.g. on disconnect) to avoid unbounded growth. */
  forget(key: string): void {
    this.buckets.delete(key);
  }
}
