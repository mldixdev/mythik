import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MythikRenderer } from '../src/MythikRenderer.js';
import { createMythik } from 'mythik';
import type { Spec } from 'mythik';
import { registerReactPrimitives } from '../src/primitives/index.js';

const selectedPath = '/ui/floorEditor/selectedItem';
const changePath = '/ui/floorEditor/itemChange';
const draftPath = '/ui/floorEditor/itemDraft';
const itemsPath = '/layout/items';
const zonesPath = '/layout/zones';

function makeZones(): Record<string, unknown>[] {
  return [
    { id: 'floor', label: 'Floor' },
    { id: 'patio', label: 'Patio' },
  ];
}

function makeItems(): Record<string, unknown>[] {
  return [
    {
      id: 'item-1',
      label: 'A1',
      zoneId: 'floor',
      position: { x: 120, y: 100 },
      rotation: 0,
      shape: { type: 'circle', radius: 36 },
      status: 'available',
      metadata: { capacity: 4, section: 'Main', keep: true },
      layer: 'items',
      ariaLabel: 'Table A1',
    },
    {
      id: 'item-2',
      label: 'A2',
      zoneId: 'floor',
      position: { x: 240, y: 100 },
      rotation: 8,
      shape: { type: 'rect', width: 80, height: 50, radius: 12 },
      status: 'available',
      metadata: { capacity: 2, section: 'Patio' },
    },
  ];
}

function makeInstance(): ReturnType<typeof createMythik> {
  const instance = createMythik({});
  registerReactPrimitives(instance.plugins);
  instance.store.set(zonesPath, makeZones());
  instance.store.set(itemsPath, makeItems());
  instance.applyPlugins();
  return instance;
}

/** Wait for MythikRenderer's scheduled store subscription rerender to settle. */
async function flushRenderer(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(resolve));
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

function dragSpecItem(testId: string, from: { x: number; y: number }, to: { x: number; y: number }): void {
  const item = screen.getByTestId(testId);
  const svg = screen.getByLabelText('Spatial map');
  mockSvgClientRect(svg);
  fireEvent.pointerDown(item, { pointerId: 1, clientX: from.x, clientY: from.y });
  fireEvent.pointerMove(document, { pointerId: 1, clientX: to.x, clientY: to.y });
  fireEvent.pointerUp(document, { pointerId: 1, clientX: to.x, clientY: to.y });
}

const persistMovedItemAction = {
  action: 'setState',
  params: {
    statePath: itemsPath,
    value: {
      $array: 'replace',
      source: { $state: itemsPath },
      where: { field: 'id', eq: { $state: `${changePath}/itemId` } },
      value: { $state: `${changePath}/nextItem` },
    },
  },
};

const syncDraftPositionAction = {
  action: 'setState',
  params: {
    statePath: `${draftPath}/position`,
    value: {
      $cond: { $state: `${changePath}/itemId`, eq: { $state: `${draftPath}/id` } },
      $then: { $state: `${changePath}/nextItem/position` },
      $else: { $state: `${draftPath}/position` },
    },
  },
};

const refreshSelectedMovedItemAction = {
  action: 'setState',
  params: {
    statePath: selectedPath,
    value: {
      kind: 'item',
      mode: 'edit',
      itemId: { $state: `${changePath}/itemId` },
      zoneId: { $state: `${changePath}/nextItem/zoneId` },
      status: { $state: `${changePath}/nextItem/status` },
      label: { $state: `${changePath}/nextItem/label` },
      position: { $state: `${changePath}/nextItem/position` },
      rotation: { $state: `${changePath}/nextItem/rotation` },
      shape: { $state: `${changePath}/nextItem/shape` },
      metadata: { $state: `${changePath}/nextItem/metadata` },
      item: { $state: `${changePath}/nextItem` },
      zone: {
        $array: 'find',
        source: { $state: zonesPath },
        where: { field: 'id', eq: { $state: `${changePath}/nextItem/zoneId` } },
      },
    },
  },
};

