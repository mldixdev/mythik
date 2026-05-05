import { describe, it, expect, beforeEach } from 'vitest';
import { createStateStore } from '../../src/state/store.js';

describe('StateStore', () => {
  let store: ReturnType<typeof createStateStore>;

  beforeEach(() => {
    store = createStateStore({
      user: { name: 'Alice', age: 30 },
      form: { email: '', valid: false },
      items: [
        { id: 1, title: 'Task A' },
        { id: 2, title: 'Task B' },
      ],
    });
  });

  describe('get', () => {
    it('returns root state with empty path', () => {
      const state = store.get('');
      expect(state).toEqual({
        user: { name: 'Alice', age: 30 },
        form: { email: '', valid: false },
        items: [
          { id: 1, title: 'Task A' },
          { id: 2, title: 'Task B' },
        ],
      });
    });

    it('reads a top-level path', () => {
      expect(store.get('/user')).toEqual({ name: 'Alice', age: 30 });
    });

    it('reads a nested path', () => {
      expect(store.get('/user/name')).toBe('Alice');
    });

    it('reads an array item by index', () => {
      expect(store.get('/items/0/title')).toBe('Task A');
    });

    it('returns undefined for non-existent path', () => {
      expect(store.get('/user/missing')).toBeUndefined();
    });

    it('returns undefined for deep non-existent path', () => {
      expect(store.get('/a/b/c/d')).toBeUndefined();
    });
  });

  describe('set', () => {
    it('sets a top-level path', () => {
      store.set('/form', { email: 'test@test.com', valid: true });
      expect(store.get('/form/email')).toBe('test@test.com');
      expect(store.get('/form/valid')).toBe(true);
    });

    it('sets a nested path', () => {
      store.set('/user/name', 'Bob');
      expect(store.get('/user/name')).toBe('Bob');
      expect(store.get('/user/age')).toBe(30);
    });

    it('sets an array item', () => {
      store.set('/items/0/title', 'Updated Task');
      expect(store.get('/items/0/title')).toBe('Updated Task');
      expect(store.get('/items/1/title')).toBe('Task B');
    });

    it('creates intermediate objects for new paths', () => {
      store.set('/settings/theme/mode', 'dark');
      expect(store.get('/settings/theme/mode')).toBe('dark');
    });
  });

  describe('subscribe', () => {
    it('calls listener when any state changes', () => {
      const calls: unknown[] = [];
      store.subscribe((state) => calls.push(state));
      store.set('/user/name', 'Bob');
      expect(calls.length).toBe(1);
    });

    it('returns unsubscribe function', () => {
      const calls: unknown[] = [];
      const unsub = store.subscribe((state) => calls.push(state));
      store.set('/user/name', 'Bob');
      unsub();
      store.set('/user/name', 'Charlie');
      expect(calls.length).toBe(1);
    });
  });

  describe('subscribePath', () => {
    it('calls listener only when specific path changes', () => {
      const calls: unknown[] = [];
      store.subscribePath('/user/name', (value) => calls.push(value));
      store.set('/user/name', 'Bob');
      store.set('/form/email', 'test@test.com');
      expect(calls.length).toBe(1);
      expect(calls[0]).toBe('Bob');
    });

    it('does not fire if value is the same reference', () => {
      const calls: unknown[] = [];
      store.subscribePath('/user/name', (value) => calls.push(value));
      store.set('/user/name', 'Alice');
      expect(calls.length).toBe(0);
    });
  });

  describe('getSnapshot', () => {
    it('returns the full state object', () => {
      const snapshot = store.getSnapshot();
      expect(snapshot.user).toEqual({ name: 'Alice', age: 30 });
    });
  });
});
