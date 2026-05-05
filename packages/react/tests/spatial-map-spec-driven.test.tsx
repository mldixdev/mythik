import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MythikRenderer } from '../src/MythikRenderer.js';
import { createMythik, RESERVED_PATHS } from 'mythik';
import type { Spec } from 'mythik';
import { registerReactPrimitives } from '../src/primitives/index.js';

function makeInstance(): ReturnType<typeof createMythik> {
  const instance = createMythik({});
  registerReactPrimitives(instance.plugins);
  return instance;
}

function makeSpec(extraProps: Record<string, unknown>): Spec {
  return {
    root: 'map',
    elements: {
      map: {
        type: 'spatial-map',
        props: {
          viewBox: { x: 0, y: 0, width: 400, height: 240 },
          items: [
            {
              id: 'item-1',
              label: 'A1',
              zoneId: 'floor',
              position: { x: 120, y: 100 },
              shape: { type: 'circle', radius: 36 },
              status: 'available',
              metadata: { capacity: 4 },
            },
            {
              id: 'item-2',
              label: 'A2',
              position: { x: 240, y: 100 },
              shape: { type: 'rect', width: 80, height: 50, radius: 12 },
              status: 'available',
            },
          ],
          statusStyles: {
            available: { fill: '#dcfce7', stroke: '#22c55e', text: '#14532d' },
          },
          ...extraProps,
        },
      },
    },
  } as unknown as Spec;
}

/** Wait for MythikRenderer's scheduled store subscription rAF plus any queued microtasks. */
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

function dragSpecItem(testId: string, from: { x: number; y: number }, to: { x: number; y: number }): void {
  const item = screen.getByTestId(testId);
  const svg = screen.getByLabelText('Spatial map');
  mockSvgClientRect(svg);
  fireEvent.pointerDown(item, { pointerId: 1, clientX: from.x, clientY: from.y });
  fireEvent.pointerMove(document, { pointerId: 1, clientX: to.x, clientY: to.y });
  fireEvent.pointerUp(document, { pointerId: 1, clientX: to.x, clientY: to.y });
}

function dragSpecZone(testId: string, from: { x: number; y: number }, to: { x: number; y: number }): void {
  const zone = screen.getByTestId(testId);
  const svg = screen.getByLabelText('Spatial map');
  mockSvgClientRect(svg);
  fireEvent.pointerDown(zone, { pointerId: 11, clientX: from.x, clientY: from.y });
  fireEvent.pointerMove(document, { pointerId: 11, clientX: to.x, clientY: to.y });
  fireEvent.pointerUp(document, { pointerId: 11, clientX: to.x, clientY: to.y });
}

function dragSpecHandle(
  testId: string,
  from: { x: number; y: number },
  to: { x: number; y: number },
  pointerId = 5,
): void {
  const handle = screen.getByTestId(testId);
  const svg = screen.getByLabelText('Spatial map');
  mockSvgClientRect(svg);
  fireEvent.pointerDown(handle, { pointerId, clientX: from.x, clientY: from.y });
  fireEvent.pointerMove(document, { pointerId, clientX: to.x, clientY: to.y });
  fireEvent.pointerUp(document, { pointerId, clientX: to.x, clientY: to.y });
}

