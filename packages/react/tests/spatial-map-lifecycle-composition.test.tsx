import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMythik } from 'mythik';
import type { Spec } from 'mythik';
import { MythikRenderer } from '../src/MythikRenderer.js';
import { registerReactPrimitives } from '../src/primitives/index.js';

const itemsPath = '/layout/items';
const zonesPath = '/layout/zones';
const selectedPath = '/ui/editor/selectedItem';
const draftPath = '/ui/editor/itemDraft';
const changePath = '/ui/editor/itemChange';
const pendingPath = '/ui/editor/pendingItem';
const placeModePath = '/ui/editor/placeMode';
const deleteCandidatePath = '/ui/editor/deleteCandidate';

function makeInstance(): ReturnType<typeof createMythik> {
  const instance = createMythik({
    initialState: {
      layout: {
        zones: [
          {
            id: 'floor',
            label: 'Floor',
            shape: { type: 'rect', x: 0, y: 0, width: 400, height: 240 },
          },
        ],
        items: [
          {
            id: 'item-01',
            label: 'Item 1',
            zoneId: 'floor',
            position: { x: 80, y: 80 },
            rotation: 0,
            shape: { type: 'circle', radius: 24 },
            status: 'available',
            metadata: { capacity: 2, keep: true },
          },
          {
            id: 'item-02',
            label: 'Item 2',
            zoneId: 'floor',
            position: { x: 180, y: 80 },
            rotation: 10,
            shape: { type: 'rect', width: 70, height: 44, radius: 10 },
            status: 'occupied',
            metadata: { capacity: 4, keep: true },
          },
        ],
      },
    },
  });
  registerReactPrimitives(instance.plugins);
  instance.applyPlugins();
  return instance;
}

