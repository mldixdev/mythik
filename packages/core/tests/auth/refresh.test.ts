import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRefreshEngine } from '../../src/auth/refresh-engine.js';

describe('RefreshEngine — Mutex', () => {
  it('single refresh returns new token', async () => {
    const engine = createRefreshEngine({
      doRefresh: async () => 'new-token',
    });
    const result = await engine.requestRefresh();
    expect(result).toBe('new-token');
  });

  it('mutex prevents concurrent refreshes — only 1 actual call', async () => {
    let refreshCount = 0;
    const engine = createRefreshEngine({
      doRefresh: async () => {
        refreshCount++;
        await new Promise(r => setTimeout(r, 50));
        return `token-${refreshCount}`;
      },
    });

    const results = await Promise.all([
      engine.requestRefresh(),
      engine.requestRefresh(),
      engine.requestRefresh(),
      engine.requestRefresh(),
      engine.requestRefresh(),
    ]);

    expect(refreshCount).toBe(1);
    expect(results.every(r => r === 'token-1')).toBe(true);
  });

  it('second batch after first completes makes a new call', async () => {
    let refreshCount = 0;
    const engine = createRefreshEngine({
      doRefresh: async () => {
        refreshCount++;
        return `token-${refreshCount}`;
      },
    });

    const first = await engine.requestRefresh();
    expect(first).toBe('token-1');
    expect(refreshCount).toBe(1);

    const second = await engine.requestRefresh();
    expect(second).toBe('token-2');
    expect(refreshCount).toBe(2);
  });

  it('returns null when refresh fails', async () => {
    const engine = createRefreshEngine({
      doRefresh: async () => { throw new Error('expired'); },
    });
    const result = await engine.requestRefresh();
    expect(result).toBeNull();
  });

  it('all waiters get null when refresh fails', async () => {
    let callCount = 0;
    const engine = createRefreshEngine({
      doRefresh: async () => {
        callCount++;
        await new Promise(r => setTimeout(r, 30));
        throw new Error('expired');
      },
    });

    const results = await Promise.all([
      engine.requestRefresh(),
      engine.requestRefresh(),
      engine.requestRefresh(),
    ]);

    expect(callCount).toBe(1);
    expect(results.every(r => r === null)).toBe(true);
  });
});

describe('RefreshEngine — Proactive Scheduling', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('schedules proactive refresh at 80% of lifetime', () => {
    let refreshCalled = false;
    const engine = createRefreshEngine({
      doRefresh: async () => { refreshCalled = true; return 'new'; },
    });

    // 10s lifetime → refresh at 8000ms (80%)
    engine.scheduleProactive(10_000);
    expect(refreshCalled).toBe(false);

    vi.advanceTimersByTime(7999);
    expect(refreshCalled).toBe(false);

    vi.advanceTimersByTime(2);
    expect(refreshCalled).toBe(true);
  });

  it('cancelProactive stops scheduled refresh', () => {
    let refreshCalled = false;
    const engine = createRefreshEngine({
      doRefresh: async () => { refreshCalled = true; return 'new'; },
    });

    engine.scheduleProactive(10_000);
    engine.cancelProactive();

    vi.advanceTimersByTime(20_000);
    expect(refreshCalled).toBe(false);
  });

  it('scheduleProactive replaces previous schedule', () => {
    let callCount = 0;
    const engine = createRefreshEngine({
      doRefresh: async () => { callCount++; return 'new'; },
    });

    engine.scheduleProactive(10_000); // fires at 8000ms
    engine.scheduleProactive(20_000); // fires at 16000ms — replaces previous

    vi.advanceTimersByTime(9000);
    expect(callCount).toBe(0); // first schedule was cancelled

    vi.advanceTimersByTime(8000); // now at 17000ms
    expect(callCount).toBe(1); // second schedule fired at 16000ms
  });

  it('minimum schedule time is 5 seconds', () => {
    let refreshCalled = false;
    const engine = createRefreshEngine({
      doRefresh: async () => { refreshCalled = true; return 'new'; },
    });

    engine.scheduleProactive(100); // 100ms lifetime → would be 80ms, clamped to 5000ms

    vi.advanceTimersByTime(4999);
    expect(refreshCalled).toBe(false);

    vi.advanceTimersByTime(2);
    expect(refreshCalled).toBe(true);
  });
});
