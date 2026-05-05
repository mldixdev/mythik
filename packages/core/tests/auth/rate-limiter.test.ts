import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLoginRateLimiter } from '../../src/auth/rate-limiter.js';

describe('LoginRateLimiter', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('allows up to 5 attempts within window', () => {
    const limiter = createLoginRateLimiter();
    for (let i = 0; i < 5; i++) {
      expect(limiter.check()).toBe(true);
    }
  });

  it('blocks 6th attempt within window', () => {
    const limiter = createLoginRateLimiter();
    for (let i = 0; i < 5; i++) limiter.check();
    expect(limiter.check()).toBe(false);
  });

  it('returns remaining attempts', () => {
    const limiter = createLoginRateLimiter();
    expect(limiter.remaining()).toBe(5);
    limiter.check();
    expect(limiter.remaining()).toBe(4);
    limiter.check();
    limiter.check();
    expect(limiter.remaining()).toBe(2);
  });

  it('remaining never goes below 0', () => {
    const limiter = createLoginRateLimiter();
    for (let i = 0; i < 10; i++) limiter.check();
    expect(limiter.remaining()).toBe(0);
  });

  it('returns wait time when blocked', () => {
    const limiter = createLoginRateLimiter();
    for (let i = 0; i < 5; i++) limiter.check();
    const wait = limiter.getWaitTime();
    expect(wait).toBeGreaterThan(0);
    expect(wait).toBeLessThanOrEqual(60_000);
  });

  it('returns 0 wait time when not blocked', () => {
    const limiter = createLoginRateLimiter();
    expect(limiter.getWaitTime()).toBe(0);
  });

  it('resets after window expires', () => {
    const limiter = createLoginRateLimiter();
    for (let i = 0; i < 5; i++) limiter.check();
    expect(limiter.check()).toBe(false);

    vi.advanceTimersByTime(60_000);
    expect(limiter.check()).toBe(true);
    expect(limiter.remaining()).toBe(4);
  });

  it('assertAllowed throws when blocked', () => {
    const limiter = createLoginRateLimiter();
    for (let i = 0; i < 5; i++) limiter.check();
    expect(() => limiter.assertAllowed()).toThrow(/rate limit/i);
  });

  it('assertAllowed does not throw when allowed', () => {
    const limiter = createLoginRateLimiter();
    expect(() => limiter.assertAllowed()).not.toThrow();
  });

  it('exponential backoff increases wait time on consecutive blocks', () => {
    const limiter = createLoginRateLimiter();

    // First window: exhaust attempts
    for (let i = 0; i < 5; i++) limiter.check();
    const firstWait = limiter.getWaitTime();

    // Advance past first window
    vi.advanceTimersByTime(60_000);

    // Second window: exhaust again
    for (let i = 0; i < 5; i++) limiter.check();
    const secondWait = limiter.getWaitTime();

    // Second wait should be longer (exponential backoff)
    expect(secondWait).toBeGreaterThan(firstWait);
  });

  it('reset clears all state', () => {
    const limiter = createLoginRateLimiter();
    for (let i = 0; i < 5; i++) limiter.check();
    expect(limiter.check()).toBe(false);

    limiter.reset();
    expect(limiter.remaining()).toBe(5);
    expect(limiter.check()).toBe(true);
  });

  it('supports custom max attempts', () => {
    const limiter = createLoginRateLimiter({ maxAttempts: 3 });
    for (let i = 0; i < 3; i++) {
      expect(limiter.check()).toBe(true);
    }
    expect(limiter.check()).toBe(false);
  });

  it('supports custom window in ms', () => {
    const limiter = createLoginRateLimiter({ windowMs: 30_000 });
    for (let i = 0; i < 5; i++) limiter.check();
    expect(limiter.check()).toBe(false);

    vi.advanceTimersByTime(30_000);
    expect(limiter.check()).toBe(true);
  });
});
