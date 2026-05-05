import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMythik } from 'mythik';
import type { Spec } from 'mythik';
import { MythikRenderer } from '../src/MythikRenderer.js';
import { registerReactPrimitives } from '../src/primitives/index.js';

const itemsPath = '/layout/items';
const zonesPath = '/layout/zones';
const itemChangePath = '/ui/spatialItemChange';
const sessionPath = '/ui/editorSessions/floor-layout';

function makeInstance(): ReturnType<typeof createMythik> {
  const instance = createMythik({});
  registerReactPrimitives(instance.plugins);
  instance.store.set(itemsPath, [
    {
      id: 'item-1',
      label: 'A1',
      position: { x: 120, y: 100 },
      shape: { type: 'rect', width: 80, height: 48, radius: 8 },
      status: 'available',
    },
  ]);
  instance.store.set(zonesPath, []);
  instance.applyPlugins();
  return instance;
}

/** Wait for MythikRenderer's scheduled store subscription rAF plus queued async dispatches. */
async function flushRenderer(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function mockSvgClientRect(svg: Element): void {
  Object.defineProperty(svg, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 400,
      height: 240,
      right: 400,
      bottom: 240,
      toJSON: () => {},
    }),
  });
}

function dragItem(from: { x: number; y: number }, to: { x: number; y: number }): void {
  const item = screen.getByTestId('spatial-item-item-1');
  const svg = screen.getByLabelText('Spatial map');
  mockSvgClientRect(svg);
  fireEvent.pointerDown(item, { pointerId: 1, clientX: from.x, clientY: from.y });
  fireEvent.pointerMove(document, { pointerId: 1, clientX: to.x, clientY: to.y });
  fireEvent.pointerUp(document, { pointerId: 1, clientX: to.x, clientY: to.y });
}

const commitMovedItemAction = {
  action: 'editorCommit',
  params: {
    session: 'floor-layout',
    label: 'Move item',
    changes: [
      {
        path: itemsPath,
        value: {
          $array: 'replace',
          source: { $state: itemsPath },
          where: { field: 'id', eq: { $state: `${itemChangePath}/itemId` } },
          value: { $state: `${itemChangePath}/nextItem` },
        },
      },
    ],
  },
};

function makeSpec(): Spec {
  return {
    root: 'app',
    editorSessions: {
      'floor-layout': {
        paths: [itemsPath, zonesPath],
        maxHistory: 20,
        persistence: { url: '/api/floor-layout', method: 'PUT' },
      },
    },
    elements: {
      app: {
        type: 'stack',
        children: ['map', 'undoButton', 'redoButton', 'markSavedButton'],
      },
      map: {
        type: 'spatial-map',
        props: {
          ariaLabel: 'Spatial map',
          viewBox: { x: 0, y: 0, width: 400, height: 240 },
          mode: 'edit',
          items: { $state: itemsPath },
          zones: { $state: zonesPath },
          itemChangePath,
          editPolicy: {
            dragItems: true,
            keyboardMoveItems: true,
            bounds: 'viewBox',
            coordinatePrecision: 0,
          },
          onItemChange: commitMovedItemAction,
        },
      },
      undoButton: {
        type: 'button',
        props: { label: 'Undo' },
        on: { press: { action: 'editorUndo', params: { session: 'floor-layout' } } },
      },
      redoButton: {
        type: 'button',
        props: { label: 'Redo' },
        on: { press: { action: 'editorRedo', params: { session: 'floor-layout' } } },
      },
      markSavedButton: {
        type: 'button',
        props: { label: 'Save layout' },
        on: { press: { action: 'editorSave', params: { session: 'floor-layout' } } },
      },
    },
  } as unknown as Spec;
}

describe('editor session spatial JSON composition', () => {
  it('commits spatial item changes through editorCommit and supports undo redo', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    render(<MythikRenderer spec={makeSpec()} instance={instance} fetcher={fetcher} />);
    await flushRenderer();

    expect(instance.store.get(`${sessionPath}/dirty`)).toBe(false);
    expect(instance.store.get(`${sessionPath}/canUndo`)).toBe(false);

    dragItem({ x: 120, y: 100 }, { x: 150, y: 120 });
    await waitFor(() => {
      expect(instance.store.get(`${itemsPath}/0/position`)).toEqual({ x: 150, y: 120 });
    });

    expect(instance.store.get(itemChangePath)).toMatchObject({
      changeType: 'move',
      itemId: 'item-1',
      nextItem: { id: 'item-1', position: { x: 150, y: 120 } },
    });
    expect(instance.store.get(`${sessionPath}/dirty`)).toBe(true);
    expect(instance.store.get(`${sessionPath}/canUndo`)).toBe(true);
    expect(instance.store.get(`${sessionPath}/canRedo`)).toBe(false);
    expect(instance.store.get(`${sessionPath}/lastCommitLabel`)).toBe('Move item');

    await user.click(screen.getByText('Undo'));
    await waitFor(() => {
      expect(instance.store.get(`${itemsPath}/0/position`)).toEqual({ x: 120, y: 100 });
    });
    expect(instance.store.get(`${sessionPath}/dirty`)).toBe(false);
    expect(instance.store.get(`${sessionPath}/canUndo`)).toBe(false);
    expect(instance.store.get(`${sessionPath}/canRedo`)).toBe(true);
    expect(instance.store.get(`${sessionPath}/lastCommitLabel`)).toBeNull();

    await user.click(screen.getByText('Redo'));
    await waitFor(() => {
      expect(instance.store.get(`${itemsPath}/0/position`)).toEqual({ x: 150, y: 120 });
    });
    expect(instance.store.get(`${sessionPath}/dirty`)).toBe(true);
    expect(instance.store.get(`${sessionPath}/canUndo`)).toBe(true);
    expect(instance.store.get(`${sessionPath}/canRedo`)).toBe(false);
    expect(instance.store.get(`${sessionPath}/lastCommitLabel`)).toBe('Move item');

    await user.click(screen.getByText('Save layout'));
    await waitFor(() => {
      expect(instance.store.get(`${sessionPath}/dirty`)).toBe(false);
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetcher.mock.calls[0][1]?.body as string)).toEqual({
      layout: {
        items: [
          {
            id: 'item-1',
            label: 'A1',
            position: { x: 150, y: 120 },
            shape: { type: 'rect', width: 80, height: 48, radius: 8 },
            status: 'available',
          },
        ],
        zones: [],
      },
    });
    expect(instance.store.get(`${sessionPath}/savedRevision`)).toBe(instance.store.get(`${sessionPath}/revision`));
  });
});
