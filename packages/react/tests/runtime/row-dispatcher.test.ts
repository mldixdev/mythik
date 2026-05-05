import { describe, it, expect, vi } from 'vitest';
import { createStateStore, RESERVED_PATHS } from 'mythik';
import type { EventBinding } from 'mythik';
import { createRowDispatcher } from '../../src/runtime/row-dispatcher.js';

describe('createRowDispatcher', () => {
  it('returns a function', () => {
    const store = createStateStore();
    const dispatch = vi.fn();
    const rowDispatch = createRowDispatcher(store, dispatch);
    expect(typeof rowDispatch).toBe('function');
  });

  it('writes row to /ui/selectedRow before dispatching', () => {
    const store = createStateStore();
    const dispatch = vi.fn(() => {
      // At dispatch time, the row must already be in store
      expect(store.get(RESERVED_PATHS.SELECTED_ROW)).toEqual({ id: 1, name: 'foo' });
    });
    const rowDispatch = createRowDispatcher(store, dispatch);
    rowDispatch({ action: 'noop' } as EventBinding, { id: 1, name: 'foo' });
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('writes row to custom rowPath when provided', () => {
    const store = createStateStore();
    const dispatch = vi.fn();
    const rowDispatch = createRowDispatcher(store, dispatch, '/ui/customRow');
    rowDispatch({ action: 'noop' } as EventBinding, { id: 2 });
    expect(store.get('/ui/customRow')).toEqual({ id: 2 });
    expect(store.get(RESERVED_PATHS.SELECTED_ROW)).toBeUndefined();
  });

  it('dispatches single ActionBinding once', () => {
    const store = createStateStore();
    const dispatch = vi.fn();
    const rowDispatch = createRowDispatcher(store, dispatch);
    const binding = { action: 'openDrawer', params: { id: 'detail' } } as EventBinding;
    rowDispatch(binding, { id: 1 });
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(binding);
  });

  it('passes ActionBinding arrays through as one binding after writing row', () => {
    const store = createStateStore();
    const dispatch = vi.fn((b: EventBinding) => {
      expect(store.get(RESERVED_PATHS.SELECTED_ROW)).toEqual({ id: 1 });
      expect(Array.isArray(b)).toBe(true);
    });
    const rowDispatch = createRowDispatcher(store, dispatch);
    const bindings = [
      { action: 'first' },
      { action: 'second' },
      { action: 'third' },
    ] as unknown as EventBinding;
    rowDispatch(bindings, { id: 1 });
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(bindings);
  });

  it('passes TransactionBinding through unchanged', () => {
    const store = createStateStore();
    const dispatch = vi.fn();
    const rowDispatch = createRowDispatcher(store, dispatch);
    const txBinding = { transaction: { steps: [] } } as unknown as EventBinding;
    rowDispatch(txBinding, { id: 1 });
    expect(dispatch).toHaveBeenCalledWith(txBinding);
  });

  it('writes row but does not call dispatch when binding is undefined', () => {
    const store = createStateStore();
    const dispatch = vi.fn();
    const rowDispatch = createRowDispatcher(store, dispatch);
    rowDispatch(undefined, { id: 1 });
    expect(store.get(RESERVED_PATHS.SELECTED_ROW)).toEqual({ id: 1 });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('dispatches binding but does not write row when row is undefined', () => {
    const store = createStateStore();
    const dispatch = vi.fn();
    const rowDispatch = createRowDispatcher(store, dispatch);
    rowDispatch({ action: 'noop' } as EventBinding, undefined);
    expect(store.get(RESERVED_PATHS.SELECTED_ROW)).toBeUndefined();
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('preserves legacy falsy-row behavior when row is null', () => {
    const store = createStateStore();
    const dispatch = vi.fn();
    const rowDispatch = createRowDispatcher(store, dispatch);

    rowDispatch({ action: 'noop' } as EventBinding, null as unknown as Record<string, unknown>);

    expect(store.get(RESERVED_PATHS.SELECTED_ROW)).toBeUndefined();
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('passes empty arrays through so the dispatcher owns no-op semantics', () => {
    const store = createStateStore();
    const dispatch = vi.fn();
    const rowDispatch = createRowDispatcher(store, dispatch);
    rowDispatch([], { id: 1 });
    expect(store.get(RESERVED_PATHS.SELECTED_ROW)).toEqual({ id: 1 });
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith([]);
  });
});
