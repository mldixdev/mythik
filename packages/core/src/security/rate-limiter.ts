/**
 * Rate limiter — prevents infinite loops from watchers/actions.
 *
 * If more than maxActionsPerSecond actions fire within a window,
 * subsequent actions are blocked and an error is reported.
 *
 * Usage:
 *   const limiter = createRateLimiter({ maxActionsPerSecond: 100 });
 *   limiter.check() → true (allowed)
 *   // ... after 100 rapid calls ...
 *   limiter.check() → false (blocked)
 */

export interface RateLimiterConfig {
  maxActionsPerSecond: number;
}

export interface RateLimiter {
  check: () => boolean;
  assertAllowed: () => void;
  reset: () => void;
  getCount: () => number;
}

export function createRateLimiter(config: RateLimiterConfig): RateLimiter {
  let count = 0;
  let windowStart = Date.now();

  function resetIfNeeded(): void {
    const now = Date.now();
    if (now - windowStart >= 1000) {
      count = 0;
      windowStart = now;
    }
  }

  function check(): boolean {
    resetIfNeeded();
    count++;
    return count <= config.maxActionsPerSecond;
  }

  function assertAllowed(): void {
    if (!check()) {
      throw new Error(
        `Rate limit exceeded: ${config.maxActionsPerSecond} actions/second. ` +
        `This usually indicates an infinite loop in watchers or actions.`
      );
    }
  }

  function reset(): void {
    count = 0;
    windowStart = Date.now();
  }

  function getCount(): number {
    resetIfNeeded();
    return count;
  }

  return { check, assertAllowed, reset, getCount };
}
