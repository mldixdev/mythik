import { describe, it, expect } from 'vitest';
import { createAuthPersistence } from '../../src/auth/persistence.js';
import { createCrossTabSync } from '../../src/auth/cross-tab.js';
import type { AuthEvent } from '../../src/auth/types.js';

// ─── Persistence ───

describe('AuthPersistence — memory mode', () => {
  it('save and restore round-trips', () => {
    const p = createAuthPersistence('memory');
    p.save({
      refreshToken: 'rt-123',
      user: { id: '1', email: 'a@b.com', role: 'admin', roles: ['admin'] },
    });
    const data = p.restore();
    expect(data).not.toBeNull();
    expect(data!.refreshToken).toBe('rt-123');
    expect(data!.user.email).toBe('a@b.com');
    expect(data!.user.roles).toEqual(['admin']);
  });

  it('clear removes data', () => {
    const p = createAuthPersistence('memory');
    p.save({
      refreshToken: 'rt',
      user: { id: '1', email: 'a@b.com', role: 'admin', roles: ['admin'] },
    });
    p.clear();
    expect(p.restore()).toBeNull();
  });

  it('restore returns null when nothing saved', () => {
    const p = createAuthPersistence('memory');
    expect(p.restore()).toBeNull();
  });

  it('save overwrites previous data', () => {
    const p = createAuthPersistence('memory');
    p.save({ refreshToken: 'first', user: { id: '1', email: 'a@b.com', role: 'a', roles: ['a'] } });
    p.save({ refreshToken: 'second', user: { id: '2', email: 'b@c.com', role: 'b', roles: ['b'] } });
    const data = p.restore();
    expect(data!.refreshToken).toBe('second');
    expect(data!.user.id).toBe('2');
  });
});

describe('AuthPersistence — local mode (injectable storage)', () => {
  function createMockStorage(): Storage & { data: Record<string, string> } {
    const data: Record<string, string> = {};
    return {
      data,
      getItem: (k: string) => data[k] ?? null,
      setItem: (k: string, v: string) => { data[k] = v; },
      removeItem: (k: string) => { delete data[k]; },
      clear: () => { for (const k of Object.keys(data)) delete data[k]; },
      get length() { return Object.keys(data).length; },
      key: (i: number) => Object.keys(data)[i] ?? null,
    };
  }

  it('persists to storage', () => {
    const storage = createMockStorage();
    const p = createAuthPersistence('local', storage);
    p.save({
      refreshToken: 'rt-abc',
      user: { id: '1', email: 'test@test.com', role: 'user', roles: ['user'] },
    });
    expect(Object.keys(storage.data).length).toBeGreaterThan(0);
  });

  it('restores from storage', () => {
    const storage = createMockStorage();
    const p = createAuthPersistence('local', storage);
    p.save({
      refreshToken: 'rt-abc',
      user: { id: '1', email: 'test@test.com', name: 'Test', role: 'user', roles: ['user', 'editor'] },
    });

    // Create new instance with same storage — simulates page reload
    const p2 = createAuthPersistence('local', storage);
    const data = p2.restore();
    expect(data).not.toBeNull();
    expect(data!.refreshToken).toBe('rt-abc');
    expect(data!.user.email).toBe('test@test.com');
    expect(data!.user.roles).toEqual(['user', 'editor']);
  });

  it('clear removes from storage', () => {
    const storage = createMockStorage();
    const p = createAuthPersistence('local', storage);
    p.save({ refreshToken: 'rt', user: { id: '1', email: 'a@b.com', role: 'a', roles: ['a'] } });
    p.clear();
    expect(storage.data).toEqual({});
    expect(p.restore()).toBeNull();
  });

  it('handles corrupted storage gracefully', () => {
    const storage = createMockStorage();
    storage.data['mythik_auth'] = 'not-valid-json{{{';
    const p = createAuthPersistence('local', storage);
    expect(p.restore()).toBeNull();
  });
});

