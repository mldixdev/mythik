import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRefreshStore } from '../../src/auth/refresh-store.js';

describe('RefreshStore', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('stores and retrieves username by token', () => {
    const store = createRefreshStore(60);
    store.store('sample-user', 'token-abc');
    expect(store.getUsername('token-abc')).toBe('sample-user');
  });

  it('returns null for unknown token', () => {
    const store = createRefreshStore(60);
    expect(store.getUsername('nonexistent')).toBeNull();
  });

  it('revokes a token', () => {
    const store = createRefreshStore(60);
    store.store('sample-user', 'token-abc');
    store.revoke('token-abc');
    expect(store.getUsername('token-abc')).toBeNull();
  });

  it('expires tokens after TTL', () => {
    const store = createRefreshStore(1); // 1 minute TTL
    store.store('sample-user', 'token-abc');
    expect(store.getUsername('token-abc')).toBe('sample-user');

    vi.advanceTimersByTime(2 * 60 * 1000); // 2 minutes
    expect(store.getUsername('token-abc')).toBeNull();
  });

  it('cleans expired tokens on store()', () => {
    const store = createRefreshStore(1);
    store.store('user1', 'token-1');

    vi.advanceTimersByTime(2 * 60 * 1000);
    store.store('user2', 'token-2'); // triggers cleanup

    expect(store.getUsername('token-1')).toBeNull();
    expect(store.getUsername('token-2')).toBe('user2');
  });

  it('generates a random refresh token', () => {
    const store = createRefreshStore(60);
    const token1 = store.generateToken();
    const token2 = store.generateToken();
    expect(token1).toBeTruthy();
    expect(token2).toBeTruthy();
    expect(token1).not.toBe(token2);
    expect(token1.length).toBeGreaterThan(32);
  });
});