describe('spatial-map spec-driven wiring', () => {
  it('writes selected spatial item before dispatching onItemPress', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();
    let capturedId: unknown = null;
    instance.plugins.registerAction({
      name: 'captureSpatialItem',
      handler: async (params, setState, getState) => {
        capturedId = (params as { id: unknown }).id;
        setState('/captured', getState(RESERVED_PATHS.SELECTED_SPATIAL_ITEM));
      },
    });
    instance.applyPlugins();

    const spec = makeSpec({
      onItemPress: {
        action: 'captureSpatialItem',
        params: { id: { $state: '/ui/selectedSpatialItem/itemId' } },
      },
    });

    render(<MythikRenderer spec={spec} instance={instance} />);
    await user.click(screen.getByTestId('spatial-item-item-1'));
    await flushRenderer();

    expect(capturedId).toBe('item-1');
    expect(instance.store.get(RESERVED_PATHS.SELECTED_SPATIAL_ITEM)).toMatchObject({
      kind: 'item',
      itemId: 'item-1',
      zoneId: 'floor',
      status: 'available',
      label: 'A1',
      metadata: { capacity: 4 },
    });
    expect(instance.store.get('/captured')).toMatchObject({ itemId: 'item-1' });
  });

  it('dispatches onItemPress action arrays in order', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();
    const calls: string[] = [];
    instance.plugins.registerAction({ name: 'first', handler: async () => { calls.push('first'); } });
    instance.plugins.registerAction({ name: 'second', handler: async () => { calls.push('second'); } });
    instance.applyPlugins();

    render(
      <MythikRenderer
        spec={makeSpec({ onItemPress: [{ action: 'first' }, { action: 'second' }] })}
        instance={instance}
      />,
    );
    await user.click(screen.getByTestId('spatial-item-item-2'));
    await flushRenderer();

    expect(calls).toEqual(['first', 'second']);
    expect(instance.store.get(RESERVED_PATHS.SELECTED_SPATIAL_ITEM)).toMatchObject({ itemId: 'item-2' });
  });

  it('awaits action arrays as a single serial chain', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();
    const calls: string[] = [];
    instance.plugins.registerAction({
      name: 'slow',
      handler: async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        calls.push('slow');
      },
    });
    instance.plugins.registerAction({ name: 'fast', handler: async () => { calls.push('fast'); } });
    instance.applyPlugins();

    render(
      <MythikRenderer
        spec={makeSpec({ onItemPress: [{ action: 'slow' }, { action: 'fast' }] })}
        instance={instance}
      />,
    );
    await user.click(screen.getByTestId('spatial-item-item-2'));
    await flushRenderer();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(calls).toEqual(['slow', 'fast']);
  });

  it('selection still writes when onItemPress is omitted', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();
    instance.applyPlugins();

    render(<MythikRenderer spec={makeSpec({})} instance={instance} />);
    await user.click(screen.getByTestId('spatial-item-item-1'));
    await flushRenderer();

    expect(instance.store.get(RESERVED_PATHS.SELECTED_SPATIAL_ITEM)).toMatchObject({ itemId: 'item-1' });
  });

  it('writes canvas press context with SVG coordinates before dispatching onCanvasPress', async () => {
    const instance = makeInstance();
    instance.applyPlugins();

    render(
      <MythikRenderer
        spec={makeSpec({
          zones: [
            {
              id: 'floor',
              label: 'Main floor',
              shape: { type: 'rect', x: 0, y: 0, width: 400, height: 240 },
            },
          ],
          onCanvasPress: {
            action: 'setState',
            params: {
              statePath: '/capturedCanvas',
              value: {
                point: { $state: '/ui/spatialCanvasPress/point' },
                zoneId: { $state: '/ui/spatialCanvasPress/zoneId' },
                mode: { $state: '/ui/spatialCanvasPress/mode' },
              },
            },
          },
        })}
        instance={instance}
      />,
    );

    const svg = screen.getByLabelText('Spatial map');
    mockSvgClientRect(svg);
    fireEvent.click(screen.getByTestId('spatial-zone-shape-floor'), { clientX: 80, clientY: 90 });
    await flushRenderer();

    expect(instance.store.get('/ui/spatialCanvasPress')).toMatchObject({
      kind: 'canvas',
      mode: 'operate',
      point: { x: 80, y: 90 },
      zoneId: 'floor',
      zone: { id: 'floor', label: 'Main floor' },
      viewBox: { x: 0, y: 0, width: 400, height: 240 },
    });
    expect(instance.store.get('/capturedCanvas')).toEqual({
      point: { x: 80, y: 90 },
      zoneId: 'floor',
      mode: 'operate',
    });
  });

  it('writes selected zone context before dispatching JSON onZonePress actions', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();
    instance.applyPlugins();

    render(
      <MythikRenderer
        spec={makeSpec({
          mode: 'edit',
          zones: [
            {
              id: 'floor',
              label: 'Main floor',
              shape: { type: 'rect', x: 0, y: 0, width: 400, height: 240 },
            },
          ],
          interactionPolicy: {
            selectZones: true,
            activateZones: true,
            zonePressStopsCanvas: true,
          },
          onZonePress: {
            action: 'setState',
            params: {
              statePath: '/capturedZone',
              value: {
                zoneId: { $state: '/ui/selectedSpatialZone/zoneId' },
                label: { $state: '/ui/selectedSpatialZone/label' },
                position: { $state: '/ui/selectedSpatialZone/position' },
              },
            },
          },
        })}
        instance={instance}
      />,
    );

    await user.click(screen.getByTestId('spatial-zone-shape-floor'));
    await flushRenderer();

    expect(instance.store.get(RESERVED_PATHS.SELECTED_SPATIAL_ZONE)).toMatchObject({
      kind: 'zone',
      zoneId: 'floor',
      label: 'Main floor',
      position: { x: 0, y: 0 },
      zone: { id: 'floor', label: 'Main floor' },
    });
    expect(instance.store.get('/capturedZone')).toEqual({
      zoneId: 'floor',
      label: 'Main floor',
      position: { x: 0, y: 0 },
    });
  });

  it('writes zone change context before dispatching JSON onZoneChange actions', async () => {
    const instance = makeInstance();
    instance.applyPlugins();

    render(
      <MythikRenderer
        spec={makeSpec({
          mode: 'edit',
          zones: [
            {
              id: 'floor',
              label: 'Main floor',
              shape: { type: 'rect', x: 0, y: 0, width: 120, height: 90 },
            },
          ],
          interactionPolicy: { selectZones: true, zonePressStopsCanvas: true },
          editPolicy: { dragZones: true, bounds: 'none' },
          onZoneChange: {
            action: 'setState',
            params: {
              statePath: '/layout/zones',
              value: {
                '$array': 'replace',
                source: { $state: '/layout/zones' },
                where: { field: 'id', eq: { $state: '/ui/spatialZoneChange/zoneId' } },
                value: { $state: '/ui/spatialZoneChange/nextZone' },
              },
            },
          },
        })}
        instance={instance}
      />,
    );
    instance.store.set('/layout/zones', [{
      id: 'floor',
      label: 'Main floor',
      shape: { type: 'rect', x: 0, y: 0, width: 120, height: 90 },
    }]);

    dragSpecZone('spatial-zone-floor', { x: 40, y: 40 }, { x: 70, y: 55 });
    await flushRenderer();

    expect(instance.store.get(RESERVED_PATHS.SPATIAL_ZONE_CHANGE)).toMatchObject({
      kind: 'zone-change',
      changeType: 'move',
      zoneId: 'floor',
      position: { x: 30, y: 15 },
      nextZone: { id: 'floor', position: { x: 30, y: 15 } },
    });
    expect(instance.store.get('/layout/zones')).toEqual([{
      id: 'floor',
      label: 'Main floor',
      shape: { type: 'rect', x: 0, y: 0, width: 120, height: 90 },
      position: { x: 30, y: 15 },
    }]);
  });

  it('resolves zoneShapeEditId from JSON state and writes shape change before dispatch', async () => {
    const instance = makeInstance();
    instance.store.set('/layout/zones', [{
      id: 'zone-a',
      shape: { type: 'polygon', points: [{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 70 }] },
    }]);
    instance.store.set('/ui/selectedZoneId', 'zone-a');
    instance.store.set('/ui/zoneShapeEditId', 'zone-a');
    instance.applyPlugins();

    render(<MythikRenderer instance={instance} spec={makeSpec({
      mode: 'edit',
      zones: { $state: '/layout/zones' },
      selectedZoneId: { $state: '/ui/selectedZoneId' },
      zoneShapeEditId: { $state: '/ui/zoneShapeEditId' },
      onZoneChange: {
        action: 'setState',
        params: {
          statePath: '/layout/zones',
          value: {
            '$array': 'replace',
            source: { $state: '/layout/zones' },
            where: { field: 'id', eq: { $state: '/ui/spatialZoneChange/zoneId' } },
            value: { $state: '/ui/spatialZoneChange/nextZone' },
          },
        },
      },
    })} />);

    const svg = screen.getByRole('img');
    mockSvgClientRect(svg);
    dragSpecHandle('spatial-zone-vertex-handle-zone-a-1', { x: 90, y: 10 }, { x: 100, y: 20 });
    await flushRenderer();

    expect(instance.store.get('/ui/spatialZoneChange/changeType')).toBe('shape');
    expect(instance.store.get('/layout/zones/0/shape/points/1')).toEqual({ x: 100, y: 20 });
  });

  it('dispatches onZoneShapeEditExit JSON actions from Escape', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();
    instance.store.set('/layout/zones', [{
      id: 'zone-a',
      shape: { type: 'polygon', points: [{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 70 }] },
    }]);
    instance.store.set('/ui/selectedZoneId', 'zone-a');
    instance.store.set('/ui/zoneShapeEditId', 'zone-a');
    instance.applyPlugins();

    render(<MythikRenderer instance={instance} spec={makeSpec({
      mode: 'edit',
      zones: { $state: '/layout/zones' },
      selectedZoneId: { $state: '/ui/selectedZoneId' },
      zoneShapeEditId: { $state: '/ui/zoneShapeEditId' },
      onZoneShapeEditExit: {
        action: 'setState',
        params: { statePath: '/ui/zoneShapeEditId', value: null },
      },
    })} />);

    screen.getByTestId('spatial-zone-vertex-handle-zone-a-1').focus();
    await user.keyboard('{Escape}');
    await flushRenderer();

    expect(instance.store.get('/ui/zoneShapeEditId')).toBeNull();
  });

  it('uses custom canvasPressPath when configured', async () => {
    const instance = makeInstance();
    instance.applyPlugins();

    render(
      <MythikRenderer
        spec={makeSpec({
          canvasPressPath: '/ui/floorEditor/canvasPress',
          onCanvasPress: {
            action: 'setState',
            params: {
              statePath: '/capturedCanvasPath',
              value: { $state: '/ui/floorEditor/canvasPress/point' },
            },
          },
        })}
        instance={instance}
      />,
    );

    const canvas = screen.getByTestId('spatial-map-canvas');
    mockSvgClientRect(screen.getByLabelText('Spatial map'));
    fireEvent.click(canvas, { clientX: 44, clientY: 66 });
    await flushRenderer();

    expect(instance.store.get('/ui/floorEditor/canvasPress')).toMatchObject({
      kind: 'canvas',
      point: { x: 44, y: 66 },
    });
    expect(instance.store.get('/ui/spatialCanvasPress')).toBeUndefined();
    expect(instance.store.get('/capturedCanvasPath')).toEqual({ x: 44, y: 66 });
  });

  it('uses custom selectedItemPath when configured', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();
    instance.plugins.registerAction({ name: 'noop', handler: async () => {} });
    instance.applyPlugins();

    render(
      <MythikRenderer
        spec={makeSpec({ selectedItemPath: '/ui/customSpatial', onItemPress: { action: 'noop' } })}
        instance={instance}
      />,
    );
    await user.click(screen.getByTestId('spatial-item-item-1'));
    await flushRenderer();

    expect(instance.store.get('/ui/customSpatial')).toMatchObject({ itemId: 'item-1' });
    expect(instance.store.get(RESERVED_PATHS.SELECTED_SPATIAL_ITEM)).toBeUndefined();
  });

  it('renders items resolved from $state expressions', () => {
    const instance = makeInstance();
    instance.store.set('/layout/items', [
      {
        id: 'state-item',
        label: 'S1',
        position: { x: 80, y: 80 },
        shape: { type: 'circle', radius: 24 },
        status: 'available',
      },
    ]);
    instance.applyPlugins();

    render(<MythikRenderer spec={makeSpec({ items: { $state: '/layout/items' } })} instance={instance} />);

    expect(screen.getByTestId('spatial-item-state-item')).toBeTruthy();
  });

  it('resolves canvasGuide visibility from JSON state expressions', async () => {
    const instance = makeInstance();
    instance.store.set('/ui/placeMode', true);
    instance.applyPlugins();

    render(
      <MythikRenderer
        spec={makeSpec({
          canvasGuide: {
            visible: { $state: '/ui/placeMode' },
            stroke: '#4f46e5',
          },
        })}
        instance={instance}
      />,
    );

    const svg = screen.getByLabelText('Spatial map');
    mockSvgClientRect(svg);
    fireEvent.pointerMove(svg, { clientX: 80, clientY: 90 });

    expect(screen.getByTestId('spatial-canvas-guide-x').getAttribute('x1')).toBe('80');

    instance.store.set('/ui/placeMode', false);
    await flushRenderer();

    expect(screen.queryByTestId('spatial-canvas-guide')).toBeNull();
  });

  it('renders canvas guide at the snapped placement point', () => {
    const instance = makeInstance();
    instance.applyPlugins();

    render(
      <MythikRenderer
        spec={makeSpec({
          mode: 'edit',
          canvasGuide: { visible: true },
          editPolicy: {
            snap: {
              enabled: true,
              grid: { enabled: true, size: 20, threshold: 8 },
            },
            guides: { enabled: true, showCoordinates: true },
          },
        })}
        instance={instance}
      />,
    );

    const svg = screen.getByLabelText('Spatial map');
    mockSvgClientRect(svg);
    fireEvent.pointerMove(svg, { clientX: 83, clientY: 94 });

    expect(screen.getByTestId('spatial-canvas-guide-x').getAttribute('x1')).toBe('80');
    expect(screen.getByTestId('spatial-canvas-guide-y').getAttribute('y1')).toBe('100');
    expect(screen.getByTestId('spatial-edit-coordinate').textContent).toContain('80, 100');
  });

  it('writes snapped canvas point, rawPoint, and snap metadata before dispatch', async () => {
    const instance = makeInstance();
    instance.applyPlugins();

    render(
      <MythikRenderer
        spec={makeSpec({
          mode: 'edit',
          canvasGuide: { visible: true },
          editPolicy: {
            snap: {
              enabled: true,
              grid: { enabled: true, size: 20, threshold: 8 },
            },
          },
          onCanvasPress: {
            action: 'setState',
            params: {
              statePath: '/capturedCanvasSnap',
              value: {
                point: { $state: '/ui/spatialCanvasPress/point' },
                rawPoint: { $state: '/ui/spatialCanvasPress/rawPoint' },
                snap: { $state: '/ui/spatialCanvasPress/snap' },
              },
            },
          },
        })}
        instance={instance}
      />,
    );

    const canvas = screen.getByTestId('spatial-map-canvas');
    mockSvgClientRect(screen.getByLabelText('Spatial map'));
    fireEvent.click(canvas, { clientX: 83, clientY: 94 });
    await flushRenderer();

    expect(instance.store.get('/capturedCanvasSnap')).toEqual({
      point: { x: 80, y: 100 },
      rawPoint: { x: 83, y: 94 },
      snap: { snapped: true, sources: ['grid'] },
    });
    expect(instance.store.get('/ui/spatialCanvasPress')).toMatchObject({
      kind: 'canvas',
      point: { x: 80, y: 100 },
      rawPoint: { x: 83, y: 94 },
    });
  });

  it('omits snap metadata from canvas press context when snapping is disabled', async () => {
    const instance = makeInstance();
    instance.applyPlugins();

    render(
      <MythikRenderer
        spec={makeSpec({
          mode: 'edit',
          canvasGuide: { visible: true },
          onCanvasPress: {
            action: 'setState',
            params: {
              statePath: '/capturedCanvasWithoutSnapMetadata',
              value: {
                point: { $state: '/ui/spatialCanvasPress/point' },
                rawPoint: { $state: '/ui/spatialCanvasPress/rawPoint' },
                snap: { $state: '/ui/spatialCanvasPress/snap' },
              },
            },
          },
        })}
        instance={instance}
      />,
    );

    mockSvgClientRect(screen.getByLabelText('Spatial map'));
    fireEvent.click(screen.getByTestId('spatial-map-canvas'), { clientX: 83, clientY: 94 });
    await flushRenderer();

    expect(instance.store.get('/capturedCanvasWithoutSnapMetadata')).toEqual({
      point: { x: 83, y: 94 },
      rawPoint: { x: 83, y: 94 },
      snap: undefined,
    });
    expect(instance.store.get('/ui/spatialCanvasPress')).toMatchObject({
      point: { x: 83, y: 94 },
      rawPoint: { x: 83, y: 94 },
    });
    expect(instance.store.get('/ui/spatialCanvasPress/snap')).toBeUndefined();
  });

  it('resolves canvas click placement from the click raw point instead of stale guide state', async () => {
    const instance = makeInstance();
    instance.applyPlugins();

    render(
      <MythikRenderer
        spec={makeSpec({
          mode: 'edit',
          canvasGuide: { visible: true },
          editPolicy: {
            snap: {
              enabled: true,
              grid: { enabled: true, size: 20, threshold: 8 },
            },
          },
          onCanvasPress: {
            action: 'setState',
            params: {
              statePath: '/capturedCanvasGuidePlacement',
              value: {
                point: { $state: '/ui/spatialCanvasPress/point' },
                rawPoint: { $state: '/ui/spatialCanvasPress/rawPoint' },
              },
            },
          },
        })}
        instance={instance}
      />,
    );

    const svg = screen.getByLabelText('Spatial map');
    mockSvgClientRect(svg);
    fireEvent.pointerMove(svg, { clientX: 83, clientY: 94 });

    expect(screen.getByTestId('spatial-canvas-guide-x').getAttribute('x1')).toBe('80');
    expect(screen.getByTestId('spatial-canvas-guide-y').getAttribute('y1')).toBe('100');

    fireEvent.click(screen.getByTestId('spatial-map-canvas'), { clientX: 91, clientY: 91 });
    await flushRenderer();

    expect(instance.store.get('/capturedCanvasGuidePlacement')).toEqual({
      point: { x: 91, y: 91 },
      rawPoint: { x: 91, y: 91 },
    });
  });

  it('recomputes visible canvas guide resolution when snap policy changes', async () => {
    const instance = makeInstance();
    instance.applyPlugins();
    const onCanvasPress = {
      action: 'setState',
      params: {
        statePath: '/capturedRecomputedCanvasGuidePlacement',
        value: {
          point: { $state: '/ui/spatialCanvasPress/point' },
          rawPoint: { $state: '/ui/spatialCanvasPress/rawPoint' },
        },
      },
    };

    const { rerender } = render(
      <MythikRenderer
        spec={makeSpec({
          mode: 'edit',
          canvasGuide: { visible: true },
          editPolicy: {
            snap: {
              enabled: true,
              grid: { enabled: true, size: 20, threshold: 8 },
            },
            guides: { enabled: true, showCoordinates: true },
          },
          onCanvasPress,
        })}
        instance={instance}
      />,
    );

    const svg = screen.getByLabelText('Spatial map');
    mockSvgClientRect(svg);
    fireEvent.pointerMove(svg, { clientX: 83, clientY: 94 });

    expect(screen.getByTestId('spatial-canvas-guide-x').getAttribute('x1')).toBe('80');
    expect(screen.getByTestId('spatial-canvas-guide-y').getAttribute('y1')).toBe('100');

    rerender(
      <MythikRenderer
        spec={makeSpec({
          mode: 'edit',
          canvasGuide: { visible: true },
          editPolicy: {
            snap: { enabled: false },
            guides: { enabled: true, showCoordinates: true },
          },
          onCanvasPress,
        })}
        instance={instance}
      />,
    );
    await flushRenderer();

    expect(screen.getByTestId('spatial-canvas-guide-x').getAttribute('x1')).toBe('83');
    expect(screen.getByTestId('spatial-canvas-guide-y').getAttribute('y1')).toBe('94');
    expect(screen.getByTestId('spatial-edit-coordinate').textContent).toContain('83, 94');

    fireEvent.click(screen.getByTestId('spatial-map-canvas'), { clientX: 91, clientY: 91 });
    await flushRenderer();

    expect(instance.store.get('/capturedRecomputedCanvasGuidePlacement')).toEqual({
      point: { x: 91, y: 91 },
      rawPoint: { x: 91, y: 91 },
    });
  });

  it('programmatic onItemPress functions pass through without framework state writes', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();
    const onItemPress = vi.fn();
    instance.applyPlugins();

    render(<MythikRenderer spec={makeSpec({ onItemPress })} instance={instance} />);
    await user.click(screen.getByTestId('spatial-item-item-1'));

    expect(onItemPress).toHaveBeenCalledTimes(1);
    expect(onItemPress.mock.calls[0][0]).toMatchObject({ itemId: 'item-1' });
    expect(instance.store.get(RESERVED_PATHS.SELECTED_SPATIAL_ITEM)).toBeUndefined();
  });

  it('can select without dispatching when activation is disabled', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();
    const calls: string[] = [];
    instance.plugins.registerAction({ name: 'activate', handler: async () => { calls.push('activate'); } });
    instance.applyPlugins();

    render(
      <MythikRenderer
        spec={makeSpec({
          interactionPolicy: { selectItems: true, activateItems: false },
          onItemPress: { action: 'activate' },
        })}
        instance={instance}
      />,
    );
    await user.click(screen.getByTestId('spatial-item-item-1'));
    await flushRenderer();

    expect(instance.store.get(RESERVED_PATHS.SELECTED_SPATIAL_ITEM)).toMatchObject({ itemId: 'item-1' });
    expect(calls).toEqual([]);
  });

  it('allows explicit selection in readonly mode without activation', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();
    const calls: string[] = [];
    instance.plugins.registerAction({ name: 'activate', handler: async () => { calls.push('activate'); } });
    instance.applyPlugins();

    render(
      <MythikRenderer
        spec={makeSpec({
          mode: 'readonly',
          interactionPolicy: { selectItems: true, activateItems: false },
          onItemPress: { action: 'activate' },
        })}
        instance={instance}
      />,
    );
    await user.click(screen.getByTestId('spatial-item-item-1'));
    await flushRenderer();

    expect(instance.store.get(RESERVED_PATHS.SELECTED_SPATIAL_ITEM)).toMatchObject({ itemId: 'item-1' });
    expect(calls).toEqual([]);
  });

  it('store selection drives selected visual state without render-time lazy deps', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();
    instance.applyPlugins();

    render(<MythikRenderer spec={makeSpec({})} instance={instance} />);
    await user.click(screen.getByTestId('spatial-item-item-1'));
    await flushRenderer();

    expect(screen.getByTestId('spatial-item-item-1').getAttribute('data-selected')).toBe('true');

    await act(async () => {
      instance.store.set(RESERVED_PATHS.SELECTED_SPATIAL_ITEM, { itemId: 'item-2' });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() => {
      expect(screen.getByTestId('spatial-item-item-1').getAttribute('data-selected')).toBe('false');
      expect(screen.getByTestId('spatial-item-item-2').getAttribute('data-selected')).toBe('true');
    });
  });

  it('canvas press clears selection and dispatches onCanvasPress', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();
    const calls: string[] = [];
    instance.plugins.registerAction({ name: 'canvasAction', handler: async () => { calls.push('canvasAction'); } });
    instance.applyPlugins();

    render(<MythikRenderer spec={makeSpec({ onCanvasPress: { action: 'canvasAction' } })} instance={instance} />);
    await user.click(screen.getByTestId('spatial-item-item-1'));
    await flushRenderer();
    expect(instance.store.get(RESERVED_PATHS.SELECTED_SPATIAL_ITEM)).toMatchObject({ itemId: 'item-1' });

    await user.click(screen.getByTestId('spatial-map-canvas'));
    await flushRenderer();

    expect(instance.store.get(RESERVED_PATHS.SELECTED_SPATIAL_ITEM)).toBeUndefined();
    expect(calls).toEqual(['canvasAction']);
  });

  it('canvas press can dispatch without clearing selection', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();
    const calls: string[] = [];
    instance.plugins.registerAction({ name: 'canvasAction', handler: async () => { calls.push('canvasAction'); } });
    instance.applyPlugins();

    render(
      <MythikRenderer
        spec={makeSpec({
          onCanvasPress: { action: 'canvasAction' },
          interactionPolicy: { clearSelectionOnCanvasPress: false },
        })}
        instance={instance}
      />,
    );
    await user.click(screen.getByTestId('spatial-item-item-1'));
    await flushRenderer();

    await user.click(screen.getByTestId('spatial-map-canvas'));
    await flushRenderer();

    expect(instance.store.get(RESERVED_PATHS.SELECTED_SPATIAL_ITEM)).toMatchObject({ itemId: 'item-1' });
    expect(calls).toEqual(['canvasAction']);
  });

  it('writes spatial item change before dispatching onItemChange', async () => {
    const instance = makeInstance();
    let capturedId: unknown = null;
    instance.plugins.registerAction({
      name: 'captureSpatialChange',
      handler: async (params, setState, getState) => {
        capturedId = (params as { itemId: unknown }).itemId;
        setState('/capturedChange', getState(RESERVED_PATHS.SPATIAL_ITEM_CHANGE));
      },
    });
    instance.applyPlugins();

    render(
      <MythikRenderer
        spec={makeSpec({
          mode: 'edit',
          onItemChange: {
            action: 'captureSpatialChange',
            params: { itemId: { $state: '/ui/spatialItemChange/itemId' } },
          },
        })}
        instance={instance}
      />,
    );

    dragSpecItem('spatial-item-item-1', { x: 120, y: 100 }, { x: 150, y: 115 });
    await flushRenderer();

    expect(capturedId).toBe('item-1');
    expect(instance.store.get(RESERVED_PATHS.SPATIAL_ITEM_CHANGE)).toMatchObject({
      kind: 'item-change',
      itemId: 'item-1',
      previousPosition: { x: 120, y: 100 },
      position: { x: 150, y: 115 },
    });
    expect(instance.store.get('/capturedChange')).toMatchObject({ itemId: 'item-1' });
  });

  it('snaps drag preview and committed item changes to the edit grid', async () => {
    const instance = makeInstance();
    instance.applyPlugins();

    render(
      <MythikRenderer
        spec={makeSpec({
          mode: 'edit',
          editPolicy: {
            snap: {
              enabled: true,
              grid: { enabled: true, size: 20, threshold: 8 },
            },
            guides: { enabled: true, showCoordinates: true },
          },
          onItemChange: {
            action: 'setState',
            params: {
              statePath: '/capturedSnappedPosition',
              value: { $state: '/ui/spatialItemChange/position' },
            },
          },
        })}
        instance={instance}
      />,
    );

    const item = screen.getByTestId('spatial-item-item-1');
    mockSvgClientRect(screen.getByLabelText('Spatial map'));
    fireEvent.pointerDown(item, { pointerId: 1, clientX: 120, clientY: 100 });
    fireEvent.pointerMove(document, { pointerId: 1, clientX: 133, clientY: 106 });

    await waitFor(() => {
      expect(screen.getByTestId('spatial-item-item-1').getAttribute('transform')).toContain('translate(140 100)');
    });
    expect(screen.getByTestId('spatial-edit-guides')).not.toBeNull();
    expect(screen.getByTestId('spatial-edit-coordinate').textContent).toContain('140, 100');

    fireEvent.pointerUp(document, { pointerId: 1, clientX: 133, clientY: 106 });
    await flushRenderer();

    expect(instance.store.get('/capturedSnappedPosition')).toEqual({ x: 140, y: 100 });
  });

  it('persists off-grid drag drops at the snapped preview position', async () => {
    const instance = makeInstance();
    instance.applyPlugins();

    render(
      <MythikRenderer
        spec={makeSpec({
          mode: 'edit',
          items: [
            {
              id: 'item-1',
              label: 'A1',
              zoneId: 'floor',
              position: { x: 133, y: 100 },
              shape: { type: 'circle', radius: 36 },
              status: 'available',
              metadata: { capacity: 4 },
            },
            {
              id: 'item-2',
              label: 'A2',
              position: { x: 240, y: 100 },
              shape: { type: 'rect', width: 80, height: 50, radius: 12 },
              status: 'available',
            },
          ],
          editPolicy: {
            snap: {
              enabled: true,
              grid: { enabled: true, size: 20, threshold: 8 },
            },
            guides: { enabled: true, showCoordinates: true },
          },
          onItemChange: {
            action: 'setState',
            params: {
              statePath: '/capturedOffGridDragPosition',
              value: { $state: '/ui/spatialItemChange/position' },
            },
          },
        })}
        instance={instance}
      />,
    );

    const item = screen.getByTestId('spatial-item-item-1');
    mockSvgClientRect(screen.getByLabelText('Spatial map'));
    fireEvent.pointerDown(item, { pointerId: 1, clientX: 133, clientY: 100 });
    fireEvent.pointerMove(document, { pointerId: 1, clientX: 134, clientY: 100 });

    await waitFor(() => {
      expect(screen.getByTestId('spatial-item-item-1').getAttribute('transform')).toContain('translate(140 100)');
    });
    expect(screen.getByTestId('spatial-edit-coordinate').textContent).toContain('140, 100');

    fireEvent.pointerUp(document, { pointerId: 1, clientX: 134, clientY: 100 });
    await flushRenderer();

    expect(instance.store.get('/capturedOffGridDragPosition')).toEqual({ x: 140, y: 100 });
  });

  it('keeps drag behavior raw when snap is disabled', async () => {
    const instance = makeInstance();
    instance.applyPlugins();

    render(
      <MythikRenderer
        spec={makeSpec({
          mode: 'edit',
          editPolicy: {
            guides: { enabled: true, showSnapLines: false, showCoordinates: false },
          },
          onItemChange: {
            action: 'setState',
            params: {
              statePath: '/capturedRawPosition',
              value: { $state: '/ui/spatialItemChange/position' },
            },
          },
        })}
        instance={instance}
      />,
    );

    const item = screen.getByTestId('spatial-item-item-1');
    mockSvgClientRect(screen.getByLabelText('Spatial map'));
    fireEvent.pointerDown(item, { pointerId: 1, clientX: 120, clientY: 100 });
    fireEvent.pointerMove(document, { pointerId: 1, clientX: 133, clientY: 106 });

    await waitFor(() => {
      expect(screen.getByTestId('spatial-item-item-1').getAttribute('transform')).toContain('translate(133 106)');
    });
    expect(screen.queryByTestId('spatial-edit-guides')).toBeNull();

    fireEvent.pointerUp(document, { pointerId: 1, clientX: 133, clientY: 106 });
    await flushRenderer();

    expect(instance.store.get('/capturedRawPosition')).toEqual({ x: 133, y: 106 });
    expect(screen.queryByTestId('spatial-edit-guides')).toBeNull();
  });

  it('moves keyboard edits to the next grid coordinate when snap is enabled', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();
    instance.applyPlugins();

    render(
      <MythikRenderer
        spec={makeSpec({
          mode: 'edit',
          editPolicy: {
            keyboardStep: 1,
            snap: {
              enabled: true,
              grid: { enabled: true, size: 20, threshold: 8 },
            },
          },
          onItemChange: {
            action: 'setState',
            params: {
              statePath: '/capturedKeyboardPosition',
              value: { $state: '/ui/spatialItemChange/position' },
            },
          },
        })}
        instance={instance}
      />,
    );

    await user.click(screen.getByTestId('spatial-item-item-1'));
    await user.keyboard('{ArrowRight}');
    await flushRenderer();

    expect(instance.store.get('/capturedKeyboardPosition')).toEqual({ x: 140, y: 100 });
  });

  it('keeps keyboard movement step-based when snap is disabled', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();
    instance.applyPlugins();

    render(
      <MythikRenderer
        spec={makeSpec({
          mode: 'edit',
          editPolicy: { keyboardStep: 1 },
          onItemChange: {
            action: 'setState',
            params: {
              statePath: '/capturedKeyboardPosition',
              value: { $state: '/ui/spatialItemChange/position' },
            },
          },
        })}
        instance={instance}
      />,
    );

    await user.click(screen.getByTestId('spatial-item-item-1'));
    await user.keyboard('{ArrowRight}');
    await flushRenderer();

    expect(instance.store.get('/capturedKeyboardPosition')).toEqual({ x: 121, y: 100 });
  });

  it('uses keyboard large steps as multiple grid stops when snap is enabled', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();
    instance.applyPlugins();

    render(
      <MythikRenderer
        spec={makeSpec({
          mode: 'edit',
          editPolicy: {
            keyboardStep: 1,
            keyboardLargeStep: 40,
            snap: {
              enabled: true,
              grid: { enabled: true, size: 20, threshold: 8 },
            },
          },
          onItemChange: {
            action: 'setState',
            params: {
              statePath: '/capturedKeyboardPosition',
              value: { $state: '/ui/spatialItemChange/position' },
            },
          },
        })}
        instance={instance}
      />,
    );

    await user.click(screen.getByTestId('spatial-item-item-1'));
    await user.keyboard('{Shift>}{ArrowRight}{/Shift}');
    await flushRenderer();

    expect(instance.store.get('/capturedKeyboardPosition')).toEqual({ x: 160, y: 100 });
  });

  it('uses host-persisted item state for repeated snapped keyboard movement', async () => {
    const user = userEvent.setup();
    const instance = makeInstance();
    instance.store.set('/data/layout/items', [
      {
        id: 'item-1',
        label: 'A1',
        zoneId: 'floor',
        position: { x: 120, y: 100 },
        shape: { type: 'circle', radius: 36 },
        status: 'available',
        metadata: { capacity: 4 },
      },
      {
        id: 'item-2',
        label: 'A2',
        position: { x: 240, y: 100 },
        shape: { type: 'rect', width: 80, height: 50, radius: 12 },
        status: 'available',
      },
    ]);
    instance.applyPlugins();

    render(
      <MythikRenderer
        spec={makeSpec({
          mode: 'edit',
          items: { $state: '/data/layout/items' },
          editPolicy: {
            keyboardStep: 1,
            snap: {
              enabled: true,
              grid: { enabled: true, size: 20, threshold: 8 },
            },
          },
          onItemChange: {
            action: 'setState',
            params: {
              statePath: '/data/layout/items',
              value: {
                $array: 'replace',
                source: { $state: '/data/layout/items' },
                where: {
                  field: 'id',
                  eq: { $state: '/ui/spatialItemChange/itemId' },
                },
                value: { $state: '/ui/spatialItemChange/nextItem' },
              },
            },
          },
        })}
        instance={instance}
      />,
    );

    await user.click(screen.getByTestId('spatial-item-item-1'));
    await user.keyboard('{ArrowRight}');
    await flushRenderer();

    expect(instance.store.get('/data/layout/items')).toMatchObject([
      { id: 'item-1', position: { x: 140, y: 100 } },
      { id: 'item-2', position: { x: 240, y: 100 } },
    ]);

    await user.keyboard('{ArrowRight}');
    await flushRenderer();

    expect(instance.store.get('/data/layout/items')).toMatchObject([
      { id: 'item-1', position: { x: 160, y: 100 } },
      { id: 'item-2', position: { x: 240, y: 100 } },
    ]);
  });

  it('snaps keyboard item commits through the shared edit resolver', async () => {
    const instance = makeInstance();
    instance.applyPlugins();

    render(
      <MythikRenderer
        spec={makeSpec({
          mode: 'edit',
          editPolicy: {
            keyboardStep: 13,
            snap: {
              enabled: true,
              grid: { enabled: true, size: 20, threshold: 8 },
            },
          },
          onItemChange: {
            action: 'setState',
            params: {
              statePath: '/capturedKeyboardSnappedPosition',
              value: { $state: '/ui/spatialItemChange/position' },
            },
          },
        })}
        instance={instance}
      />,
    );

    fireEvent.keyDown(screen.getByTestId('spatial-item-item-1'), { key: 'ArrowRight' });
    await flushRenderer();

    expect(instance.store.get('/capturedKeyboardSnappedPosition')).toEqual({ x: 140, y: 100 });
  });

  it('persists off-grid keyboard snaps through the shared edit resolver', async () => {
    const instance = makeInstance();
    instance.applyPlugins();

    render(
      <MythikRenderer
        spec={makeSpec({
          mode: 'edit',
          items: [
            {
              id: 'item-1',
              label: 'A1',
              zoneId: 'floor',
              position: { x: 133, y: 100 },
              shape: { type: 'circle', radius: 36 },
              status: 'available',
              metadata: { capacity: 4 },
            },
            {
              id: 'item-2',
              label: 'A2',
              position: { x: 240, y: 100 },
              shape: { type: 'rect', width: 80, height: 50, radius: 12 },
              status: 'available',
            },
          ],
          editPolicy: {
            snap: {
              enabled: true,
              grid: { enabled: true, size: 20, threshold: 8 },
            },
          },
          onItemChange: {
            action: 'setState',
            params: {
              statePath: '/capturedOffGridKeyboardPosition',
              value: { $state: '/ui/spatialItemChange/position' },
            },
          },
        })}
        instance={instance}
      />,
    );

    fireEvent.keyDown(screen.getByTestId('spatial-item-item-1'), { key: 'ArrowRight' });
    await flushRenderer();

    expect(instance.store.get('/capturedOffGridKeyboardPosition')).toEqual({ x: 140, y: 100 });
  });

  it('persists moved items with setState and $array replace', async () => {
    const instance = makeInstance();
    instance.store.set('/data/layout/items', [
      {
        id: 'item-1',
        label: 'A1',
        zoneId: 'floor',
        position: { x: 120, y: 100 },
        shape: { type: 'circle', radius: 36 },
        status: 'available',
      },
      {
        id: 'item-2',
        label: 'A2',
        position: { x: 240, y: 100 },
        shape: { type: 'rect', width: 80, height: 50, radius: 12 },
        status: 'available',
      },
    ]);
    instance.applyPlugins();

    render(
      <MythikRenderer
        spec={makeSpec({
          mode: 'edit',
          items: { $state: '/data/layout/items' },
          onItemChange: {
            action: 'setState',
            params: {
              statePath: '/data/layout/items',
              value: {
                $array: 'replace',
                source: { $state: '/data/layout/items' },
                where: {
                  field: 'id',
                  eq: { $state: '/ui/spatialItemChange/itemId' },
                },
                value: { $state: '/ui/spatialItemChange/nextItem' },
              },
            },
          },
        })}
        instance={instance}
      />,
    );

    dragSpecItem('spatial-item-item-1', { x: 120, y: 100 }, { x: 150, y: 115 });
    await flushRenderer();

    expect(instance.store.get('/data/layout/items')).toMatchObject([
      { id: 'item-1', position: { x: 150, y: 115 } },
      { id: 'item-2', position: { x: 240, y: 100 } },
    ]);
    await waitFor(() => {
      expect(screen.getByTestId('spatial-item-item-1').getAttribute('transform')).toContain('translate(150 115)');
    });
  });

  it('writes resize item change before dispatching onItemChange', async () => {
    const instance = makeInstance();
    instance.applyPlugins();
    const spec = makeSpec({
      mode: 'edit',
      selectedItemId: 'item-2',
      onItemChange: {
        action: 'setState',
        params: {
          statePath: '/capturedResizeTransform',
          value: { $state: '/ui/spatialItemChange/nextItem/transform' },
        },
      },
    });

    render(<MythikRenderer spec={spec} instance={instance} />);
    dragSpecHandle('spatial-edit-handle-item-2-e', { x: 280, y: 100 }, { x: 320, y: 100 });
    await flushRenderer();

    expect(instance.store.get('/ui/spatialItemChange')).toMatchObject({
      changeType: 'resize',
      itemId: 'item-2',
      nextItem: { transform: { scaleX: expect.any(Number), scaleY: 1 } },
    });
    expect(instance.store.get('/capturedResizeTransform')).toMatchObject({
      scaleX: expect.any(Number),
      scaleY: 1,
    });
  });

  it('writes rotate item change before dispatching onItemChange', async () => {
    const instance = makeInstance();
    instance.applyPlugins();
    const spec = makeSpec({
      mode: 'edit',
      selectedItemId: 'item-2',
      onItemChange: {
        action: 'setState',
        params: {
          statePath: '/capturedRotation',
          value: { $state: '/ui/spatialItemChange/nextItem/rotation' },
        },
      },
    });

    render(<MythikRenderer spec={spec} instance={instance} />);
    dragSpecHandle('spatial-edit-handle-item-2-rotate', { x: 240, y: 55 }, { x: 290, y: 100 }, 6);
    await flushRenderer();

    expect(instance.store.get('/ui/spatialItemChange')).toMatchObject({
      changeType: 'rotate',
      itemId: 'item-2',
      nextItem: { rotation: expect.any(Number) },
    });
    expect(instance.store.get('/capturedRotation')).toEqual(expect.any(Number));
  });

  it('persists resized and rotated items with setState and $array replace', async () => {
    const instance = makeInstance();
    instance.store.set('/layout/items', [
      {
        id: 'item-2',
        label: 'A2',
        position: { x: 240, y: 100 },
        shape: { type: 'rect', width: 80, height: 50 },
      },
    ]);
    instance.applyPlugins();
    const spec = makeSpec({
      items: { $state: '/layout/items' },
      mode: 'edit',
      selectedItemId: 'item-2',
      onItemChange: {
        action: 'setState',
        params: {
          statePath: '/layout/items',
          value: {
            $array: 'replace',
            source: { $state: '/layout/items' },
            where: { field: 'id', eq: { $state: '/ui/spatialItemChange/itemId' } },
            value: { $state: '/ui/spatialItemChange/nextItem' },
          },
        },
      },
    });

    render(<MythikRenderer spec={spec} instance={instance} />);
    dragSpecHandle('spatial-edit-handle-item-2-e', { x: 280, y: 100 }, { x: 320, y: 100 });
    await flushRenderer();

    expect(instance.store.get('/layout/items')).toEqual([
      expect.objectContaining({
        id: 'item-2',
        transform: { scaleX: expect.any(Number), scaleY: 1 },
      }),
    ]);

    dragSpecHandle('spatial-edit-handle-item-2-rotate', { x: 240, y: 55 }, { x: 290, y: 100 }, 6);
    await flushRenderer();

    expect(instance.store.get('/layout/items')).toEqual([
      expect.objectContaining({
        id: 'item-2',
        rotation: expect.any(Number),
        transform: { scaleX: expect.any(Number), scaleY: 1 },
      }),
    ]);
  });

  it('uses custom itemChangePath when configured', async () => {
    const instance = makeInstance();
    instance.plugins.registerAction({ name: 'noop', handler: async () => {} });
    instance.applyPlugins();

    render(
      <MythikRenderer
        spec={makeSpec({
          mode: 'edit',
          itemChangePath: '/ui/customSpatialChange',
          onItemChange: { action: 'noop' },
        })}
        instance={instance}
      />,
    );

    dragSpecItem('spatial-item-item-1', { x: 120, y: 100 }, { x: 140, y: 110 });
    await flushRenderer();

    expect(instance.store.get('/ui/customSpatialChange')).toMatchObject({ itemId: 'item-1' });
    expect(instance.store.get(RESERVED_PATHS.SPATIAL_ITEM_CHANGE)).toBeUndefined();
  });

  it('dispatches onItemChange action arrays in serial order', async () => {
    const instance = makeInstance();
    const calls: string[] = [];
    instance.plugins.registerAction({
      name: 'slowChange',
      handler: async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        calls.push('slowChange');
      },
    });
    instance.plugins.registerAction({
      name: 'fastChange',
      handler: async () => {
        calls.push('fastChange');
      },
    });
    instance.applyPlugins();

    render(
      <MythikRenderer
        spec={makeSpec({
          mode: 'edit',
          onItemChange: [{ action: 'slowChange' }, { action: 'fastChange' }],
        })}
        instance={instance}
      />,
    );

    dragSpecItem('spatial-item-item-2', { x: 240, y: 100 }, { x: 260, y: 120 });
    await flushRenderer();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(calls).toEqual(['slowChange', 'fastChange']);
  });
});