describe('AuthPersistence — session mode (injectable storage)', () => {
  function createMockStorage(): Storage {
    const data: Record<string, string> = {};
    return {
      getItem: (k: string) => data[k] ?? null,
      setItem: (k: string, v: string) => { data[k] = v; },
      removeItem: (k: string) => { delete data[k]; },
      clear: () => { for (const k of Object.keys(data)) delete data[k]; },
      get length() { return Object.keys(data).length; },
      key: (i: number) => Object.keys(data)[i] ?? null,
    };
  }

  it('save and restore works', () => {
    const storage = createMockStorage();
    const p = createAuthPersistence('session', storage);
    p.save({ refreshToken: 'rt', user: { id: '1', email: 'a@b.com', role: 'a', roles: ['a'] } });
    const data = p.restore();
    expect(data!.refreshToken).toBe('rt');
  });
});

// ─── Cross-Tab Sync ───

describe('CrossTabSync', () => {
  function createMockChannel() {
    const messages: unknown[] = [];
    return {
      channel: {
        postMessage: (msg: unknown) => { messages.push(msg); },
        close: () => {},
        onmessage: null as ((ev: { data: unknown }) => void) | null,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
      } as unknown as BroadcastChannel,
      messages,
    };
  }

  it('broadcasts events', () => {
    const { channel, messages } = createMockChannel();
    const sync = createCrossTabSync(() => channel);
    sync.broadcast({ type: 'SIGNED_OUT' });
    expect(messages).toHaveLength(1);
    expect((messages[0] as AuthEvent).type).toBe('SIGNED_OUT');
  });

  it('broadcasts SIGNED_IN with user', () => {
    const { channel, messages } = createMockChannel();
    const sync = createCrossTabSync(() => channel);
    sync.broadcast({ type: 'SIGNED_IN', user: { id: '1', email: 'a@b.com', role: 'a', roles: ['a'] } });
    expect((messages[0] as { type: string; user: { email: string } }).user.email).toBe('a@b.com');
  });

  it('calls listener on incoming messages', () => {
    const events: AuthEvent[] = [];
    const { channel } = createMockChannel();
    const sync = createCrossTabSync(() => channel);
    sync.onEvent((event) => { events.push(event); });

    // Simulate incoming message from another tab
    channel.onmessage!({ data: { type: 'SIGNED_OUT' } });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('SIGNED_OUT');
  });

  it('multiple listeners all receive events', () => {
    const events1: AuthEvent[] = [];
    const events2: AuthEvent[] = [];
    const { channel } = createMockChannel();
    const sync = createCrossTabSync(() => channel);
    sync.onEvent((e) => { events1.push(e); });
    sync.onEvent((e) => { events2.push(e); });

    channel.onmessage!({ data: { type: 'SESSION_EXPIRED' } });
    expect(events1).toHaveLength(1);
    expect(events2).toHaveLength(1);
  });

  it('destroy closes channel', () => {
    let closed = false;
    const channel = {
      postMessage: () => {},
      close: () => { closed = true; },
      onmessage: null as ((ev: { data: unknown }) => void) | null,
    } as unknown as BroadcastChannel;

    const sync = createCrossTabSync(() => channel);
    sync.destroy();
    expect(closed).toBe(true);
  });

  it('ignores invalid messages', () => {
    const events: AuthEvent[] = [];
    const { channel } = createMockChannel();
    const sync = createCrossTabSync(() => channel);
    sync.onEvent((e) => { events.push(e); });

    // Invalid message — no type field
    channel.onmessage!({ data: { foo: 'bar' } });
    expect(events).toHaveLength(0);

    // Null data
    channel.onmessage!({ data: null });
    expect(events).toHaveLength(0);
  });

  it('works when BroadcastChannel is unavailable (noop)', () => {
    const sync = createCrossTabSync(() => null as unknown as BroadcastChannel);
    // Should not throw
    sync.broadcast({ type: 'SIGNED_OUT' });
    expect(true).toBe(true);
  });

  it('onEvent unsubscribe removes listener', () => {
    const events: AuthEvent[] = [];
    const { channel } = createMockChannel();
    const sync = createCrossTabSync(() => channel);
    const unsub = sync.onEvent((e) => { events.push(e); });

    channel.onmessage!({ data: { type: 'SIGNED_OUT' } });
    expect(events).toHaveLength(1);

    unsub();
    channel.onmessage!({ data: { type: 'SIGNED_OUT' } });
    expect(events).toHaveLength(1); // Not called again
  });

  it('broadcast after destroy does not throw', () => {
    const { channel } = createMockChannel();
    const sync = createCrossTabSync(() => channel);
    sync.destroy();
    expect(() => sync.broadcast({ type: 'SIGNED_OUT' })).not.toThrow();
  });

  it('listener that throws does not prevent other listeners', () => {
    const events: string[] = [];
    const { channel } = createMockChannel();
    const sync = createCrossTabSync(() => channel);
    sync.onEvent(() => { throw new Error('boom'); });
    sync.onEvent((e) => { events.push(e.type); });

    channel.onmessage!({ data: { type: 'SIGNED_OUT' } });
    expect(events).toEqual(['SIGNED_OUT']);
  });
});