const normalizeDraftActions = [
  {
    action: 'setState',
    params: {
      statePath: `${draftPath}/position/x`,
      value: { $math: 'add', args: [{ $state: `${draftPath}/position/x` }, 0] },
    },
  },
  {
    action: 'setState',
    params: {
      statePath: `${draftPath}/position/y`,
      value: { $math: 'add', args: [{ $state: `${draftPath}/position/y` }, 0] },
    },
  },
  {
    action: 'setState',
    params: {
      statePath: `${draftPath}/rotation`,
      value: { $math: 'add', args: [{ $state: `${draftPath}/rotation` }, 0] },
    },
  },
  {
    action: 'setState',
    params: {
      statePath: `${draftPath}/metadata/capacity`,
      value: { $math: 'add', args: [{ $state: `${draftPath}/metadata/capacity` }, 0] },
    },
  },
];

const saveDraftActions = [
  ...normalizeDraftActions,
  {
    action: 'setState',
    params: {
      statePath: changePath,
      value: {
        kind: 'item-change',
        changeType: 'update',
        itemId: { $state: `${draftPath}/id` },
        previousItem: {
          $array: 'find',
          source: { $state: itemsPath },
          where: { field: 'id', eq: { $state: `${draftPath}/id` } },
        },
        nextItem: { $state: draftPath },
        item: { $state: draftPath },
      },
    },
  },
  {
    action: 'setState',
    params: {
      statePath: itemsPath,
      value: {
        $array: 'replace',
        source: { $state: itemsPath },
        where: { field: 'id', eq: { $state: `${changePath}/itemId` } },
        value: { $state: `${changePath}/nextItem` },
      },
    },
  },
  {
    action: 'setState',
    params: {
      statePath: selectedPath,
      value: {
        kind: 'item',
        mode: 'edit',
        itemId: { $state: `${draftPath}/id` },
        zoneId: { $state: `${draftPath}/zoneId` },
        status: { $state: `${draftPath}/status` },
        label: { $state: `${draftPath}/label` },
        position: { $state: `${draftPath}/position` },
        rotation: { $state: `${draftPath}/rotation` },
        shape: { $state: `${draftPath}/shape` },
        metadata: { $state: `${draftPath}/metadata` },
        item: { $state: draftPath },
        zone: {
          $array: 'find',
          source: { $state: zonesPath },
          where: { field: 'id', eq: { $state: `${draftPath}/zoneId` } },
        },
      },
    },
  },
];

const cancelDraftActions = [
  {
    action: 'setState',
    params: {
      statePath: draftPath,
      value: null,
    },
  },
  {
    action: 'setState',
    params: {
      statePath: selectedPath,
      value: null,
    },
  },
];

function makeInspectorSpec(): Spec {
  return {
    root: 'app',
    elements: {
      app: {
        type: 'stack',
        children: ['map', 'draftLabelInput', 'draftCapacityInput', 'saveButton', 'cancelButton'],
      },
      map: {
        type: 'spatial-map',
        props: {
          ariaLabel: 'Spatial map',
          viewBox: { x: 0, y: 0, width: 400, height: 240 },
          items: { $state: itemsPath },
          mode: 'edit',
          selectedItemPath: selectedPath,
          itemChangePath: changePath,
          interactionPolicy: {
            selectItems: true,
            activateItems: true,
            clearSelectionOnCanvasPress: true,
            keyboardNavigation: true,
          },
          editPolicy: {
            dragItems: true,
            keyboardMoveItems: true,
            bounds: 'viewBox',
            coordinatePrecision: 0,
          },
          onItemPress: {
            action: 'setState',
            params: {
              statePath: draftPath,
              value: { $state: `${selectedPath}/item` },
            },
          },
          onItemChange: [persistMovedItemAction, syncDraftPositionAction, refreshSelectedMovedItemAction],
        },
      },
      draftLabelInput: {
        type: 'input',
        props: { label: 'Label', value: { $bindState: `${draftPath}/label` } },
      },
      draftCapacityInput: {
        type: 'input',
        props: { label: 'Capacity', type: 'number', value: { $bindState: `${draftPath}/metadata/capacity` } },
      },
      saveButton: {
        type: 'button',
        props: { label: 'Save' },
        on: { press: saveDraftActions },
      },
      cancelButton: {
        type: 'button',
        props: { label: 'Cancel', variant: 'secondary' },
        on: { press: cancelDraftActions },
      },
    },
  } as unknown as Spec;
}

