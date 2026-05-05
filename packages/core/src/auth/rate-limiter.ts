/**
 * Login-specific rate limiter with exponential backoff.
 *
 * Independent from the general RateLimiter (which prevents infinite action loops).
 * This specifically targets brute-force login attempts.
 *
 * Default: 5 attempts per 60s window. Each consecutive exhausted window
 * doubles the wait time (exponential backoff).
 */

export interface LoginRateLimiterConfig {
  /** Max login attempts per window. Default: 5. */
  maxAttempts?: number;
  /** Window duration in ms. Default: 60000 (1 minute). */
  windowMs?: number;
}

export interface LoginRateLimiter {
  /** Check if a login attempt is allowed. Increments counter. Returns true if allowed. */
  check: () => boolean;
  /** Throws if rate limited. Call before login. */
  assertAllowed: () => void;
  /** Remaining attempts in current window. */
  remaining: () => number;
  /** Time in ms until next attempt is allowed. 0 if not blocked. */
  getWaitTime: () => number;
  /** Reset all state. */
  reset: () => void;
}

export function createLoginRateLimiter(config?: LoginRateLimiterConfig): LoginRateLimiter {
  const maxAttempts = config?.maxAttempts ?? 5;
  const baseWindowMs = config?.windowMs ?? 60_000;

  let attempts = 0;
  let windowStart = Date.now();
  let consecutiveBlocks = 0;

  function currentWindowMs(): number {
    return baseWindowMs * Math.pow(2, consecutiveBlocks);
  }

  function resetIfExpired(): void {
    const now = Date.now();
    if (now - windowStart >= currentWindowMs()) {
      const wasExhausted = attempts >= maxAttempts;
      attempts = 0;
      windowStart = now;
      if (wasExhausted) {
        consecutiveBlocks++;
      } else {
        consecutiveBlocks = 0;
      }
    }
  }

  return {
    check(): boolean {
      resetIfExpired();
      attempts++;
      return attempts <= maxAttempts;
    },

    assertAllowed(): void {
      resetIfExpired();
      if (attempts >= maxAttempts) {
        const waitMs = Math.max(0, currentWindowMs() - (Date.now() - windowStart));
        const waitSec = Math.ceil(waitMs / 1000);
        throw new Error(
          `Login rate limit exceeded: ${maxAttempts} attempts per ${Math.ceil(currentWindowMs() / 1000)}s. ` +
          `Try again in ${waitSec} seconds.`
        );
      }
      attempts++;
    },

    remaining(): number {
      resetIfExpired();
      return Math.max(0, maxAttempts - attempts);
    },

    getWaitTime(): number {
      resetIfExpired();
      if (attempts < maxAttempts) return 0;
      const elapsed = Date.now() - windowStart;
      return Math.max(0, currentWindowMs() - elapsed);
    },

    reset(): void {
      attempts = 0;
      windowStart = Date.now();
      consecutiveBlocks = 0;
    },
  };
}