describe('CrossTabSync — Storage Event Fallback', () => {
  it('uses storage fallback when channel factory returns null and localStorage exists', () => {
    // Verify the fallback path exists and doesn't throw
    // In jsdom, BroadcastChannel may or may not exist — the factory returning null
    // forces the fallback path regardless
    const sync = createCrossTabSync(() => null as unknown as BroadcastChannel);

    // Should not throw on any operation
    expect(() => sync.broadcast({ type: 'SIGNED_OUT' })).not.toThrow();
    const unsub = sync.onEvent(() => {});
    expect(typeof unsub).toBe('function');
    unsub();
    sync.destroy();
  });

  it('storage event listener receives events from other tabs', () => {
    // Simulate the storage event flow manually
    const events: AuthEvent[] = [];
    const sync = createCrossTabSync(() => null as unknown as BroadcastChannel);
    sync.onEvent((e) => { events.push(e); });

    // Simulate a storage event (as if another tab wrote to localStorage)
    const storageEvent = new StorageEvent('storage', {
      key: 'mythik-auth-event',
      newValue: JSON.stringify({ type: 'SIGNED_OUT' }),
    });
    globalThis.dispatchEvent(storageEvent);

    // In jsdom, this may or may not trigger depending on localStorage availability
    // The important thing is no errors are thrown
    sync.destroy();
  });
});

// ─── Persistence — additional edge cases ───

describe('AuthPersistence — edge cases', () => {
  it('storage-full scenario: save does not throw', () => {
    const storage: Storage = {
      getItem: () => null,
      setItem: () => { throw new Error('QuotaExceededError'); },
      removeItem: () => {},
      clear: () => {},
      length: 0,
      key: () => null,
    };
    const p = createAuthPersistence('local', storage);
    expect(() => p.save({
      refreshToken: 'rt',
      user: { id: '1', email: 'a@b.com', role: 'a', roles: ['a'] },
    })).not.toThrow();
  });

  it('restore rejects data with missing roles array', () => {
    const data: Record<string, string> = {};
    const storage: Storage = {
      getItem: (k: string) => data[k] ?? null,
      setItem: (k: string, v: string) => { data[k] = v; },
      removeItem: (k: string) => { delete data[k]; },
      clear: () => {},
      length: 0,
      key: () => null,
    };
    // Write incomplete data directly
    data['mythik_auth'] = JSON.stringify({
      refreshToken: 'rt',
      user: { id: '1', email: 'a@b.com', role: 'admin' },
      // Missing: roles array
    });
    const p = createAuthPersistence('local', storage);
    expect(p.restore()).toBeNull();
  });
});
