import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpatialMap } from '../src/primitives/spatial-map.js';

const zones = [
  {
    id: 'entry',
    label: 'Entry',
    shape: { type: 'rect', x: 20, y: 20, width: 110, height: 70, radius: 12 },
  },
  {
    id: 'main',
    label: 'Main floor',
    shape: {
      type: 'path',
      d: 'M0 0 L400 0 L400 120 L520 120 L520 360 L0 360 Z',
    },
  },
  {
    id: 'patio',
    label: 'Patio',
    shape: {
      type: 'polygon',
      points: [[560, 140], [760, 140], [720, 320], [540, 300]],
    },
  },
] as const;

const items = [
  {
    id: 'rect-1',
    label: 'R1',
    zoneId: 'main',
    position: { x: 120, y: 110 },
    rotation: -10,
    shape: { type: 'rect', width: 120, height: 70, radius: 18 },
    status: 'available',
    metadata: { capacity: 4 },
  },
  {
    id: 'circle-1',
    label: 'C1',
    position: { x: 280, y: 250 },
    shape: { type: 'circle', radius: 48 },
    status: 'occupied',
  },
  {
    id: 'ellipse-1',
    label: 'E1',
    position: { x: 430, y: 250 },
    shape: { type: 'ellipse', radiusX: 70, radiusY: 40 },
    status: 'blocked',
  },
  {
    id: 'polygon-1',
    label: 'P1',
    position: { x: 620, y: 230 },
    shape: { type: 'polygon', points: [[-45, -35], [50, -20], [40, 45], [-55, 35]] },
    status: 'available',
  },
  {
    id: 'path-1',
    label: 'X1',
    position: { x: 710, y: 90 },
    shape: { type: 'path', d: 'M-50 -30 L40 -30 Q60 -30 60 -10 L60 30 L-50 30 Z' },
    status: 'inactive',
  },
] as const;

const statusStyles = {
  available: { fill: '#dcfce7', stroke: '#22c55e', text: '#14532d' },
  occupied: { fill: '#fef9c3', stroke: '#eab308', text: '#713f12' },
  blocked: { fill: '#fee2e2', stroke: '#ef4444', text: '#7f1d1d' },
  inactive: { fill: '#e5e7eb', stroke: '#9ca3af', text: '#374151', opacity: 0.6 },
};

function mockSvgClientRect(svg: Element): void {
  Object.defineProperty(svg, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 800,
      height: 420,
      right: 800,
      bottom: 420,
      toJSON: () => {},
    }),
  });
}

function dragItem(testId: string, from: { x: number; y: number }, to: { x: number; y: number }): void {
  const item = screen.getByTestId(testId);
  const svg = screen.getByLabelText('Spatial plan');
  mockSvgClientRect(svg);
  fireEvent.pointerDown(item, { pointerId: 1, clientX: from.x, clientY: from.y });
  fireEvent.pointerMove(document, { pointerId: 1, clientX: to.x, clientY: to.y });
  fireEvent.pointerUp(document, { pointerId: 1, clientX: to.x, clientY: to.y });
}

function dragZone(testId: string, from: { x: number; y: number }, to: { x: number; y: number }): void {
  const zone = screen.getByTestId(testId);
  const svg = screen.getByLabelText('Spatial plan');
  mockSvgClientRect(svg);
  fireEvent.pointerDown(zone, { pointerId: 3, clientX: from.x, clientY: from.y });
  fireEvent.pointerMove(document, { pointerId: 3, clientX: to.x, clientY: to.y });
  fireEvent.pointerUp(document, { pointerId: 3, clientX: to.x, clientY: to.y });
}

function dragHandle(testId: string, from: { x: number; y: number }, to: { x: number; y: number }): void {
  const handle = screen.getByTestId(testId);
  const svg = screen.getByLabelText('Spatial plan');
  mockSvgClientRect(svg);
  fireEvent.pointerDown(handle, { pointerId: 7, clientX: from.x, clientY: from.y });
  fireEvent.pointerMove(document, { pointerId: 7, clientX: to.x, clientY: to.y });
  fireEvent.pointerUp(document, { pointerId: 7, clientX: to.x, clientY: to.y });
}

function handleCenter(handle: Element): { x: number; y: number } {
  if (handle.tagName.toLowerCase() === 'circle') {
    return {
      x: Number(handle.getAttribute('cx')),
      y: Number(handle.getAttribute('cy')),
    };
  }
  return {
    x: Number(handle.getAttribute('x')) + Number(handle.getAttribute('width')) / 2,
    y: Number(handle.getAttribute('y')) + Number(handle.getAttribute('height')) / 2,
  };
}

