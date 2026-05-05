import { describe, it, expect, vi } from 'vitest';
import { createStateStore } from 'mythik';
import type { EventBinding } from 'mythik';
import { createContextDispatcher } from '../../src/runtime/context-dispatcher.js';

describe('createContextDispatcher', () => {
  it('writes context before dispatching', () => {
    const store = createStateStore();
    const dispatch = vi.fn(() => {
      expect(store.get('/ui/context')).toEqual({ id: 'item-1' });
    });
    const contextDispatch = createContextDispatcher(store, dispatch, '/ui/context');

    contextDispatch({ action: 'capture' } as EventBinding, { id: 'item-1' });

    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('passes action arrays through as one binding after writing context', () => {
    const store = createStateStore();
    const dispatch = vi.fn((binding: EventBinding) => {
      expect(store.get('/ui/context')).toEqual({ id: 'item-1' });
      expect(Array.isArray(binding)).toBe(true);
    });
    const contextDispatch = createContextDispatcher(store, dispatch, '/ui/context');
    const actions = [
      { action: 'first' },
      { action: 'second' },
    ] as unknown as EventBinding;

    contextDispatch(actions, { id: 'item-1' });

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(actions);
    expect(store.get('/ui/context')).toEqual({ id: 'item-1' });
  });

  it('passes transaction bindings through unchanged', () => {
    const store = createStateStore();
    const dispatch = vi.fn();
    const contextDispatch = createContextDispatcher(store, dispatch, '/ui/context');
    const tx = { transaction: { confirm: [] } } as unknown as EventBinding;

    contextDispatch(tx, { id: 'item-1' });

    expect(dispatch).toHaveBeenCalledWith(tx);
  });

  it('writes context without dispatch when binding is undefined', () => {
    const store = createStateStore();
    const dispatch = vi.fn();
    const contextDispatch = createContextDispatcher(store, dispatch, '/ui/context');

    contextDispatch(undefined, { id: 'item-1' });

    expect(store.get('/ui/context')).toEqual({ id: 'item-1' });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('supports per-call context path override', () => {
    const store = createStateStore();
    const dispatch = vi.fn();
    const contextDispatch = createContextDispatcher(store, dispatch, '/ui/context');

    contextDispatch({ action: 'capture' } as EventBinding, { id: 'item-2' }, '/ui/otherContext');

    expect(store.get('/ui/context')).toBeUndefined();
    expect(store.get('/ui/otherContext')).toEqual({ id: 'item-2' });
  });
});