async function flushRenderer(): Promise<void> {
  await act(async () => {
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

const selectPendingItemAction = {
  action: 'setState',
  params: {
    statePath: selectedPath,
    value: {
      kind: 'item',
      mode: 'edit',
      itemId: { $state: `${pendingPath}/id` },
      zoneId: { $state: `${pendingPath}/zoneId` },
      status: { $state: `${pendingPath}/status` },
      label: { $state: `${pendingPath}/label` },
      position: { $state: `${pendingPath}/position` },
      rotation: { $state: `${pendingPath}/rotation` },
      shape: { $state: `${pendingPath}/shape` },
      metadata: { $state: `${pendingPath}/metadata` },
      item: { $state: pendingPath },
    },
  },
};

const selectPressedItemAction = {
  action: 'setState',
  params: {
    statePath: draftPath,
    value: { $state: `${selectedPath}/item` },
  },
};

const appendPendingItemAction = {
  action: 'setState',
  params: {
    statePath: itemsPath,
    value: {
      $array: 'append',
      source: { $state: itemsPath },
      value: { $state: pendingPath },
    },
  },
};

function makeLifecycleSpec(): Spec {
  const newItemValue = {
    id: { $uniqueId: true, source: { $state: itemsPath }, field: 'id', prefix: 'item-', padding: 2 },
    label: { $uniqueId: true, source: { $state: itemsPath }, field: 'label', prefix: 'Item ' },
    zoneId: { $state: '/ui/spatialCanvasPress/zoneId' },
    position: {
      x: { $state: '/ui/spatialCanvasPress/point/x' },
      y: { $state: '/ui/spatialCanvasPress/point/y' },
    },
    rotation: 0,
    shape: { type: 'rect', width: 70, height: 44, radius: 10 },
    status: 'available',
    metadata: { capacity: 4 },
  };

  return {
    root: 'app',
    elements: {
      app: {
        type: 'stack',
        children: ['addButton', 'map', 'duplicateButton', 'deleteButton', 'deleteItemModal'],
      },
      addButton: {
        type: 'button',
        props: { label: 'Add item' },
        on: {
          press: [
            { action: 'setState', params: { statePath: placeModePath, value: true } },
            { action: 'setState', params: { statePath: selectedPath, value: null } },
            { action: 'setState', params: { statePath: draftPath, value: null } },
          ],
        },
      },
      map: {
        type: 'spatial-map',
        props: {
          ariaLabel: 'Lifecycle map',
          viewBox: { x: 0, y: 0, width: 400, height: 240 },
          zones: { $state: zonesPath },
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
            snap: {
              enabled: true,
              grid: { enabled: true, size: 20, threshold: 8 },
            },
            guides: { enabled: true, showCoordinates: true },
          },
          onItemPress: selectPressedItemAction,
          onCanvasPress: [
            {
              action: 'setState',
              params: {
                statePath: pendingPath,
                value: {
                  $cond: { $state: placeModePath },
                  $then: newItemValue,
                  $else: null,
                },
              },
            },
            {
              action: 'setState',
              params: {
                statePath: itemsPath,
                value: {
                  $cond: { $state: `${pendingPath}/id` },
                  $then: {
                    $array: 'append',
                    source: { $state: itemsPath },
                    value: { $state: pendingPath },
                  },
                  $else: { $state: itemsPath },
                },
              },
            },
            {
              action: 'setState',
              params: {
                statePath: changePath,
                value: {
                  $cond: { $state: `${pendingPath}/id` },
                  $then: {
                    kind: 'item-change',
                    changeType: 'create',
                    itemId: { $state: `${pendingPath}/id` },
                    previousItem: null,
                    nextItem: { $state: pendingPath },
                    item: { $state: pendingPath },
                  },
                  $else: { $state: changePath },
                },
              },
            },
            {
              action: 'setState',
              params: {
                statePath: selectedPath,
                value: {
                  $cond: { $state: `${pendingPath}/id` },
                  $then: selectPendingItemAction.params.value,
                  $else: null,
                },
              },
            },
            {
              action: 'setState',
              params: {
                statePath: draftPath,
                value: {
                  $cond: { $state: `${pendingPath}/id` },
                  $then: { $state: pendingPath },
                  $else: null,
                },
              },
            },
            { action: 'setState', params: { statePath: placeModePath, value: false } },
          ],
        },
      },
      duplicateButton: {
        type: 'button',
        props: { label: 'Duplicate' },
        on: {
          press: [
            {
              action: 'setState',
              params: {
                statePath: pendingPath,
                value: {
                  id: { $uniqueId: true, source: { $state: itemsPath }, field: 'id', prefix: 'item-', padding: 2 },
                  label: { $uniqueId: true, source: { $state: itemsPath }, field: 'label', prefix: 'Item ' },
                  zoneId: { $state: `${selectedPath}/item/zoneId` },
                  position: {
                    x: { $math: 'add', args: [{ $state: `${selectedPath}/item/position/x` }, 24] },
                    y: { $math: 'add', args: [{ $state: `${selectedPath}/item/position/y` }, 24] },
                  },
                  rotation: { $state: `${selectedPath}/item/rotation` },
                  shape: { $state: `${selectedPath}/item/shape` },
                  status: { $state: `${selectedPath}/item/status` },
                  metadata: { $state: `${selectedPath}/item/metadata` },
                },
              },
            },
            appendPendingItemAction,
            {
              action: 'setState',
              params: {
                statePath: changePath,
                value: {
                  kind: 'item-change',
                  changeType: 'duplicate',
                  itemId: { $state: `${pendingPath}/id` },
                  sourceItemId: { $state: `${selectedPath}/itemId` },
                  previousItem: null,
                  nextItem: { $state: pendingPath },
                  item: { $state: pendingPath },
                },
              },
            },
            selectPendingItemAction,
            { action: 'setState', params: { statePath: draftPath, value: { $state: pendingPath } } },
          ],
        },
      },
      deleteButton: {
        type: 'button',
        props: { label: 'Delete' },
        on: {
          press: [
            { action: 'setState', params: { statePath: deleteCandidatePath, value: { $state: selectedPath } } },
            { action: 'openModal', params: { id: 'deleteItemModal' } },
          ],
        },
      },
      deleteItemModal: {
        type: 'modal',
        props: { title: 'Delete item' },
        children: ['deleteMessage', 'confirmDeleteButton'],
      },
      deleteMessage: {
        type: 'text',
        props: { content: 'This action removes the selected item.' },
      },
      confirmDeleteButton: {
        type: 'button',
        props: { label: 'Confirm delete', variant: 'destructive' },
        on: {
          press: [
            {
              action: 'setState',
              params: {
                statePath: changePath,
                value: {
                  kind: 'item-change',
                  changeType: 'delete',
                  itemId: { $state: `${deleteCandidatePath}/itemId` },
                  previousItem: { $state: `${deleteCandidatePath}/item` },
                  nextItem: null,
                  item: null,
                },
              },
            },
            {
              action: 'setState',
              params: {
                statePath: itemsPath,
                value: {
                  $array: 'remove',
                  source: { $state: itemsPath },
                  where: { field: 'id', eq: { $state: `${deleteCandidatePath}/itemId` } },
                },
              },
            },
            { action: 'setState', params: { statePath: selectedPath, value: null } },
            { action: 'setState', params: { statePath: draftPath, value: null } },
            { action: 'setState', params: { statePath: deleteCandidatePath, value: null } },
            { action: 'closeModal', params: { id: 'deleteItemModal' } },
          ],
        },
      },
    },
  } as unknown as Spec;
}

describe('spatial-map lifecycle JSON composition', () => {
  it('creates an item at the clicked canvas coordinate and selects its draft', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();
    render(<MythikRenderer spec={makeLifecycleSpec()} instance={instance} />);

    await user.click(screen.getByText('Add item'));
    const svg = screen.getByLabelText('Lifecycle map');
    mockSvgClientRect(svg);
    fireEvent.click(screen.getByTestId('spatial-zone-shape-floor'), { clientX: 120, clientY: 140 });
    await flushRenderer();

    expect(instance.store.get(itemsPath)).toMatchObject([
      { id: 'item-01' },
      { id: 'item-02' },
      {
        id: 'item-03',
        label: 'Item 3',
        zoneId: 'floor',
        position: { x: 120, y: 140 },
        shape: { type: 'rect', width: 70, height: 44, radius: 10 },
      },
    ]);
    expect(instance.store.get(changePath)).toMatchObject({ changeType: 'create', itemId: 'item-03' });
    expect(instance.store.get(selectedPath)).toMatchObject({ itemId: 'item-03' });
    expect(instance.store.get(draftPath)).toMatchObject({ id: 'item-03', position: { x: 120, y: 140 } });
    expect(instance.store.get(placeModePath)).toBe(false);
  });

  it('creates an item from snapped canvasPress.point while preserving rawPoint', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();
    render(<MythikRenderer spec={makeLifecycleSpec()} instance={instance} />);

    await user.click(screen.getByText('Add item'));
    const svg = screen.getByLabelText('Lifecycle map');
    mockSvgClientRect(svg);
    fireEvent.click(screen.getByTestId('spatial-zone-shape-floor'), { clientX: 123, clientY: 137 });
    await flushRenderer();

    expect(instance.store.get('/ui/spatialCanvasPress')).toMatchObject({
      point: { x: 120, y: 140 },
      rawPoint: { x: 123, y: 137 },
    });
    expect(instance.store.get(itemsPath)).toMatchObject([
      { id: 'item-01' },
      { id: 'item-02' },
      { id: 'item-03', position: { x: 120, y: 140 } },
    ]);
  });

  it('duplicates the selected item with a unique id and preserved fields', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();
    render(<MythikRenderer spec={makeLifecycleSpec()} instance={instance} />);

    await user.click(screen.getByTestId('spatial-item-item-02'));
    await flushRenderer();
    await user.click(screen.getByText('Duplicate'));
    await flushRenderer();

    expect(instance.store.get(itemsPath)).toMatchObject([
      { id: 'item-01' },
      { id: 'item-02' },
      {
        id: 'item-03',
        label: 'Item 3',
        zoneId: 'floor',
        position: { x: 204, y: 104 },
        rotation: 10,
        shape: { type: 'rect', width: 70, height: 44, radius: 10 },
        status: 'occupied',
        metadata: { capacity: 4, keep: true },
      },
    ]);
    expect(instance.store.get(changePath)).toMatchObject({
      changeType: 'duplicate',
      sourceItemId: 'item-02',
      itemId: 'item-03',
    });
    expect(instance.store.get(selectedPath)).toMatchObject({ itemId: 'item-03' });
    expect(instance.store.get(draftPath)).toMatchObject({ id: 'item-03' });
  });

  it('clears selection on canvas press without creating a phantom selection when not placing', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();
    render(<MythikRenderer spec={makeLifecycleSpec()} instance={instance} />);

    await user.click(screen.getByTestId('spatial-item-item-01'));
    await flushRenderer();
    expect(instance.store.get(selectedPath)).toMatchObject({ itemId: 'item-01' });

    const svg = screen.getByLabelText('Lifecycle map');
    mockSvgClientRect(svg);
    fireEvent.click(screen.getByTestId('spatial-zone-shape-floor'), { clientX: 320, clientY: 200 });
    await flushRenderer();

    expect(instance.store.get(itemsPath)).toHaveLength(2);
    expect(instance.store.get(selectedPath)).toBeNull();
    expect(instance.store.get(draftPath)).toBeNull();
    expect(instance.store.get(placeModePath)).toBe(false);
  });

  it('confirms deletion, removes the item, and clears editor state', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();
    render(<MythikRenderer spec={makeLifecycleSpec()} instance={instance} />);

    await user.click(screen.getByTestId('spatial-item-item-01'));
    await flushRenderer();
    await user.click(screen.getByText('Delete'));
    expect(await screen.findByRole('dialog')).toBeTruthy();

    await user.click(screen.getByText('Confirm delete'));
    await flushRenderer();

    expect(instance.store.get(itemsPath)).toMatchObject([{ id: 'item-02' }]);
    expect(instance.store.get(changePath)).toMatchObject({
      changeType: 'delete',
      itemId: 'item-01',
      previousItem: { id: 'item-01', label: 'Item 1' },
      nextItem: null,
    });
    expect(instance.store.get(selectedPath)).toBeNull();
    expect(instance.store.get(draftPath)).toBeNull();
    expect(instance.store.get(deleteCandidatePath)).toBeNull();
    expect(instance.store.get('/ui/modals/deleteItemModal')).toBe(false);
  });
});