describe('SpatialMap primitive', () => {
  it('renders asymmetric zones and all supported item shapes', () => {
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        zones={zones as any}
        items={items as any}
        statusStyles={statusStyles}
        ariaLabel="Spatial plan"
      />,
    );

    expect(screen.getByLabelText('Spatial plan')).toBeTruthy();
    expect(screen.getByTestId('spatial-zone-entry')).toBeTruthy();
    expect(screen.getByTestId('spatial-zone-main')).toBeTruthy();
    expect(screen.getByTestId('spatial-zone-patio')).toBeTruthy();
    expect(screen.getByTestId('spatial-item-rect-1')).toBeTruthy();
    expect(screen.getByTestId('spatial-item-circle-1')).toBeTruthy();
    expect(screen.getByTestId('spatial-item-ellipse-1')).toBeTruthy();
    expect(screen.getByTestId('spatial-item-polygon-1')).toBeTruthy();
    expect(screen.getByTestId('spatial-item-path-1')).toBeTruthy();
  });

  it('preserves the responsive SVG viewBox contract', () => {
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        items={items as any}
        ariaLabel="Spatial plan"
      />,
    );

    const svg = screen.getByLabelText('Spatial plan');

    expect(svg.getAttribute('viewBox')).toBe('0 0 800 420');
    expect(svg.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
    expect((svg as SVGElement).style.width).toBe('100%');
  });

  it('renders a canvas crosshair guide at the current SVG pointer position', () => {
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        items={items as any}
        ariaLabel="Spatial plan"
        canvasGuide={{ visible: true }}
      />,
    );

    const svg = screen.getByLabelText('Spatial plan');
    mockSvgClientRect(svg);
    fireEvent.pointerMove(svg, { clientX: 120, clientY: 140 });

    const vertical = screen.getByTestId('spatial-canvas-guide-x');
    const horizontal = screen.getByTestId('spatial-canvas-guide-y');

    expect(vertical.getAttribute('x1')).toBe('120');
    expect(vertical.getAttribute('x2')).toBe('120');
    expect(vertical.getAttribute('y1')).toBe('0');
    expect(vertical.getAttribute('y2')).toBe('420');
    expect(horizontal.getAttribute('x1')).toBe('0');
    expect(horizontal.getAttribute('x2')).toBe('800');
    expect(horizontal.getAttribute('y1')).toBe('140');
    expect(horizontal.getAttribute('y2')).toBe('140');
    expect(screen.getByTestId('spatial-canvas-guide-point')).toBeTruthy();
  });

  it('hides the canvas guide until explicitly visible', () => {
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        items={items as any}
        ariaLabel="Spatial plan"
        canvasGuide={{ visible: false }}
      />,
    );

    const svg = screen.getByLabelText('Spatial plan');
    mockSvgClientRect(svg);
    fireEvent.pointerMove(svg, { clientX: 120, clientY: 140 });

    expect(screen.queryByTestId('spatial-canvas-guide')).toBeNull();
  });

  it('renders zone rects in map coordinates', () => {
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        zones={zones as any}
        items={[]}
        ariaLabel="Spatial plan"
      />,
    );

    const zoneRect = screen.getByTestId('spatial-zone-shape-entry');

    expect(zoneRect.getAttribute('x')).toBe('20');
    expect(zoneRect.getAttribute('y')).toBe('20');
    expect(zoneRect.getAttribute('width')).toBe('110');
    expect(zoneRect.getAttribute('height')).toBe('70');
  });

  it('selects and activates zones with full context without firing canvas press', async () => {
    const user = userEvent.setup();
    const onZonePress = vi.fn();
    const onCanvasPress = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        zones={zones as any}
        items={[]}
        mode="edit"
        interactionPolicy={{ selectZones: true, activateZones: true, zonePressStopsCanvas: true } as any}
        onZonePress={onZonePress as any}
        onCanvasPress={onCanvasPress}
        ariaLabel="Spatial plan"
      />,
    );

    await user.click(screen.getByTestId('spatial-zone-shape-entry'));

    expect(onZonePress).toHaveBeenCalledTimes(1);
    expect(onZonePress.mock.calls[0][0]).toMatchObject({
      kind: 'zone',
      mode: 'edit',
      zoneId: 'entry',
      label: 'Entry',
      position: { x: 0, y: 0 },
      zone: { id: 'entry', label: 'Entry' },
    });
    expect(onCanvasPress).not.toHaveBeenCalled();
  });

  it('renders selected zone visual independently from selected items', () => {
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        zones={zones as any}
        items={items as any}
        selectedZoneId="entry"
        selectedItemId="rect-1"
        ariaLabel="Spatial plan"
      />,
    );

    expect(screen.getByTestId('spatial-zone-selection-entry')).toBeTruthy();
    expect(screen.getByTestId('spatial-selection-rect-1')).toBeTruthy();
  });

  it('activates enabled items with full context', async () => {
    const user = userEvent.setup();
    const onItemPress = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        zones={zones as any}
        items={items as any}
        statusStyles={statusStyles}
        onItemPress={onItemPress}
      />,
    );

    await user.click(screen.getByTestId('spatial-item-rect-1'));

    expect(onItemPress).toHaveBeenCalledTimes(1);
    expect(onItemPress.mock.calls[0][0]).toMatchObject({
      kind: 'item',
      itemId: 'rect-1',
      zoneId: 'main',
      status: 'available',
      label: 'R1',
      metadata: { capacity: 4 },
      item: { id: 'rect-1', label: 'R1' },
    });
  });

  it('does not activate disabled items', async () => {
    const user = userEvent.setup();
    const onItemPress = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        items={[{ ...items[0], disabled: true }] as any}
        statusStyles={statusStyles}
        onItemPress={onItemPress}
      />,
    );

    await user.click(screen.getByTestId('spatial-item-rect-1'));

    expect(onItemPress).not.toHaveBeenCalled();
  });

  it('activates inactive status items because status is visual only', async () => {
    const user = userEvent.setup();
    const onItemPress = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        items={items as any}
        statusStyles={statusStyles}
        onItemPress={onItemPress}
      />,
    );

    await user.click(screen.getByTestId('spatial-item-path-1'));

    expect(onItemPress).toHaveBeenCalledTimes(1);
    expect(onItemPress.mock.calls[0][0]).toMatchObject({
      itemId: 'path-1',
      status: 'inactive',
      label: 'X1',
    });
  });

  it('fires canvas press when clicking an empty zone surface', async () => {
    const onCanvasPress = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        zones={zones as any}
        items={items as any}
        onCanvasPress={onCanvasPress}
      />,
    );

    const svg = screen.getByLabelText('Spatial map');
    mockSvgClientRect(svg);
    fireEvent.click(screen.getByTestId('spatial-zone-shape-entry'), { clientX: 75, clientY: 55 });

    expect(onCanvasPress).toHaveBeenCalledTimes(1);
    expect(onCanvasPress.mock.calls[0][0]).toMatchObject({
      kind: 'canvas',
      mode: 'operate',
      point: { x: 75, y: 55 },
      zoneId: 'entry',
      zone: { id: 'entry', label: 'Entry' },
      viewBox: { x: 0, y: 0, width: 800, height: 420 },
    });
  });

  it('emits one zone move change after dragging a zone', () => {
    const onZoneChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        zones={zones as any}
        items={[]}
        mode="edit"
        interactionPolicy={{ selectZones: true, zonePressStopsCanvas: true } as any}
        editPolicy={{ dragZones: true } as any}
        onZoneChange={onZoneChange as any}
        ariaLabel="Spatial plan"
      />,
    );

    dragZone('spatial-zone-entry', { x: 50, y: 50 }, { x: 80, y: 70 });

    expect(onZoneChange).toHaveBeenCalledTimes(1);
    expect(onZoneChange.mock.calls[0][0]).toMatchObject({
      kind: 'zone-change',
      changeType: 'move',
      zoneId: 'entry',
      previousPosition: { x: 0, y: 0 },
      position: { x: 30, y: 20 },
      delta: { x: 30, y: 20 },
      previousZone: { shape: zones[0].shape },
      nextZone: { shape: zones[0].shape, position: { x: 30, y: 20 } },
    });
  });

  it('snaps dragged zone anchors to edit guides and commits the snapped position', () => {
    const onZoneChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        zones={[zones[0]] as any}
        items={[]}
        mode="edit"
        selectedZoneId="entry"
        editPolicy={{
          dragZones: true,
          snap: { enabled: true, grid: { enabled: true, size: 20, threshold: 8 } },
          guides: { enabled: true, showSnapLines: true },
        } as any}
        onZoneChange={onZoneChange as any}
        ariaLabel="Spatial plan"
      />,
    );

    const zone = screen.getByTestId('spatial-zone-entry');
    const svg = screen.getByLabelText('Spatial plan');
    mockSvgClientRect(svg);
    fireEvent.pointerDown(zone, { pointerId: 3, clientX: 75, clientY: 55 });
    fireEvent.pointerMove(document, { pointerId: 3, clientX: 83, clientY: 73 });

    expect(screen.getByTestId('spatial-edit-guide-x-grid-80')).toBeTruthy();
    expect(screen.getByTestId('spatial-edit-guide-y-grid-80')).toBeTruthy();

    fireEvent.pointerUp(document, { pointerId: 3, clientX: 83, clientY: 73 });
    expect(onZoneChange).toHaveBeenCalledTimes(1);
    expect(onZoneChange.mock.calls[0][0]).toMatchObject({
      kind: 'zone-change',
      changeType: 'move',
      zoneId: 'entry',
      nextZone: { position: { x: 5, y: 25 } },
    });
  });

  it('moves focused zone with arrow keys in edit mode', async () => {
    const user = userEvent.setup();
    const onZoneChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        zones={zones as any}
        items={[]}
        mode="edit"
        selectedZoneId="entry"
        interactionPolicy={{ selectZones: true } as any}
        editPolicy={{ keyboardMoveZones: true } as any}
        onZoneChange={onZoneChange as any}
        ariaLabel="Spatial plan"
      />,
    );

    screen.getByTestId('spatial-zone-entry').focus();
    await user.keyboard('{ArrowRight}');

    expect(onZoneChange).toHaveBeenCalledTimes(1);
    expect(onZoneChange.mock.calls[0][0]).toMatchObject({
      changeType: 'move',
      zoneId: 'entry',
      position: { x: 1, y: 0 },
      delta: { x: 1, y: 0 },
    });
  });

  it('uses the snap engine for focused zone keyboard movement', async () => {
    const user = userEvent.setup();
    const onZoneChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        zones={[zones[0]] as any}
        items={[]}
        mode="edit"
        selectedZoneId="entry"
        interactionPolicy={{ selectZones: true } as any}
        editPolicy={{
          keyboardMoveZones: true,
          snap: { enabled: true, grid: { enabled: true, size: 20, threshold: 4 } },
        } as any}
        onZoneChange={onZoneChange as any}
        ariaLabel="Spatial plan"
      />,
    );

    screen.getByTestId('spatial-zone-entry').focus();
    await user.keyboard('{ArrowRight}');

    expect(onZoneChange).toHaveBeenCalledTimes(1);
    expect(onZoneChange.mock.calls[0][0]).toMatchObject({
      kind: 'zone-change',
      changeType: 'move',
      zoneId: 'entry',
      nextZone: { position: { x: 5, y: 0 } },
    });
  });

  it('renders resize handles for selected editable zones', () => {
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        zones={[zones[0]] as any}
        items={[]}
        mode="edit"
        selectedZoneId="entry"
        editPolicy={{ resizeZones: true } as any}
        ariaLabel="Spatial plan"
      />,
    );

    expect(screen.getByTestId('spatial-zone-edit-handles-entry')).toBeTruthy();
    expect(screen.getByTestId('spatial-zone-edit-handle-entry-e')).toBeTruthy();
    expect(screen.getByTestId('spatial-zone-edit-handle-entry-sw')).toBeTruthy();
  });

  it('emits one zone resize change after dragging a zone handle', () => {
    const onZoneChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        zones={[zones[0]] as any}
        items={[]}
        mode="edit"
        selectedZoneId="entry"
        editPolicy={{ resizeZones: true } as any}
        onZoneChange={onZoneChange as any}
        ariaLabel="Spatial plan"
      />,
    );

    dragHandle('spatial-zone-edit-handle-entry-e', { x: 130, y: 55 }, { x: 185, y: 55 });

    expect(onZoneChange).toHaveBeenCalledTimes(1);
    expect(onZoneChange.mock.calls[0][0]).toMatchObject({
      kind: 'zone-change',
      changeType: 'resize',
      zoneId: 'entry',
      previousTransform: { scaleX: 1, scaleY: 1 },
      transform: { scaleX: 1.5, scaleY: 1 },
      previousZone: { shape: zones[0].shape },
      nextZone: { shape: zones[0].shape, transform: { scaleX: 1.5, scaleY: 1 } },
    });
  });

  it('resizes focused zone with ctrl arrow keys in edit mode', async () => {
    const user = userEvent.setup();
    const onZoneChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        zones={[zones[0]] as any}
        items={[]}
        mode="edit"
        selectedZoneId="entry"
        interactionPolicy={{ selectZones: true } as any}
        editPolicy={{ keyboardResizeZones: true } as any}
        onZoneChange={onZoneChange as any}
        ariaLabel="Spatial plan"
      />,
    );

    screen.getByTestId('spatial-zone-entry').focus();
    await user.keyboard('{Control>}{ArrowRight}{/Control}');

    expect(onZoneChange).toHaveBeenCalledTimes(1);
    expect(onZoneChange.mock.calls[0][0]).toMatchObject({
      changeType: 'resize',
      zoneId: 'entry',
      nextZone: { transform: { scaleX: 1.05, scaleY: 1 } },
    });
  });

  it('does not render resize handles for path zones without localBounds', () => {
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        zones={[{ id: 'path-zone', shape: { type: 'path', d: 'M0 0 L10 10' } }] as any}
        items={[]}
        mode="edit"
        selectedZoneId="path-zone"
        editPolicy={{ resizeZones: true } as any}
        ariaLabel="Spatial plan"
      />,
    );

    expect(screen.queryByTestId('spatial-zone-edit-handle-path-zone-e')).toBeNull();
  });

  it('does not treat item activation as a canvas press', async () => {
    const user = userEvent.setup();
    const onItemPress = vi.fn();
    const onCanvasPress = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        items={items as any}
        onItemPress={onItemPress}
        onCanvasPress={onCanvasPress}
      />,
    );

    await user.click(screen.getByTestId('spatial-item-rect-1'));

    expect(onItemPress).toHaveBeenCalledTimes(1);
    expect(onCanvasPress).not.toHaveBeenCalled();
  });

  it('supports keyboard activation with Enter and Space', async () => {
    const user = userEvent.setup();
    const onItemPress = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        items={items as any}
        onItemPress={onItemPress}
      />,
    );

    const item = screen.getByRole('button', { name: /R1, available/i });
    item.focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(onItemPress).toHaveBeenCalledTimes(2);
  });

  it('marks selected item without changing geometry', () => {
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        items={items as any}
        selectedItemId="rect-1"
      />,
    );

    const selected = screen.getByTestId('spatial-item-rect-1');
    const shape = screen.getByTestId('spatial-shape-rect-1');
    const selection = screen.getByTestId('spatial-selection-rect-1');

    expect(selected.getAttribute('data-selected')).toBe('true');
    expect(shape.getAttribute('x')).toBe('-60');
    expect(shape.getAttribute('width')).toBe('120');
    expect(selection.getAttribute('x')).toBe('-60');
    expect(selection.getAttribute('width')).toBe('120');
  });

  it('keeps rotated item labels upright with a counter-rotation', () => {
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        items={items as any}
      />,
    );

    expect(screen.getByTestId('spatial-label-rect-1').getAttribute('transform')).toBe('rotate(10)');
  });

  it('renders scaled items and keeps labels readable', () => {
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        items={[{
          ...items[0],
          transform: { scaleX: 1.5, scaleY: 0.75 },
        }] as any}
        mode="edit"
        selectedItemId="rect-1"
        ariaLabel="Spatial plan"
      />,
    );

    expect(screen.getByTestId('spatial-item-rect-1').getAttribute('transform')).toBe(
      'translate(120 110) rotate(-10) scale(1.5 0.75)',
    );
    expect(screen.getByTestId('spatial-label-rect-1').getAttribute('transform')).toBe(
      'scale(0.6666666666666666 1.3333333333333333) rotate(10)',
    );
  });

  it('renders resize and rotate handles for the selected editable item', () => {
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        items={items as any}
        mode="edit"
        selectedItemId="rect-1"
        ariaLabel="Spatial plan"
      />,
    );

    expect(screen.getByTestId('spatial-edit-handles-rect-1')).toBeTruthy();
    for (const handle of ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw', 'rotate']) {
      expect(screen.getByTestId(`spatial-edit-handle-rect-1-${handle}`)).toBeTruthy();
    }
  });

  it('emits one resize change after dragging a resize handle', () => {
    const onItemChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        items={[items[0]] as any}
        mode="edit"
        selectedItemId="rect-1"
        onItemChange={onItemChange}
        ariaLabel="Spatial plan"
      />,
    );

    dragHandle('spatial-edit-handle-rect-1-e', { x: 180, y: 110 }, { x: 240, y: 110 });

    expect(onItemChange).toHaveBeenCalledTimes(1);
    expect(onItemChange.mock.calls[0][0]).toMatchObject({
      changeType: 'resize',
      itemId: 'rect-1',
      previousTransform: { scaleX: 1, scaleY: 1 },
      transform: { scaleX: expect.any(Number), scaleY: 1 },
      nextItem: { transform: { scaleX: expect.any(Number), scaleY: 1 } },
    });
    expect(onItemChange.mock.calls[0][0].nextItem.transform.scaleX).toBeGreaterThan(1);
  });

  it('previews resize locally and does not emit before pointer up', () => {
    const onItemChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        items={[items[0]] as any}
        mode="edit"
        selectedItemId="rect-1"
        onItemChange={onItemChange}
        ariaLabel="Spatial plan"
      />,
    );

    const handle = screen.getByTestId('spatial-edit-handle-rect-1-e');
    const svg = screen.getByLabelText('Spatial plan');
    mockSvgClientRect(svg);
    fireEvent.pointerDown(handle, { pointerId: 7, clientX: 180, clientY: 110 });
    fireEvent.pointerMove(document, { pointerId: 7, clientX: 240, clientY: 110 });

    expect(onItemChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('spatial-item-rect-1').getAttribute('transform')).toContain('scale(');

    fireEvent.pointerUp(document, { pointerId: 7, clientX: 240, clientY: 110 });
    expect(onItemChange).toHaveBeenCalledTimes(1);
  });

  it('keeps a dropped resized item scaled when immediately touched again before host persistence rerenders', () => {
    const onItemChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        items={[items[0]] as any}
        mode="edit"
        selectedItemId="rect-1"
        onItemChange={onItemChange}
        ariaLabel="Spatial plan"
      />,
    );

    const item = screen.getByTestId('spatial-item-rect-1');
    const handle = screen.getByTestId('spatial-edit-handle-rect-1-e');
    const svg = screen.getByLabelText('Spatial plan');
    mockSvgClientRect(svg);
    fireEvent.pointerDown(handle, { pointerId: 7, clientX: 180, clientY: 110 });
    fireEvent.pointerMove(document, { pointerId: 7, clientX: 240, clientY: 110 });
    fireEvent.pointerUp(document, { pointerId: 7, clientX: 240, clientY: 110 });

    const resizedTransform = item.getAttribute('transform');
    expect(resizedTransform).toContain('scale(');
    expect(resizedTransform).not.toContain('scale(1 1)');

    fireEvent.pointerDown(item, { pointerId: 8, clientX: 120, clientY: 110 });

    expect(item.getAttribute('transform')).toBe(resizedTransform);
    fireEvent.pointerCancel(document, { pointerId: 8, clientX: 120, clientY: 110 });
  });

  it('continues resizing from the current rendered scale on repeated handle drags', () => {
    const onItemChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        items={[items[0]] as any}
        mode="edit"
        selectedItemId="rect-1"
        onItemChange={onItemChange}
        ariaLabel="Spatial plan"
      />,
    );

    const item = screen.getByTestId('spatial-item-rect-1');
    const svg = screen.getByLabelText('Spatial plan');
    mockSvgClientRect(svg);
    fireEvent.pointerDown(screen.getByTestId('spatial-edit-handle-rect-1-e'), {
      pointerId: 7,
      clientX: 180,
      clientY: 110,
    });
    fireEvent.pointerMove(document, { pointerId: 7, clientX: 240, clientY: 110 });
    fireEvent.pointerUp(document, { pointerId: 7, clientX: 240, clientY: 110 });
    const firstScale = Number(item.getAttribute('transform')?.match(/scale\(([^ ]+)/)?.[1]);

    const nextHandle = handleCenter(screen.getByTestId('spatial-edit-handle-rect-1-e'));
    fireEvent.pointerDown(screen.getByTestId('spatial-edit-handle-rect-1-e'), {
      pointerId: 8,
      clientX: nextHandle.x,
      clientY: nextHandle.y,
    });
    fireEvent.pointerMove(document, { pointerId: 8, clientX: nextHandle.x + 40, clientY: nextHandle.y });
    fireEvent.pointerUp(document, { pointerId: 8, clientX: nextHandle.x + 40, clientY: nextHandle.y });
    const secondScale = Number(item.getAttribute('transform')?.match(/scale\(([^ ]+)/)?.[1]);

    expect(firstScale).toBeGreaterThan(1);
    expect(secondScale).toBeGreaterThan(firstScale);
  });

  it('renders snap guides while resizing and commits the snapped active handle point', () => {
    const onItemChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        items={[{ ...items[0], rotation: 30 }] as any}
        mode="edit"
        selectedItemId="rect-1"
        editPolicy={{
          snap: { enabled: true, grid: { enabled: true, size: 20, threshold: 8 } },
          guides: { enabled: true, showSnapLines: true },
        }}
        onItemChange={onItemChange}
        ariaLabel="Spatial plan"
      />,
    );

    const handle = screen.getByTestId('spatial-edit-handle-rect-1-e');
    const svg = screen.getByLabelText('Spatial plan');
    mockSvgClientRect(svg);
    fireEvent.pointerDown(handle, { pointerId: 7, clientX: 180, clientY: 110 });
    fireEvent.pointerMove(document, { pointerId: 7, clientX: 218, clientY: 118 });

    expect(screen.getAllByTestId(/spatial-edit-guide-/).length).toBeGreaterThan(0);

    fireEvent.pointerUp(document, { pointerId: 7, clientX: 218, clientY: 118 });
    expect(onItemChange).toHaveBeenCalledTimes(1);
    expect(onItemChange.mock.calls[0][0].changeType).toBe('resize');
  });

  it('clears active resize without committing on pointer cancel', () => {
    const onItemChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        items={[items[0]] as any}
        mode="edit"
        selectedItemId="rect-1"
        onItemChange={onItemChange}
        ariaLabel="Spatial plan"
      />,
    );

    const handle = screen.getByTestId('spatial-edit-handle-rect-1-e');
    const svg = screen.getByLabelText('Spatial plan');
    mockSvgClientRect(svg);
    fireEvent.pointerDown(handle, { pointerId: 7, clientX: 180, clientY: 110 });
    fireEvent.pointerMove(document, { pointerId: 7, clientX: 240, clientY: 110 });
    fireEvent.pointerCancel(document, { pointerId: 7, clientX: 240, clientY: 110 });
    fireEvent.pointerUp(document, { pointerId: 7, clientX: 240, clientY: 110 });

    expect(onItemChange).not.toHaveBeenCalled();
  });

  it('emits one rotate change after dragging the rotate handle', () => {
    const onItemChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        items={[items[0]] as any}
        mode="edit"
        selectedItemId="rect-1"
        onItemChange={onItemChange}
        ariaLabel="Spatial plan"
      />,
    );

    dragHandle('spatial-edit-handle-rect-1-rotate', { x: 120, y: 55 }, { x: 175, y: 110 });

    expect(onItemChange).toHaveBeenCalledTimes(1);
    expect(onItemChange.mock.calls[0][0]).toMatchObject({
      changeType: 'rotate',
      itemId: 'rect-1',
      previousRotation: -10,
      rotation: expect.any(Number),
      nextItem: { rotation: expect.any(Number) },
    });
  });

  it('clears active rotate without committing on pointer cancel', () => {
    const onItemChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        items={[items[0]] as any}
        mode="edit"
        selectedItemId="rect-1"
        onItemChange={onItemChange}
        ariaLabel="Spatial plan"
      />,
    );

    const handle = screen.getByTestId('spatial-edit-handle-rect-1-rotate');
    const svg = screen.getByLabelText('Spatial plan');
    mockSvgClientRect(svg);
    fireEvent.pointerDown(handle, { pointerId: 9, clientX: 120, clientY: 55 });
    fireEvent.pointerMove(document, { pointerId: 9, clientX: 175, clientY: 110 });
    fireEvent.pointerCancel(document, { pointerId: 9, clientX: 175, clientY: 110 });
    fireEvent.pointerUp(document, { pointerId: 9, clientX: 175, clientY: 110 });

    expect(onItemChange).not.toHaveBeenCalled();
  });

  it('does not render edit handles outside edit mode even when policy flags are true', () => {
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        items={items as any}
        mode="operate"
        selectedItemId="rect-1"
        editPolicy={{ resizeItems: true, rotateItems: true }}
        ariaLabel="Spatial plan"
      />,
    );

    expect(screen.queryByTestId('spatial-edit-handles-rect-1')).toBeNull();
  });

  it('does not render resize handles for path items without localBounds', () => {
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        items={items as any}
        mode="edit"
        selectedItemId="path-1"
        ariaLabel="Spatial plan"
      />,
    );

    expect(screen.queryByTestId('spatial-edit-handle-path-1-e')).toBeNull();
    expect(screen.getByTestId('spatial-edit-handle-path-1-rotate')).toBeTruthy();
  });

  it('renders resize handles for path items with localBounds', () => {
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        items={[{
          ...items[4],
          localBounds: { x: -56, y: -28, width: 118, height: 56 },
        }] as any}
        mode="edit"
        selectedItemId="path-1"
        ariaLabel="Spatial plan"
      />,
    );

    expect(screen.getByTestId('spatial-edit-handle-path-1-e')).toBeTruthy();
    expect(screen.getByTestId('spatial-edit-handle-path-1-rotate')).toBeTruthy();
  });

  it('keeps rotate handle gap stable when item scale changes', () => {
    const scaledItem = {
      ...items[0],
      rotation: 0,
      transform: { scaleX: 4, scaleY: 4 },
    };
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        items={[scaledItem] as any}
        mode="edit"
        selectedItemId="rect-1"
        ariaLabel="Spatial plan"
      />,
    );

    const top = handleCenter(screen.getByTestId('spatial-edit-handle-rect-1-n'));
    const rotate = handleCenter(screen.getByTestId('spatial-edit-handle-rect-1-rotate'));

    expect(top.y - rotate.y).toBe(28);
  });

  it('honors readonly mode by rendering without item buttons', () => {
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="readonly"
        items={items as any}
      />,
    );

    expect(screen.queryByRole('button', { name: /R1/i })).toBeNull();
  });

  it('allows explicit readonly selection without activation', async () => {
    const user = userEvent.setup();
    const onItemSelect = vi.fn();
    const onItemPress = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="readonly"
        interactionPolicy={{ selectItems: true, activateItems: false }}
        items={items as any}
        _onItemSelect={onItemSelect}
        onItemPress={onItemPress}
      />,
    );

    await user.click(screen.getByTestId('spatial-item-rect-1'));

    expect(onItemSelect).toHaveBeenCalledTimes(1);
    expect(onItemPress).not.toHaveBeenCalled();
  });

  it('emits one item change on drag drop in edit mode', () => {
    const onItemChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        zones={zones as any}
        items={items as any}
        statusStyles={statusStyles}
        ariaLabel="Spatial plan"
        onItemChange={onItemChange}
      />,
    );

    dragItem('spatial-item-rect-1', { x: 120, y: 110 }, { x: 160, y: 125 });

    expect(onItemChange).toHaveBeenCalledTimes(1);
    expect(onItemChange.mock.calls[0][0]).toMatchObject({
      kind: 'item-change',
      changeType: 'move',
      mode: 'edit',
      itemId: 'rect-1',
      previousPosition: { x: 120, y: 110 },
      position: { x: 160, y: 125 },
      delta: { x: 40, y: 15 },
      previousItem: { id: 'rect-1', position: { x: 120, y: 110 } },
      nextItem: { id: 'rect-1', position: { x: 160, y: 125 } },
      item: { id: 'rect-1', position: { x: 160, y: 125 } },
    });
  });

  it('updates drag preview locally and does not emit change before pointer up', () => {
    const onItemChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        items={items as any}
        ariaLabel="Spatial plan"
        onItemChange={onItemChange}
      />,
    );

    const item = screen.getByTestId('spatial-item-rect-1');
    const svg = screen.getByLabelText('Spatial plan');
    mockSvgClientRect(svg);

    fireEvent.pointerDown(item, { pointerId: 1, clientX: 120, clientY: 110 });
    fireEvent.pointerMove(document, { pointerId: 1, clientX: 160, clientY: 125 });

    expect(onItemChange).not.toHaveBeenCalled();
    expect(item.getAttribute('transform')).toContain('translate(160 125)');

    fireEvent.pointerUp(document, { pointerId: 1, clientX: 160, clientY: 125 });
    expect(onItemChange).toHaveBeenCalledTimes(1);
  });

  it('keeps the dropped position visible while parent state catches up', () => {
    const onItemChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        items={items as any}
        ariaLabel="Spatial plan"
        onItemChange={onItemChange}
      />,
    );

    const item = screen.getByTestId('spatial-item-rect-1');
    const svg = screen.getByLabelText('Spatial plan');
    mockSvgClientRect(svg);

    fireEvent.pointerDown(item, { pointerId: 1, clientX: 120, clientY: 110 });
    fireEvent.pointerMove(document, { pointerId: 1, clientX: 160, clientY: 125 });
    fireEvent.pointerUp(document, { pointerId: 1, clientX: 160, clientY: 125 });

    expect(onItemChange).toHaveBeenCalledTimes(1);
    expect(item.getAttribute('transform')).toContain('translate(160 125)');
  });

  it('does not emit item change for click without movement', () => {
    const onItemChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        items={items as any}
        ariaLabel="Spatial plan"
        onItemChange={onItemChange}
      />,
    );

    dragItem('spatial-item-rect-1', { x: 120, y: 110 }, { x: 120, y: 110 });

    expect(onItemChange).not.toHaveBeenCalled();
  });

  it('does not move disabled items', () => {
    const onItemChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        items={[{ ...items[0], id: 'disabled-1', disabled: true }] as any}
        ariaLabel="Spatial plan"
        onItemChange={onItemChange}
      />,
    );

    dragItem('spatial-item-disabled-1', { x: 120, y: 110 }, { x: 180, y: 140 });

    expect(onItemChange).not.toHaveBeenCalled();
  });

  it('moves inactive status items in edit mode because status is visual only', () => {
    const onItemChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        items={[{ ...items[1], id: 'inactive-1', status: 'inactive' }] as any}
        ariaLabel="Spatial plan"
        onItemChange={onItemChange}
      />,
    );

    dragItem('spatial-item-inactive-1', { x: 280, y: 250 }, { x: 330, y: 260 });

    expect(onItemChange).toHaveBeenCalledTimes(1);
    expect(onItemChange.mock.calls[0][0]).toMatchObject({
      itemId: 'inactive-1',
      previousPosition: { x: 280, y: 250 },
      position: { x: 330, y: 260 },
      nextItem: { id: 'inactive-1', status: 'inactive', position: { x: 330, y: 260 } },
    });
  });

  it('clamps dragged item position to the viewBox', () => {
    const onItemChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        items={items as any}
        ariaLabel="Spatial plan"
        onItemChange={onItemChange}
      />,
    );

    dragItem('spatial-item-rect-1', { x: 120, y: 110 }, { x: -40, y: 700 });

    expect(onItemChange.mock.calls[0][0]).toMatchObject({
      position: { x: 0, y: 420 },
    });
  });

  it('rounds dragged item position using coordinatePrecision', () => {
    const onItemChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        editPolicy={{ coordinatePrecision: 1 }}
        items={items as any}
        ariaLabel="Spatial plan"
        onItemChange={onItemChange}
      />,
    );

    dragItem('spatial-item-rect-1', { x: 120, y: 110 }, { x: 160.44, y: 125.55 });

    expect(onItemChange.mock.calls[0][0]).toMatchObject({
      position: { x: 160.4, y: 125.6 },
    });
  });

  it('allows dragged item position outside the viewBox when bounds is none', () => {
    const onItemChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        editPolicy={{ bounds: 'none' }}
        items={items as any}
        ariaLabel="Spatial plan"
        onItemChange={onItemChange}
      />,
    );

    dragItem('spatial-item-rect-1', { x: 120, y: 110 }, { x: 900, y: 500 });

    expect(onItemChange.mock.calls[0][0]).toMatchObject({
      position: { x: 900, y: 500 },
    });
  });

  it('continues dragging when the pointer leaves the svg visual bounds', () => {
    const onItemChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        items={items as any}
        ariaLabel="Spatial plan"
        onItemChange={onItemChange}
      />,
    );

    dragItem('spatial-item-rect-1', { x: 120, y: 110 }, { x: 900, y: 500 });

    expect(onItemChange.mock.calls[0][0]).toMatchObject({
      position: { x: 800, y: 420 },
    });
  });

  it('clears active drag without committing on pointer cancel', () => {
    const onItemChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        items={items as any}
        ariaLabel="Spatial plan"
        onItemChange={onItemChange}
      />,
    );

    const item = screen.getByTestId('spatial-item-rect-1');
    const svg = screen.getByLabelText('Spatial plan');
    mockSvgClientRect(svg);

    fireEvent.pointerDown(item, { pointerId: 1, clientX: 120, clientY: 110 });
    fireEvent.pointerMove(document, { pointerId: 1, clientX: 160, clientY: 125 });
    fireEvent.pointerCancel(document, { pointerId: 1, clientX: 160, clientY: 125 });
    fireEvent.pointerUp(document, { pointerId: 1, clientX: 160, clientY: 125 });

    expect(onItemChange).not.toHaveBeenCalled();
    expect(item.getAttribute('transform')).toContain('translate(120 110)');
  });

  it('does not let an invalid item position break dragging valid items', () => {
    const onItemChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        items={[
          { ...items[0], id: 'invalid-1', position: { x: Number.NaN, y: 110 } },
          { ...items[1], id: 'valid-1', position: { x: 240, y: 100 } },
        ] as any}
        ariaLabel="Spatial plan"
        onItemChange={onItemChange}
      />,
    );

    dragItem('spatial-item-valid-1', { x: 240, y: 100 }, { x: 260, y: 115 });

    expect(onItemChange.mock.calls[0][0]).toMatchObject({
      itemId: 'valid-1',
      position: { x: 260, y: 115 },
    });
  });

  it('supports string viewBox values in edit mode', () => {
    const onItemChange = vi.fn();
    render(
      <SpatialMap
        viewBox="0 0 800 420"
        mode="edit"
        items={items as any}
        ariaLabel="Spatial plan"
        onItemChange={onItemChange}
      />,
    );

    dragItem('spatial-item-rect-1', { x: 120, y: 110 }, { x: 160, y: 125 });

    expect(onItemChange.mock.calls[0][0]).toMatchObject({
      position: { x: 160, y: 125 },
    });
  });

  it('renders polygon vertex handles in zone shape edit mode and hides resize handles', () => {
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        selectedZoneId="zone-a"
        zoneShapeEditId="zone-a"
        zones={[{
          id: 'zone-a',
          shape: { type: 'polygon', points: [{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 70 }, { x: 10, y: 70 }] },
        }] as any}
        ariaLabel="Spatial plan"
      />,
    );

    expect(screen.getByTestId('spatial-zone-shape-handles-zone-a')).toBeTruthy();
    expect(screen.getByTestId('spatial-zone-vertex-handle-zone-a-0')).toBeTruthy();
    expect(screen.getByTestId('spatial-zone-segment-handle-zone-a-0')).toBeTruthy();
    expect(screen.queryByTestId('spatial-zone-edit-handle-zone-a-se')).toBeNull();
  });

  it('communicates polygon vertex move and segment insert handles', () => {
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        selectedZoneId="zone-a"
        zoneShapeEditId="zone-a"
        zones={[{
          id: 'zone-a',
          label: 'Main area',
          shape: { type: 'polygon', points: [{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 70 }, { x: 10, y: 70 }] },
        }] as any}
        ariaLabel="Spatial plan"
      />,
    );

    const vertex = screen.getByTestId('spatial-zone-vertex-handle-zone-a-0') as SVGCircleElement;
    const segment = screen.getByTestId('spatial-zone-segment-handle-zone-a-0') as SVGCircleElement;

    expect(vertex.dataset.action).toBe('move-vertex');
    expect(vertex.style.cursor).toBe('grab');
    expect(vertex.querySelector('title')?.textContent).toBe('Move vertex 1 of Main area');
    expect(vertex.getAttribute('aria-label')).toBe('Move vertex 1 of Main area');

    expect(segment.dataset.action).toBe('insert-vertex');
    expect(segment.style.cursor).toBe('copy');
    expect(segment.querySelector('title')?.textContent).toBe('Insert vertex between points 1 and 2 of Main area');
    expect(segment.getAttribute('aria-label')).toBe('Insert vertex between points 1 and 2 of Main area');
    expect(screen.getByTestId('spatial-zone-segment-handle-plus-zone-a-0-x')).toBeTruthy();
    expect(screen.getByTestId('spatial-zone-segment-handle-plus-zone-a-0-y')).toBeTruthy();
  });

  it('emits one shape change after dragging a polygon vertex handle', () => {
    const onZoneChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        selectedZoneId="zone-a"
        zoneShapeEditId="zone-a"
        zones={[{
          id: 'zone-a',
          shape: { type: 'polygon', points: [{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 70 }] },
        }] as any}
        onZoneChange={onZoneChange}
        ariaLabel="Spatial plan"
      />,
    );
    const svg = screen.getByRole('img');
    mockSvgClientRect(svg);

    dragHandle('spatial-zone-vertex-handle-zone-a-1', { x: 90, y: 10 }, { x: 110, y: 20 });

    expect(onZoneChange).toHaveBeenCalledTimes(1);
    expect(onZoneChange.mock.calls[0][0]).toMatchObject({
      changeType: 'shape',
      shapeAction: 'move-vertex',
      vertexIndex: 1,
      nextZone: {
        shape: {
          type: 'polygon',
          points: [{ x: 10, y: 10 }, { x: 110, y: 20 }, { x: 90, y: 70 }],
        },
      },
    });
  });

  it('inserts a polygon vertex from a segment handle click', () => {
    const onZoneChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        selectedZoneId="zone-a"
        zoneShapeEditId="zone-a"
        zones={[{
          id: 'zone-a',
          shape: { type: 'polygon', points: [{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 70 }] },
        }] as any}
        onZoneChange={onZoneChange}
        ariaLabel="Spatial plan"
      />,
    );

    fireEvent.click(screen.getByTestId('spatial-zone-segment-handle-zone-a-0'), { clientX: 50, clientY: 10 });

    expect(onZoneChange).toHaveBeenCalledTimes(1);
    expect(onZoneChange.mock.calls[0][0]).toMatchObject({
      changeType: 'shape',
      shapeAction: 'insert-vertex',
      segmentIndex: 0,
      nextZone: {
        shape: {
          points: [{ x: 10, y: 10 }, { x: 50, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 70 }],
        },
      },
    });
  });

  it('inserts a polygon vertex from a focused segment handle with keyboard activation', async () => {
    const user = userEvent.setup();
    const onZoneChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        selectedZoneId="zone-a"
        zoneShapeEditId="zone-a"
        zones={[{
          id: 'zone-a',
          shape: { type: 'polygon', points: [{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 70 }] },
        }] as any}
        onZoneChange={onZoneChange}
        ariaLabel="Spatial plan"
      />,
    );

    const segment = screen.getByTestId('spatial-zone-segment-handle-zone-a-0');
    segment.focus();
    await user.keyboard('{Enter}');

    expect(onZoneChange).toHaveBeenCalledTimes(1);
    expect(onZoneChange.mock.calls[0][0]).toMatchObject({
      changeType: 'shape',
      shapeAction: 'insert-vertex',
      segmentIndex: 0,
    });
  });

  it('does not commit polygon vertex insertion on pointer down alone', () => {
    const onZoneChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        selectedZoneId="zone-a"
        zoneShapeEditId="zone-a"
        zones={[{
          id: 'zone-a',
          shape: { type: 'polygon', points: [{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 70 }] },
        }] as any}
        onZoneChange={onZoneChange}
        ariaLabel="Spatial plan"
      />,
    );

    fireEvent.pointerDown(screen.getByTestId('spatial-zone-segment-handle-zone-a-0'), { pointerId: 1, clientX: 50, clientY: 10 });

    expect(onZoneChange).not.toHaveBeenCalled();
  });

  it('renders snap guides while dragging polygon vertices and commits the snapped point', () => {
    const onZoneChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        selectedZoneId="zone-a"
        zoneShapeEditId="zone-a"
        editPolicy={{
          snap: { enabled: true, grid: { enabled: true, size: 20, threshold: 8 } },
          guides: { enabled: true, showSnapLines: true },
        }}
        zones={[{
          id: 'zone-a',
          shape: { type: 'polygon', points: [{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 70 }] },
        }] as any}
        onZoneChange={onZoneChange}
        ariaLabel="Spatial plan"
      />,
    );
    const svg = screen.getByRole('img');
    mockSvgClientRect(svg);

    fireEvent.pointerDown(screen.getByTestId('spatial-zone-vertex-handle-zone-a-1'), { pointerId: 1, clientX: 90, clientY: 10 });
    fireEvent.pointerMove(document, { pointerId: 1, clientX: 104, clientY: 24 });

    expect(screen.getByTestId('spatial-edit-guide-x-grid-100')).toBeTruthy();
    expect(screen.getByTestId('spatial-edit-guide-y-grid-20')).toBeTruthy();

    fireEvent.pointerUp(document, { pointerId: 1, clientX: 104, clientY: 24 });

    expect(onZoneChange).toHaveBeenCalledTimes(1);
    expect(onZoneChange.mock.calls[0][0].nextZone.shape.points[1]).toEqual({ x: 100, y: 20 });
  });

  it('resolves clicked polygon segment insertion through snap without moving the visible midpoint handle', () => {
    const onZoneChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        selectedZoneId="zone-a"
        zoneShapeEditId="zone-a"
        editPolicy={{
          snap: { enabled: true, grid: { enabled: true, size: 20, threshold: 8 } },
        }}
        zones={[{
          id: 'zone-a',
          shape: { type: 'polygon', points: [{ x: 12, y: 10 }, { x: 92, y: 10 }, { x: 92, y: 70 }] },
        }] as any}
        onZoneChange={onZoneChange}
        ariaLabel="Spatial plan"
      />,
    );

    const segment = screen.getByTestId('spatial-zone-segment-handle-zone-a-0');
    expect(segment.getAttribute('cx')).toBe('52');
    expect(segment.getAttribute('cy')).toBe('10');

    fireEvent.click(segment, { clientX: 52, clientY: 10 });

    expect(onZoneChange).toHaveBeenCalledTimes(1);
    expect(onZoneChange.mock.calls[0][0].nextZone.shape.points[1]).toEqual({ x: 60, y: 10 });
  });

  it('clears active polygon vertex drag without committing on pointer cancel', () => {
    const onZoneChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        selectedZoneId="zone-a"
        zoneShapeEditId="zone-a"
        zones={[{
          id: 'zone-a',
          shape: { type: 'polygon', points: [{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 70 }] },
        }] as any}
        onZoneChange={onZoneChange}
        ariaLabel="Spatial plan"
      />,
    );
    const svg = screen.getByRole('img');
    mockSvgClientRect(svg);

    fireEvent.pointerDown(screen.getByTestId('spatial-zone-vertex-handle-zone-a-1'), { pointerId: 1, clientX: 90, clientY: 10 });
    fireEvent.pointerMove(document, { pointerId: 1, clientX: 120, clientY: 20 });
    fireEvent.pointerCancel(document, { pointerId: 1, clientX: 120, clientY: 20 });
    fireEvent.pointerUp(document, { pointerId: 1, clientX: 120, clientY: 20 });

    expect(onZoneChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('spatial-zone-vertex-handle-zone-a-1').getAttribute('cx')).toBe('90');
  });

  it('does not render shape handles for non-polygon zones', () => {
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        selectedZoneId="zone-a"
        zoneShapeEditId="zone-a"
        zones={[{
          id: 'zone-a',
          shape: { type: 'rect', x: 10, y: 10, width: 80, height: 50 },
        }] as any}
        ariaLabel="Spatial plan"
      />,
    );

    expect(screen.queryByTestId('spatial-zone-shape-handles-zone-a')).toBeNull();
  });

  it('renders invalid polygon zones without shape edit handles', () => {
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        selectedZoneId="zone-a"
        zoneShapeEditId="zone-a"
        zones={[{
          id: 'zone-a',
          shape: { type: 'polygon', points: 'invalid' },
        }] as any}
        ariaLabel="Spatial plan"
      />,
    );

    expect(screen.getByTestId('spatial-zone-zone-a')).toBeTruthy();
    expect(screen.queryByTestId('spatial-zone-shape-handles-zone-a')).toBeNull();
  });

  it('moves the focused polygon vertex with arrow keys', async () => {
    const user = userEvent.setup();
    const onZoneChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        selectedZoneId="zone-a"
        zoneShapeEditId="zone-a"
        zones={[{
          id: 'zone-a',
          shape: { type: 'polygon', points: [{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 70 }] },
        }] as any}
        onZoneChange={onZoneChange}
        ariaLabel="Spatial plan"
      />,
    );

    const vertex = screen.getByTestId('spatial-zone-vertex-handle-zone-a-1');
    vertex.focus();
    await user.keyboard('{ArrowRight}');

    expect(onZoneChange).toHaveBeenCalledTimes(1);
    expect(onZoneChange.mock.calls[0][0]).toMatchObject({
      changeType: 'shape',
      shapeAction: 'move-vertex',
      vertexIndex: 1,
    });
    expect(onZoneChange.mock.calls[0][0].nextZone.shape.points[1].x).toBeGreaterThan(90);
  });

  it('deletes the focused polygon vertex but preserves minimum three points', async () => {
    const user = userEvent.setup();
    const onZoneChange = vi.fn();
    const { rerender } = render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        selectedZoneId="zone-a"
        zoneShapeEditId="zone-a"
        zones={[{
          id: 'zone-a',
          shape: { type: 'polygon', points: [{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 70 }, { x: 10, y: 70 }] },
        }] as any}
        onZoneChange={onZoneChange}
        ariaLabel="Spatial plan"
      />,
    );

    screen.getByTestId('spatial-zone-vertex-handle-zone-a-1').focus();
    await user.keyboard('{Delete}');
    expect(onZoneChange.mock.calls[0][0]).toMatchObject({ shapeAction: 'delete-vertex', vertexIndex: 1 });
    expect(onZoneChange.mock.calls[0][0].nextZone.shape.points).toHaveLength(3);

    onZoneChange.mockClear();
    rerender(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        selectedZoneId="zone-a"
        zoneShapeEditId="zone-a"
        zones={[{
          id: 'zone-a',
          shape: { type: 'polygon', points: [{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 70 }] },
        }] as any}
        onZoneChange={onZoneChange}
        ariaLabel="Spatial plan"
      />,
    );
    screen.getByTestId('spatial-zone-vertex-handle-zone-a-1').focus();
    await user.keyboard('{Delete}');
    expect(onZoneChange).not.toHaveBeenCalled();
  });

  it('dispatches zone shape edit exit on escape', async () => {
    const user = userEvent.setup();
    const onZoneShapeEditExit = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        selectedZoneId="zone-a"
        zoneShapeEditId="zone-a"
        zones={[{
          id: 'zone-a',
          shape: { type: 'polygon', points: [{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 70 }] },
        }] as any}
        onZoneShapeEditExit={onZoneShapeEditExit}
        ariaLabel="Spatial plan"
      />,
    );

    screen.getByTestId('spatial-zone-vertex-handle-zone-a-1').focus();
    await user.keyboard('{Escape}');
    expect(onZoneShapeEditExit).toHaveBeenCalledTimes(1);
  });

  it('advertises polygon vertex keyboard shortcuts only when enabled', () => {
    const { rerender } = render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        selectedZoneId="zone-a"
        zoneShapeEditId="zone-a"
        zones={[{
          id: 'zone-a',
          shape: { type: 'polygon', points: [{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 70 }, { x: 10, y: 70 }] },
        }] as any}
        onZoneShapeEditExit={() => undefined}
        ariaLabel="Spatial plan"
      />,
    );

    const shortcuts = screen.getByTestId('spatial-zone-vertex-handle-zone-a-1').getAttribute('aria-keyshortcuts');
    expect(shortcuts).toContain('ArrowRight');
    expect(shortcuts).toContain('Delete');
    expect(shortcuts).toContain('Escape');

    rerender(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        selectedZoneId="zone-a"
        zoneShapeEditId="zone-a"
        editPolicy={{ keyboardShapeEditZones: false }}
        zones={[{
          id: 'zone-a',
          shape: { type: 'polygon', points: [{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 70 }, { x: 10, y: 70 }] },
        }] as any}
        onZoneShapeEditExit={() => undefined}
        ariaLabel="Spatial plan"
      />,
    );

    expect(screen.getByTestId('spatial-zone-vertex-handle-zone-a-1').getAttribute('aria-keyshortcuts')).toBeNull();
  });

  it('clears active shape edit preview when shape mode moves to another zone', () => {
    const { rerender } = render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        selectedZoneId="zone-a"
        zoneShapeEditId="zone-a"
        zones={[{
          id: 'zone-a',
          shape: { type: 'polygon', points: [{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 70 }] },
        }] as any}
        ariaLabel="Spatial plan"
      />,
    );
    const svg = screen.getByRole('img');
    mockSvgClientRect(svg);
    fireEvent.pointerDown(screen.getByTestId('spatial-zone-vertex-handle-zone-a-1'), { pointerId: 1, clientX: 90, clientY: 10 });
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 120, clientY: 20 });

    rerender(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        selectedZoneId="zone-b"
        zoneShapeEditId="zone-b"
        zones={[
          {
            id: 'zone-a',
            shape: { type: 'polygon', points: [{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 70 }] },
          },
          {
            id: 'zone-b',
            shape: { type: 'polygon', points: [{ x: 110, y: 10 }, { x: 180, y: 10 }, { x: 180, y: 70 }] },
          },
        ] as any}
        ariaLabel="Spatial plan"
      />,
    );

    expect(screen.queryByTestId('spatial-zone-shape-handles-zone-a')).toBeNull();
    expect(screen.getByTestId('spatial-zone-shape-handles-zone-b')).toBeTruthy();
  });

  it('moves focused item with arrow keys in edit mode', async () => {
    const user = userEvent.setup();
    const onItemChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        items={items as any}
        ariaLabel="Spatial plan"
        onItemChange={onItemChange}
      />,
    );

    const item = screen.getByTestId('spatial-item-rect-1');
    item.focus();
    await user.keyboard('{ArrowRight}');

    expect(onItemChange).toHaveBeenCalledTimes(1);
    expect(onItemChange.mock.calls[0][0]).toMatchObject({
      itemId: 'rect-1',
      position: { x: 121, y: 110 },
      delta: { x: 1, y: 0 },
    });
  });

  it('uses keyboardLargeStep with shift arrow', async () => {
    const user = userEvent.setup();
    const onItemChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        items={items as any}
        ariaLabel="Spatial plan"
        onItemChange={onItemChange}
      />,
    );

    const item = screen.getByTestId('spatial-item-rect-1');
    item.focus();
    await user.keyboard('{Shift>}{ArrowDown}{/Shift}');

    expect(onItemChange.mock.calls[0][0]).toMatchObject({
      position: { x: 120, y: 120 },
      delta: { x: 0, y: 10 },
    });
  });

  it('refreshes selected item context with the post-keyboard position', async () => {
    const user = userEvent.setup();
    const onItemChange = vi.fn();
    const onItemSelect = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        items={items as any}
        ariaLabel="Spatial plan"
        _onItemSelect={onItemSelect}
        onItemChange={onItemChange}
      />,
    );

    const item = screen.getByTestId('spatial-item-rect-1');
    item.focus();
    await user.keyboard('{ArrowRight}');

    expect(onItemSelect.mock.calls[0][0]).toMatchObject({
      itemId: 'rect-1',
      position: { x: 121, y: 110 },
      item: { id: 'rect-1', position: { x: 121, y: 110 } },
    });
  });

  it('resizes focused item with ctrl arrow keys in edit mode', async () => {
    const user = userEvent.setup();
    const onItemChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        items={[items[0]] as any}
        mode="edit"
        selectedItemId="rect-1"
        onItemChange={onItemChange}
        ariaLabel="Spatial plan"
      />,
    );

    screen.getByTestId('spatial-item-rect-1').focus();
    await user.keyboard('{Control>}{ArrowRight}{/Control}');

    expect(onItemChange).toHaveBeenCalledTimes(1);
    expect(onItemChange.mock.calls[0][0]).toMatchObject({
      changeType: 'resize',
      nextItem: { transform: { scaleX: 1.05, scaleY: 1 } },
    });
  });

  it('rotates focused item with bracket keys in edit mode', async () => {
    const user = userEvent.setup();
    const onItemChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        items={[items[0]] as any}
        mode="edit"
        selectedItemId="rect-1"
        onItemChange={onItemChange}
        ariaLabel="Spatial plan"
      />,
    );

    screen.getByTestId('spatial-item-rect-1').focus();
    await user.keyboard(']');

    expect(onItemChange).toHaveBeenCalledTimes(1);
    expect(onItemChange.mock.calls[0][0]).toMatchObject({
      changeType: 'rotate',
      nextItem: { rotation: -5 },
    });
  });

  it('uses large keyboard steps for ctrl shift arrows and shift brackets', async () => {
    const user = userEvent.setup();
    const onItemChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        items={[items[0]] as any}
        mode="edit"
        selectedItemId="rect-1"
        editPolicy={{ resizeLargeStep: 0.5, rotationLargeStep: 30 }}
        onItemChange={onItemChange}
        ariaLabel="Spatial plan"
      />,
    );

    screen.getByTestId('spatial-item-rect-1').focus();
    await user.keyboard('{Control>}{Shift>}{ArrowRight}{/Shift}{/Control}');
    await user.keyboard('{Shift>}]{/Shift}');

    expect(onItemChange.mock.calls[0][0]).toMatchObject({
      changeType: 'resize',
      nextItem: { transform: { scaleX: 1.5, scaleY: 1 } },
    });
    expect(onItemChange.mock.calls[1][0]).toMatchObject({
      changeType: 'rotate',
      nextItem: { rotation: 20 },
    });
  });

  it('refreshes selected item context after keyboard resize and rotate', async () => {
    const user = userEvent.setup();
    const onItemSelect = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        items={[items[0]] as any}
        mode="edit"
        selectedItemId="rect-1"
        _onItemSelect={onItemSelect}
        ariaLabel="Spatial plan"
      />,
    );

    screen.getByTestId('spatial-item-rect-1').focus();
    await user.keyboard('{Control>}{ArrowRight}{/Control}');
    await user.keyboard(']');

    expect(onItemSelect).toHaveBeenCalledTimes(2);
    expect(onItemSelect.mock.calls[0][0]).toMatchObject({ item: { transform: { scaleX: 1.05, scaleY: 1 } } });
    expect(onItemSelect.mock.calls[1][0]).toMatchObject({ item: { rotation: -5 } });
  });

  it('advertises only enabled keyboard shortcuts', () => {
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        items={[items[0]] as any}
        mode="edit"
        selectedItemId="rect-1"
        editPolicy={{ keyboardResizeItems: false, keyboardRotateItems: false }}
        ariaLabel="Spatial plan"
      />,
    );

    const shortcuts = screen.getByTestId('spatial-item-rect-1').getAttribute('aria-keyshortcuts');
    expect(shortcuts).toContain('ArrowRight');
    expect(shortcuts).not.toContain('Ctrl+ArrowRight');
    expect(shortcuts).not.toContain(']');
  });

  it('does not activate items by default in edit mode', async () => {
    const user = userEvent.setup();
    const onItemPress = vi.fn();
    const onItemChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        items={items as any}
        ariaLabel="Spatial plan"
        onItemPress={onItemPress}
        onItemChange={onItemChange}
      />,
    );

    await user.click(screen.getByTestId('spatial-item-rect-1'));

    expect(onItemPress).not.toHaveBeenCalled();
    expect(onItemChange).not.toHaveBeenCalled();
  });

  it('allows explicit item activation in edit mode', async () => {
    const user = userEvent.setup();
    const onItemPress = vi.fn();
    const onItemChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        interactionPolicy={{ activateItems: true }}
        items={items as any}
        ariaLabel="Spatial plan"
        onItemPress={onItemPress}
        onItemChange={onItemChange}
      />,
    );

    await user.click(screen.getByTestId('spatial-item-rect-1'));
    expect(onItemPress).toHaveBeenCalledTimes(1);

    dragItem('spatial-item-rect-1', { x: 120, y: 110 }, { x: 180, y: 140 });

    expect(onItemChange).toHaveBeenCalledTimes(1);
    expect(onItemPress).toHaveBeenCalledTimes(1);
  });

  it('suppresses drag-generated canvas clicks after item drop', () => {
    const onCanvasPress = vi.fn();
    const onItemChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        items={items as any}
        ariaLabel="Spatial plan"
        onCanvasPress={onCanvasPress}
        onItemChange={onItemChange}
      />,
    );

    const item = screen.getByTestId('spatial-item-rect-1');
    const svg = screen.getByLabelText('Spatial plan');
    mockSvgClientRect(svg);

    fireEvent.pointerDown(item, { pointerId: 1, clientX: 120, clientY: 110 });
    fireEvent.pointerMove(document, { pointerId: 1, clientX: 180, clientY: 140 });
    fireEvent.pointerUp(document, { pointerId: 1, clientX: 180, clientY: 140 });
    fireEvent.click(svg);

    expect(onItemChange).toHaveBeenCalledTimes(1);
    expect(onCanvasPress).not.toHaveBeenCalled();
  });

  it('clamps keyboard movement to the viewBox', async () => {
    const user = userEvent.setup();
    const onItemChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        items={[{ ...items[0], position: { x: 0, y: 0 } }] as any}
        ariaLabel="Spatial plan"
        onItemChange={onItemChange}
      />,
    );

    const item = screen.getByTestId('spatial-item-rect-1');
    item.focus();
    await user.keyboard('{ArrowLeft}');

    expect(onItemChange).not.toHaveBeenCalled();
  });

  it('keyboard-moves inactive status items because status is visual only', async () => {
    const user = userEvent.setup();
    const onItemChange = vi.fn();
    render(
      <SpatialMap
        viewBox={{ x: 0, y: 0, width: 800, height: 420 }}
        mode="edit"
        items={[{ ...items[0], status: 'inactive' }] as any}
        ariaLabel="Spatial plan"
        onItemChange={onItemChange}
      />,
    );

    const inactive = screen.getByTestId('spatial-item-rect-1');
    inactive.focus();
    await user.keyboard('{ArrowRight}');

    expect(onItemChange).toHaveBeenCalledTimes(1);
    expect(onItemChange.mock.calls[0][0]).toMatchObject({
      itemId: 'rect-1',
      position: { x: 121, y: 110 },
      nextItem: { id: 'rect-1', status: 'inactive', position: { x: 121, y: 110 } },
    });
  });
});