describe('spatial-map inspector JSON composition', () => {
  it('initializes a full item draft from explicit edit-mode item activation', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();

    render(<MythikRenderer spec={makeInspectorSpec()} instance={instance} />);
    await user.click(screen.getByTestId('spatial-item-item-1'));
    await flushRenderer();

    expect(instance.store.get(selectedPath)).toMatchObject({ itemId: 'item-1' });
    expect(instance.store.get(draftPath)).toMatchObject({
      id: 'item-1',
      label: 'A1',
      position: { x: 120, y: 100 },
      metadata: { capacity: 4, section: 'Main', keep: true },
      shape: { type: 'circle', radius: 36 },
    });
  });

  it('edits nested draft paths through $bindState inputs', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();

    render(<MythikRenderer spec={makeInspectorSpec()} instance={instance} />);
    await user.click(screen.getByTestId('spatial-item-item-1'));
    await flushRenderer();

    fireEvent.change(screen.getByDisplayValue('A1'), { target: { value: 'Mesa 1' } });
    fireEvent.change(screen.getByDisplayValue('4'), { target: { value: '8' } });
    await flushRenderer();

    expect(instance.store.get(draftPath)).toMatchObject({
      label: 'Mesa 1',
      metadata: { capacity: '8', section: 'Main', keep: true },
    });
  });

  it('does not mutate selected context when editing nested draft paths', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();

    render(<MythikRenderer spec={makeInspectorSpec()} instance={instance} />);
    await user.click(screen.getByTestId('spatial-item-item-1'));
    await flushRenderer();

    await act(async () => {
      instance.store.set(`${draftPath}/metadata/capacity`, 99);
      instance.store.set(`${draftPath}/position/x`, 150);
    });

    expect(instance.store.get(`${selectedPath}/item`)).toMatchObject({
      id: 'item-1',
      metadata: { capacity: 4, section: 'Main', keep: true },
      position: { x: 120, y: 100 },
    });
    expect(instance.store.get(draftPath)).toMatchObject({
      id: 'item-1',
      metadata: { capacity: 99, section: 'Main', keep: true },
      position: { x: 150, y: 100 },
    });
  });

  it('saves draft edits as an update change and preserves non-edited item fields', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();
    instance.store.set(selectedPath, { itemId: 'item-1' });
    instance.store.set(draftPath, {
      ...(makeItems()[0] as Record<string, unknown>),
      label: 'Mesa 1',
      status: 'occupied',
      zoneId: 'patio',
      position: { x: '144', y: '122' },
      rotation: '15',
      metadata: { capacity: '6', section: 'Main', keep: true },
    });

    render(<MythikRenderer spec={makeInspectorSpec()} instance={instance} />);
    await user.click(screen.getByText('Save'));
    await flushRenderer();

    expect(instance.store.get(changePath)).toMatchObject({
      kind: 'item-change',
      changeType: 'update',
      itemId: 'item-1',
      previousItem: { id: 'item-1', label: 'A1' },
      nextItem: {
        id: 'item-1',
        label: 'Mesa 1',
        status: 'occupied',
        zoneId: 'patio',
        position: { x: 144, y: 122 },
        rotation: 15,
        metadata: { capacity: 6, section: 'Main', keep: true },
        shape: { type: 'circle', radius: 36 },
        layer: 'items',
        ariaLabel: 'Table A1',
      },
    });

    expect(instance.store.get(itemsPath)).toMatchObject([
      {
        id: 'item-1',
        label: 'Mesa 1',
        status: 'occupied',
        zoneId: 'patio',
        position: { x: 144, y: 122 },
        rotation: 15,
        metadata: { capacity: 6, section: 'Main', keep: true },
        shape: { type: 'circle', radius: 36 },
        layer: 'items',
        ariaLabel: 'Table A1',
      },
      { id: 'item-2' },
    ]);
    expect(instance.store.get(selectedPath)).toMatchObject({
      kind: 'item',
      itemId: 'item-1',
      label: 'Mesa 1',
      status: 'occupied',
      zoneId: 'patio',
      position: { x: 144, y: 122 },
      rotation: 15,
      metadata: { capacity: 6, section: 'Main', keep: true },
      item: { id: 'item-1', label: 'Mesa 1' },
      zone: { id: 'patio', label: 'Patio' },
    });
  });

  it('cancels unsaved draft edits by clearing draft and selection so the inspector closes', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();
    instance.store.set(selectedPath, { itemId: 'item-1' });
    instance.store.set(draftPath, {
      ...(makeItems()[0] as Record<string, unknown>),
      label: 'Unsaved',
      position: { x: 999, y: 999 },
    });

    render(<MythikRenderer spec={makeInspectorSpec()} instance={instance} />);
    await user.click(screen.getByText('Cancel'));
    await flushRenderer();

    expect(instance.store.get(draftPath)).toBeNull();
    expect(instance.store.get(selectedPath)).toBeNull();
    expect(instance.store.get(itemsPath)).toMatchObject([
      {
        id: 'item-1',
        label: 'A1',
        position: { x: 120, y: 100 },
      },
      { id: 'item-2' },
    ]);
  });

  it('keeps the selected draft position in sync after drag persistence', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();

    render(<MythikRenderer spec={makeInspectorSpec()} instance={instance} />);
    await user.click(screen.getByTestId('spatial-item-item-1'));
    await flushRenderer();
    await act(async () => {
      instance.store.set(`${draftPath}/label`, 'Unsaved label');
    });

    dragSpecItem('spatial-item-item-1', { x: 120, y: 100 }, { x: 150, y: 115 });
    await flushRenderer();

    expect(instance.store.get(itemsPath)).toMatchObject([
      { id: 'item-1', position: { x: 150, y: 115 } },
      { id: 'item-2' },
    ]);
    expect(instance.store.get(draftPath)).toMatchObject({
      id: 'item-1',
      label: 'Unsaved label',
      position: { x: 150, y: 115 },
    });
    expect(instance.store.get(selectedPath)).toMatchObject({
      itemId: 'item-1',
      label: 'A1',
      position: { x: 150, y: 115 },
      item: { id: 'item-1', position: { x: 150, y: 115 } },
      zone: { id: 'floor', label: 'Floor' },
    });

    await waitFor(() => {
      expect(screen.getByTestId('spatial-item-item-1').getAttribute('transform')).toContain('translate(150 115)');
    });
  });

  it('keeps the selected draft position in sync after keyboard movement', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();

    render(<MythikRenderer spec={makeInspectorSpec()} instance={instance} />);
    await user.click(screen.getByTestId('spatial-item-item-1'));
    await flushRenderer();

    const item = screen.getByTestId('spatial-item-item-1');
    item.focus();
    await user.keyboard('{ArrowRight}');
    await flushRenderer();

    expect(instance.store.get(itemsPath)).toMatchObject([
      { id: 'item-1', position: { x: 121, y: 100 } },
      { id: 'item-2' },
    ]);
    expect(instance.store.get(draftPath)).toMatchObject({
      id: 'item-1',
      position: { x: 121, y: 100 },
    });
    expect(instance.store.get(selectedPath)).toMatchObject({
      itemId: 'item-1',
      position: { x: 121, y: 100 },
      item: { id: 'item-1', position: { x: 121, y: 100 } },
    });
  });
});
