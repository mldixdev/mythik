import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MythikRenderer } from '../src/MythikRenderer.js';
import { createMythik, RESERVED_PATHS } from 'mythik';
import type { Spec } from 'mythik';
import { registerReactPrimitives } from '../src/primitives/index.js';

const sampleData = [
  { id: 1, name: 'Alpha' },
  { id: 2, name: 'Beta' },
];

function makeSpec(onRowClick: unknown): Spec {
  return {
    root: 'root',
    elements: {
      root: {
        type: 'table',
        props: {
          data: sampleData,
          columns: [
            { id: 'id', label: 'ID' },
            { id: 'name', label: 'Name' },
          ],
          onRowClick,
        },
      },
    },
  } as unknown as Spec;
}

/** Build a MythikInstance with React primitives wired — mirrors makeInstance in dataSources-derive-integration.test.tsx */
function makeInstance(): ReturnType<typeof createMythik> {
  const instance = createMythik({});
  registerReactPrimitives(instance.plugins);
  return instance;
}

/** Wait for MythikRenderer's scheduled store subscription rerender to settle. */
async function flushRenderer(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('onRowClick spec-driven wiring (integration)', () => {
  it('single ActionBinding fires action with row written to /ui/selectedRow', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();
    const dispatched: Array<{ action: string; params?: unknown }> = [];
    instance.plugins.registerAction({
      name: 'captureRow',
      handler: async (params, setState, getState) => {
        dispatched.push({ action: 'captureRow', params });
        setState('/captured', { row: getState(RESERVED_PATHS.SELECTED_ROW), params });
      },
    });
    instance.applyPlugins();

    const spec = makeSpec({ action: 'captureRow', params: { extra: 'meta' } });
    render(<MythikRenderer spec={spec} instance={instance} />);

    const rows = screen.getAllByTestId('data-row');
    await user.click(rows[0]);
    await flushRenderer();

    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].action).toBe('captureRow');
    const captured = instance.store.get('/captured') as { row: unknown; params: unknown };
    expect(captured.row).toEqual(sampleData[0]);
    expect(instance.store.get(RESERVED_PATHS.SELECTED_ROW)).toEqual(sampleData[0]);
  });

  it('ActionBinding array fires actions in order', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();
    const calls: string[] = [];
    instance.plugins.registerAction({ name: 'first', handler: async () => { calls.push('first'); } });
    instance.plugins.registerAction({ name: 'second', handler: async () => { calls.push('second'); } });
    instance.plugins.registerAction({ name: 'third', handler: async () => { calls.push('third'); } });
    instance.applyPlugins();

    const spec = makeSpec([
      { action: 'first' },
      { action: 'second' },
      { action: 'third' },
    ]);
    render(<MythikRenderer spec={spec} instance={instance} />);

    const rows = screen.getAllByTestId('data-row');
    await user.click(rows[0]);
    await flushRenderer();

    expect(calls).toEqual(['first', 'second', 'third']);
  });

  it('clicking different rows updates /ui/selectedRow each time', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();
    instance.plugins.registerAction({ name: 'noop', handler: async () => {} });
    instance.applyPlugins();

    const spec = makeSpec([{ action: 'noop' }]);
    render(<MythikRenderer spec={spec} instance={instance} />);

    const rows = screen.getAllByTestId('data-row');
    await user.click(rows[0]);
    await flushRenderer();
    expect(instance.store.get(RESERVED_PATHS.SELECTED_ROW)).toEqual(sampleData[0]);

    await user.click(rows[1]);
    await flushRenderer();
    expect(instance.store.get(RESERVED_PATHS.SELECTED_ROW)).toEqual(sampleData[1]);
  });

  it('action params with $state /ui/selectedRow/id resolve at click time (lazy)', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();
    let capturedId: unknown = null;
    instance.plugins.registerAction({
      name: 'captureId',
      handler: async (params) => {
        capturedId = (params as { id: unknown }).id;
      },
    });
    instance.applyPlugins();

    const spec = makeSpec([
      { action: 'captureId', params: { id: { $state: '/ui/selectedRow/id' } } },
    ]);
    render(<MythikRenderer spec={spec} instance={instance} />);

    const rows = screen.getAllByTestId('data-row');
    await user.click(rows[1]);
    await flushRenderer();

    expect(capturedId).toBe(2);
    // Document the write-before-dispatch ordering: the row was written to
    // /ui/selectedRow synchronously before the action's $state was resolved.
    expect(instance.store.get(RESERVED_PATHS.SELECTED_ROW)).toEqual(sampleData[1]);
  });

  it('no onRowClick — clicking row does not write /ui/selectedRow', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();
    instance.applyPlugins();

    const spec = makeSpec(undefined);
    render(<MythikRenderer spec={spec} instance={instance} />);

    const rows = screen.getAllByTestId('data-row');
    await user.click(rows[0]);
    await flushRenderer();

    expect(instance.store.get(RESERVED_PATHS.SELECTED_ROW)).toBeUndefined();
  });

  it('error in action handler is logged but does not crash', async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const instance = makeInstance();
    instance.plugins.registerAction({
      name: 'throws',
      handler: async () => {
        throw new Error('test failure');
      },
    });
    instance.applyPlugins();

    const spec = makeSpec([{ action: 'throws' }]);
    render(<MythikRenderer spec={spec} instance={instance} />);

    const rows = screen.getAllByTestId('data-row');
    await user.click(rows[0]);
    await flushRenderer();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('programmatic function callback still works alongside spec-driven mode', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();
    const fn = vi.fn();
    instance.applyPlugins();

    const spec = makeSpec(fn);
    render(<MythikRenderer spec={spec} instance={instance} />);

    const rows = screen.getAllByTestId('data-row');
    await user.click(rows[0]);

    expect(fn).toHaveBeenCalledWith(sampleData[0]);
    expect(instance.store.get(RESERVED_PATHS.SELECTED_ROW)).toBeUndefined();
  });

  it('writes to /ui/selectedRow do not invalidate render cache (lazy path scanDeps)', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();
    instance.plugins.registerAction({
      name: 'noop',
      handler: async () => {},
    });
    instance.applyPlugins();

    const spec = makeSpec([{ action: 'noop' }]);

    // Verify render-cache stability via DOM content: if /ui/selectedRow were
    // a render-time dep, writing it would trigger a re-render and rows could
    // reflect the new value. Stable DOM = scanDeps correctly skipped the
    // lazy onRowClick subtree (no /ui/selectedRow dep registered for table).
    render(<MythikRenderer spec={spec} instance={instance} />);

    // Initial render — table renders 2 rows
    let rows = screen.getAllByTestId('data-row');
    expect(rows.length).toBe(2);

    // Click first row → /ui/selectedRow set
    await user.click(rows[0]);
    await flushRenderer();
    expect(instance.store.get(RESERVED_PATHS.SELECTED_ROW)).toEqual(sampleData[0]);

    // Manually write /ui/selectedRow again — this should not trigger a re-render
    // because the lazy path means scanDeps did not include /ui/selectedRow as a dep
    await act(async () => {
      instance.store.set(RESERVED_PATHS.SELECTED_ROW, { id: 99, name: 'forced' });
      await new Promise((r) => setTimeout(r, 0));
    });

    // Table still renders the same 2 data rows (no spec change, no re-render needed)
    rows = screen.getAllByTestId('data-row');
    expect(rows.length).toBe(2);
    // Data unchanged in DOM (sample data still rendered, not the manually-set row)
    expect(rows[0].textContent).toContain('Alpha');
    expect(rows[1].textContent).toContain('Beta');
  });
});
