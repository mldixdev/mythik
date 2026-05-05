import { describe, expect, it } from 'vitest';
import {
  buildItemChangeContext,
  buildSpatialItemChangeContext,
  clampPointToRect,
  getEditPolicy,
  getSpatialItemLocalBounds,
  getSpatialItemWorldHandlePoints,
  getSpatialZoneMapBounds,
  getSpatialZonePolygonHandles,
  getSpatialZoneWorldHandlePoints,
  hasSpatialItemChangedByType,
  hasSpatialZoneChangedByType,
  insertSpatialZonePolygonVertex,
  isMovableSpatialItem,
  deleteSpatialZonePolygonVertex,
  moveSpatialZonePolygonVertex,
  moveSpatialZone,
  moveSpatialItem,
  normalizeSpatialRotation,
  normalizeSpatialTransform,
  normalizeEditPosition,
  resolveSpatialEditPoint,
  resizeSpatialItem,
  resizeSpatialZone,
  rotateSpatialItem,
  roundPoint,
  buildSpatialZoneChangeContext,
  type SpatialEditPointIntent,
} from '../src/primitives/spatial-map-editing.js';

const rect = { x: 0, y: 0, width: 400, height: 240 };

const item = {
  id: 'item-1',
  label: 'A1',
  zoneId: 'floor',
  position: { x: 120, y: 100 },
  rotation: 0,
  shape: { type: 'circle', radius: 36 },
  status: 'available',
  metadata: { capacity: 4 },
} as const;

const zone = {
  id: 'floor',
  label: 'Floor',
  shape: { type: 'rect', x: 0, y: 0, width: 400, height: 240 },
} as const;

describe('spatial-map editing helpers', () => {
  it('enables edit movement defaults only in edit mode', () => {
    expect(getEditPolicy('edit')).toMatchObject({
      dragItems: true,
      keyboardMoveItems: true,
      bounds: 'viewBox',
      boundsMode: 'position',
      keyboardStep: 1,
      keyboardLargeStep: 10,
      coordinatePrecision: 0,
    });
    expect(getEditPolicy('operate').dragItems).toBe(false);
    expect(getEditPolicy('readonly').keyboardMoveItems).toBe(false);
    expect(getEditPolicy('operate', { dragItems: true, keyboardMoveItems: true })).toMatchObject({
      dragItems: false,
      keyboardMoveItems: false,
    });
  });

  it('enables zone edit defaults only in edit mode', () => {
    expect(getEditPolicy('edit')).toMatchObject({
      dragZones: true,
      keyboardMoveZones: true,
    });
    expect(getEditPolicy('operate', { dragZones: true, keyboardMoveZones: true } as any)).toMatchObject({
      dragZones: false,
      keyboardMoveZones: false,
    });
  });

  it('enables zone shape editing defaults only in edit mode', () => {
    expect(getEditPolicy('readonly')).toMatchObject({
      shapeEditZones: false,
      keyboardShapeEditZones: false,
    });
    expect(getEditPolicy('operate')).toMatchObject({
      shapeEditZones: false,
      keyboardShapeEditZones: false,
    });
    expect(getEditPolicy('edit')).toMatchObject({
      shapeEditZones: true,
      keyboardShapeEditZones: true,
    });
    expect(getEditPolicy('edit', {
      shapeEditZones: false,
      keyboardShapeEditZones: false,
    })).toMatchObject({
      shapeEditZones: false,
      keyboardShapeEditZones: false,
    });
  });

  it('allows explicit edit policy overrides in edit mode', () => {
    expect(getEditPolicy('edit', {
      dragItems: false,
      bounds: 'none',
      keyboardStep: 5,
      keyboardLargeStep: 25,
      coordinatePrecision: 2,
    })).toMatchObject({
      dragItems: false,
      bounds: 'none',
      keyboardStep: 5,
      keyboardLargeStep: 25,
      coordinatePrecision: 2,
    });
  });

  it('normalizes resize and rotate edit policy defaults only in edit mode', () => {
    expect(getEditPolicy('edit')).toMatchObject({
      resizeItems: true,
      rotateItems: true,
      keyboardResizeItems: true,
      keyboardRotateItems: true,
      resizeStep: 0.05,
      resizeLargeStep: 0.25,
      rotationStep: 5,
      rotationLargeStep: 15,
      minScale: 0.1,
      maxScale: 10,
      handles: { visible: true, resize: true, rotate: true },
    });
    expect(getEditPolicy('operate', { resizeItems: true, rotateItems: true })).toMatchObject({
      resizeItems: false,
      rotateItems: false,
      keyboardResizeItems: false,
      keyboardRotateItems: false,
      handles: { visible: false, resize: false, rotate: false },
    });
  });

  it('normalizes spatial transforms with active scale limits', () => {
    expect(normalizeSpatialTransform(undefined, getEditPolicy('edit'))).toEqual({ scaleX: 1, scaleY: 1 });
    expect(normalizeSpatialTransform({ scaleX: Number.NaN, scaleY: 99 }, getEditPolicy('edit', {
      minScale: 0.25,
      maxScale: 4,
    }))).toEqual({ scaleX: 1, scaleY: 4 });
  });

  it('derives local bounds for editable item shapes', () => {
    expect(getSpatialItemLocalBounds({
      ...item,
      shape: { type: 'rect', width: 80, height: 40, radius: 8 },
    })).toEqual({ x: -40, y: -20, width: 80, height: 40 });
    expect(getSpatialItemLocalBounds({
      ...item,
      shape: { type: 'circle', radius: 12 },
    })).toEqual({ x: -12, y: -12, width: 24, height: 24 });
    expect(getSpatialItemLocalBounds({
      ...item,
      shape: { type: 'ellipse', radiusX: 20, radiusY: 10 },
    })).toEqual({ x: -20, y: -10, width: 40, height: 20 });
    expect(getSpatialItemLocalBounds({
      ...item,
      shape: { type: 'polygon', points: [[-10, -4], [20, 8], [5, 18]] },
    })).toEqual({ x: -10, y: -4, width: 30, height: 22 });
    expect(getSpatialItemLocalBounds({
      ...item,
      shape: { type: 'polygon', points: '-5,-3 12,9 4,18' },
    })).toEqual({ x: -5, y: -3, width: 17, height: 21 });
  });

  it('requires localBounds for path resize support', () => {
    const pathItem = {
      ...item,
      shape: { type: 'path', d: 'M 0 0 L 40 20 L 0 40 Z' },
    } as const;

    expect(getSpatialItemLocalBounds(pathItem)).toBeNull();
    expect(getSpatialItemLocalBounds({
      ...pathItem,
      localBounds: { x: -50, y: -20, width: 100, height: 40 },
    })).toEqual({ x: -50, y: -20, width: 100, height: 40 });
  });

  it('derives map bounds for editable zone shapes without mutating shape data', () => {
    expect(getSpatialZoneMapBounds(zone as any)).toEqual({ x: 0, y: 0, width: 400, height: 240 });
    expect(getSpatialZoneMapBounds({
      id: 'poly',
      shape: { type: 'polygon', points: [[10, 20], [60, 10], [80, 90]] },
    } as any)).toEqual({ x: 10, y: 10, width: 70, height: 80 });
    expect(getSpatialZoneMapBounds({
      id: 'path',
      shape: { type: 'path', d: 'M0 0 L10 10' },
    } as any)).toBeNull();
    expect(getSpatialZoneMapBounds({
      id: 'path',
      localBounds: { x: 5, y: 8, width: 100, height: 50 },
      shape: { type: 'path', d: 'M0 0 L10 10' },
    } as any)).toEqual({ x: 5, y: 8, width: 100, height: 50 });
  });

  it('moves zones through position while preserving base geometry', () => {
    const next = moveSpatialZone(zone as any, { x: 35.4, y: -12.2 }, rect, getEditPolicy('edit', { bounds: 'none', coordinatePrecision: 1 }));

    expect(next).toMatchObject({
      id: 'floor',
      position: { x: 35.4, y: -12.2 },
      shape: zone.shape,
    });
    expect(zone).not.toHaveProperty('position');
  });

  it('clamps movable zone bounds to the viewBox when bounds are available', () => {
    const entry = {
      id: 'entry',
      shape: { type: 'rect', x: 20, y: 20, width: 110, height: 70 },
    } as const;

    expect(moveSpatialZone(entry as any, { x: -50, y: -50 }, rect, getEditPolicy('edit'))).toMatchObject({
      position: { x: -20, y: -20 },
    });
  });

  it('clamps transformed zone bounds to the viewBox after resize', () => {
    const entry = {
      id: 'entry',
      position: { x: 0, y: 20 },
      transform: { scaleX: 2, scaleY: 1 },
      shape: { type: 'rect', x: -50, y: -20, width: 100, height: 40 },
    } as const;

    expect(moveSpatialZone(entry as any, { x: 350, y: 20 }, rect, getEditPolicy('edit'))).toMatchObject({
      position: { x: 300, y: 20 },
    });
  });

  it('computes polygon vertex and segment handles in world coordinates', () => {
    const editableZone = {
      id: 'zone-a',
      shape: {
        type: 'polygon',
        points: [{ x: 10, y: 10 }, { x: 70, y: 10 }, { x: 70, y: 50 }, { x: 10, y: 50 }],
      },
    } as const;

    expect(getSpatialZonePolygonHandles(editableZone as any, getEditPolicy('edit'))).toEqual({
      vertices: [
        { index: 0, point: { x: 10, y: 10 } },
        { index: 1, point: { x: 70, y: 10 } },
        { index: 2, point: { x: 70, y: 50 } },
        { index: 3, point: { x: 10, y: 50 } },
      ],
      segments: [
        { index: 0, point: { x: 40, y: 10 } },
        { index: 1, point: { x: 70, y: 30 } },
        { index: 2, point: { x: 40, y: 50 } },
        { index: 3, point: { x: 10, y: 30 } },
      ],
    });
  });

  it('moves polygon vertices without mutating the previous zone', () => {
    const edit = getEditPolicy('edit', { coordinatePrecision: 0 });
    const editableZone = {
      id: 'zone-a',
      shape: {
        type: 'polygon',
        points: [{ x: 10, y: 10 }, { x: 70, y: 10 }, { x: 70, y: 50 }],
      },
      metadata: { color: 'blue' },
    } as const;

    const next = moveSpatialZonePolygonVertex(editableZone as any, {
      vertexIndex: 1,
      worldPoint: { x: 82.4, y: 14.2 },
      rect: { x: 0, y: 0, width: 100, height: 100 },
      policy: edit,
    });

    expect(next).toMatchObject({
      id: 'zone-a',
      metadata: { color: 'blue' },
      shape: {
        type: 'polygon',
        points: [{ x: 10, y: 10 }, { x: 82, y: 14 }, { x: 70, y: 50 }],
      },
    });
    expect(editableZone.shape.points[1]).toEqual({ x: 70, y: 10 });
  });

  it('inserts and deletes polygon vertices with minimum-three protection', () => {
    const edit = getEditPolicy('edit');
    const editableZone = {
      id: 'zone-a',
      shape: {
        type: 'polygon',
        points: [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 40 }],
      },
    } as const;

    const inserted = insertSpatialZonePolygonVertex(editableZone as any, {
      segmentIndex: 0,
      worldPoint: { x: 20, y: 0 },
      rect: { x: 0, y: 0, width: 100, height: 100 },
      policy: edit,
    });
    expect(inserted.shape.points).toEqual([
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 40, y: 0 },
      { x: 40, y: 40 },
    ]);

    expect(deleteSpatialZonePolygonVertex(inserted, { vertexIndex: 1 }).shape.points).toEqual(editableZone.shape.points);
    expect(deleteSpatialZonePolygonVertex(editableZone as any, { vertexIndex: 1 })).toBe(editableZone);
  });

  it('maps transformed polygon vertex edits back to canonical zone points', () => {
    const edit = getEditPolicy('edit');
    const editableZone = {
      id: 'zone-a',
      position: { x: 100, y: 50 },
      rotation: 0,
      transform: { scaleX: 2, scaleY: 2 },
      shape: {
        type: 'polygon',
        points: [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 20 }],
      },
    } as const;

    const handles = getSpatialZonePolygonHandles(editableZone as any, edit);
    expect(handles?.vertices[1].point).toEqual({ x: 140, y: 50 });

    const next = moveSpatialZonePolygonVertex(editableZone as any, {
      vertexIndex: 1,
      worldPoint: { x: 150, y: 50 },
      rect: { x: 0, y: 0, width: 300, height: 300 },
      policy: edit,
    });

    expect(next.shape.points[1]).toEqual({ x: 25, y: 0 });
  });

  it('maps transformed polygon inserted vertices back to canonical zone points', () => {
    const edit = getEditPolicy('edit');
    const editableZone = {
      id: 'zone-a',
      position: { x: 100, y: 50 },
      rotation: 90,
      transform: { scaleX: 2, scaleY: 2 },
      shape: {
        type: 'polygon',
        points: [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 20 }],
      },
    } as const;

    const inserted = insertSpatialZonePolygonVertex(editableZone as any, {
      segmentIndex: 0,
      worldPoint: { x: 100, y: 70 },
      rect: { x: 0, y: 0, width: 300, height: 300 },
      policy: edit,
    });

    expect(inserted.shape.points).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 20 },
    ]);
  });

  it('moves rotated polygon vertices from world-axis keyboard points back to canonical points', () => {
    const edit = getEditPolicy('edit');
    const editableZone = {
      id: 'zone-a',
      position: { x: 100, y: 50 },
      rotation: 90,
      shape: {
        type: 'polygon',
        points: [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 20 }],
      },
    } as const;

    const handles = getSpatialZonePolygonHandles(editableZone as any, edit);
    expect(handles?.vertices[1].point).toEqual({ x: 100, y: 70 });

    const next = moveSpatialZonePolygonVertex(editableZone as any, {
      vertexIndex: 1,
      worldPoint: { x: 110, y: 70 },
      rect: { x: 0, y: 0, width: 300, height: 300 },
      policy: edit,
    });

    expect(next.shape.points[1]).toEqual({ x: 20, y: -10 });
  });

  it('returns no polygon handles for invalid or non-polygon zone shapes', () => {
    const edit = getEditPolicy('edit');
    expect(getSpatialZonePolygonHandles({
      id: 'zone-a',
      shape: { type: 'rect', x: 0, y: 0, width: 10, height: 10 },
    } as any, edit)).toBeNull();
    expect(getSpatialZonePolygonHandles({
      id: 'zone-b',
      shape: { type: 'polygon', points: '0,0 invalid' },
    } as any, edit)).toBeNull();
  });

  it('builds generic zone move change contexts', () => {
    const previousZone = zone as any;
    const nextZone = moveSpatialZone(previousZone, { x: 15, y: 25 }, rect, getEditPolicy('edit', { bounds: 'none' }));

    expect(buildSpatialZoneChangeContext({
      mode: 'edit',
      changeType: 'move',
      previousZone,
      nextZone,
      policy: getEditPolicy('edit', { bounds: 'none' }),
    })).toMatchObject({
      kind: 'zone-change',
      changeType: 'move',
      zoneId: 'floor',
      previousPosition: { x: 0, y: 0 },
      position: { x: 15, y: 25 },
      delta: { x: 15, y: 25 },
      previousZone,
      nextZone,
      zone: nextZone,
    });
  });

  it('computes world resize handles for editable zone bounds', () => {
    const editableZone = {
      id: 'entry',
      label: 'Entry',
      position: { x: 200, y: 100 },
      transform: { scaleX: 2, scaleY: 1 },
      shape: { type: 'rect', x: -50, y: -30, width: 100, height: 60 },
    } as const;

    expect(getSpatialZoneWorldHandlePoints(editableZone as any, getEditPolicy('edit'))).toMatchObject({
      e: { x: 300, y: 100 },
      w: { x: 100, y: 100 },
      n: { x: 200, y: 70 },
      s: { x: 200, y: 130 },
    });
  });

  it('resizes zones through transform while preserving base geometry', () => {
    const editableZone = {
      id: 'entry',
      label: 'Entry',
      position: { x: 100, y: 80 },
      shape: { type: 'rect', x: -50, y: -20, width: 100, height: 40, radius: 8 },
    } as const;
    const next = resizeSpatialZone(editableZone as any, {
      handle: 'e',
      localPoint: { x: 100, y: 0 },
      policy: getEditPolicy('edit'),
      preserveAspectRatio: false,
    });

    expect(next.transform).toEqual({ scaleX: 1.5, scaleY: 1 });
    expect(next.position).toEqual({ x: 125, y: 80 });
    expect(next.shape).toBe(editableZone.shape);
    expect(editableZone).not.toHaveProperty('transform');
  });

  it('builds generic zone resize change contexts with active policy normalization', () => {
    const edit = getEditPolicy('edit', { maxScale: 4 });
    const editableZone = {
      id: 'entry',
      label: 'Entry',
      shape: { type: 'rect', x: -50, y: -20, width: 100, height: 40 },
    } as const;
    const legacyZone = {
      ...editableZone,
      transform: { scaleX: 8, scaleY: 1 },
    };
    const resized = resizeSpatialZone(editableZone as any, {
      handle: 'e',
      localPoint: { x: 100, y: 0 },
      policy: edit,
      preserveAspectRatio: false,
    });

    expect(buildSpatialZoneChangeContext({
      mode: 'edit',
      changeType: 'resize',
      previousZone: legacyZone as any,
      nextZone: resized,
      policy: edit,
    })).toMatchObject({
      kind: 'zone-change',
      changeType: 'resize',
      zoneId: 'entry',
      previousTransform: { scaleX: 4, scaleY: 1 },
      transform: resized.transform,
      previousLocalBounds: { x: -50, y: -20, width: 100, height: 40 },
      localBounds: { x: -50, y: -20, width: 100, height: 40 },
      previousZone: legacyZone,
      nextZone: resized,
    });
  });

  it('builds polygon shape change contexts', () => {
    const previousZone = {
      id: 'zone-a',
      shape: { type: 'polygon', points: [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 40 }] },
    } as const;
    const nextZone = {
      ...previousZone,
      shape: { type: 'polygon', points: [{ x: 0, y: 0 }, { x: 44, y: 0 }, { x: 40, y: 40 }] },
    } as const;

    expect(buildSpatialZoneChangeContext({
      mode: 'edit',
      changeType: 'shape',
      previousZone: previousZone as any,
      nextZone: nextZone as any,
      policy: getEditPolicy('edit'),
      shapeAction: 'move-vertex',
      vertexIndex: 1,
    })).toMatchObject({
      kind: 'zone-change',
      changeType: 'shape',
      zoneId: 'zone-a',
      previousShape: previousZone.shape,
      shape: nextZone.shape,
      previousPoints: previousZone.shape.points,
      points: nextZone.shape.points,
      shapeAction: 'move-vertex',
      vertexIndex: 1,
    });
  });

  it('detects polygon shape changes structurally', () => {
    const previousZone = {
      id: 'zone-a',
      shape: { type: 'polygon', points: [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 40 }] },
    } as const;
    const sameZone = {
      ...previousZone,
      shape: { type: 'polygon', points: [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 40 }] },
    } as const;
    const changedZone = {
      ...previousZone,
      shape: { type: 'polygon', points: [{ x: 0, y: 0 }, { x: 41, y: 0 }, { x: 40, y: 40 }] },
    } as const;

    expect(hasSpatialZoneChangedByType({
      previousZone: previousZone as any,
      nextZone: sameZone as any,
      changeType: 'shape',
      policy: getEditPolicy('edit'),
    })).toBe(false);
    expect(hasSpatialZoneChangedByType({
      previousZone: previousZone as any,
      nextZone: changedZone as any,
      changeType: 'shape',
      policy: getEditPolicy('edit'),
    })).toBe(true);
  });

  it('treats default-equivalent zone transform values as no-op resize changes', () => {
    expect(hasSpatialZoneChangedByType({
      previousZone: zone as any,
      nextZone: { ...zone, transform: { scaleX: 1, scaleY: 1 } } as any,
      changeType: 'resize',
      policy: getEditPolicy('edit'),
    })).toBe(false);
  });


  it('normalizes snap and guide policy defaults', () => {
    expect(getEditPolicy('edit')).toMatchObject({
      snap: {
        enabled: false,
        grid: {
          enabled: false,
          size: { x: 20, y: 20 },
          offset: { x: 0, y: 0 },
          threshold: 8,
        },
        itemCenters: {
          enabled: false,
          threshold: 8,
        },
      },
      guides: {
        enabled: false,
        showCoordinates: false,
        showSnapLines: false,
      },
    });

    expect(getEditPolicy('edit', {
      snap: {
        enabled: true,
        grid: { enabled: true, size: 10 },
        itemCenters: { enabled: true },
      },
      guides: { enabled: true },
    })).toMatchObject({
      snap: {
        enabled: true,
        grid: {
          enabled: true,
          size: { x: 10, y: 10 },
          offset: { x: 0, y: 0 },
          threshold: 8,
        },
        itemCenters: {
          enabled: true,
          threshold: 8,
        },
      },
      guides: {
        enabled: true,
        showCoordinates: false,
        showSnapLines: true,
      },
    });

    expect(getEditPolicy('edit', {
      snap: { enabled: true },
      guides: {
        enabled: true,
        showCoordinates: true,
        showSnapLines: false,
      },
    })).toMatchObject({
      snap: {
        enabled: true,
        grid: { enabled: false },
        itemCenters: { enabled: false },
      },
      guides: {
        enabled: true,
        showCoordinates: true,
        showSnapLines: false,
      },
    });
  });

  it('clamps points to the viewBox rectangle by position', () => {
    expect(clampPointToRect({ x: -10, y: 300 }, rect)).toEqual({ x: 0, y: 240 });
    expect(clampPointToRect({ x: 450, y: -8 }, rect)).toEqual({ x: 400, y: 0 });
  });

  it('rounds points using coordinate precision', () => {
    expect(roundPoint({ x: 10.49, y: 20.5 }, 0)).toEqual({ x: 10, y: 21 });
    expect(roundPoint({ x: 10.456, y: 20.555 }, 2)).toEqual({ x: 10.46, y: 20.56 });
  });

  it('snaps to grid only within threshold per axis', () => {
    const result = resolveSpatialEditPoint({
      rawPoint: { x: 111, y: 113 },
      rect,
      policy: getEditPolicy('edit', {
        snap: {
          enabled: true,
          grid: { enabled: true, threshold: 8 },
        },
        guides: { enabled: true },
      }),
    });

    expect(result).toMatchObject({
      point: { x: 111, y: 120 },
      rawPoint: { x: 111, y: 113 },
      snapped: true,
      guides: [{ axis: 'y', source: 'grid', value: 120 }],
      sources: ['grid'],
    });
  });

  it('supports asymmetric grid size and offset', () => {
    const result = resolveSpatialEditPoint({
      rawPoint: { x: 75, y: 44 },
      rect,
      policy: getEditPolicy('edit', {
        snap: {
          enabled: true,
          grid: {
            enabled: true,
            size: { x: 24, y: 12 },
            offset: { x: 4, y: 6 },
            threshold: 5,
          },
        },
        guides: { enabled: true },
      }),
    });

    expect(result.point).toEqual({ x: 76, y: 42 });
    expect(result.guides).toEqual([
      expect.objectContaining({ axis: 'x', source: 'grid', value: 76 }),
      expect.objectContaining({ axis: 'y', source: 'grid', value: 42 }),
    ]);
  });

  it('snaps to other item centers and exposes target ids', () => {
    const result = resolveSpatialEditPoint({
      rawPoint: { x: 198, y: 151 },
      rect,
      policy: getEditPolicy('edit', {
        snap: {
          enabled: true,
          grid: { enabled: true, threshold: 8 },
          itemCenters: { enabled: true, threshold: 8 },
        },
        guides: { enabled: true },
      }),
      items: [
        { ...item, id: 'moving', position: { x: 200, y: 151 } },
        { ...item, id: 'other', position: { x: 200, y: 150 } },
      ],
      currentItemId: 'moving',
    });

    expect(result.point).toEqual({ x: 200, y: 150 });
    expect(result.guides).toEqual([
      expect.objectContaining({ axis: 'x', source: 'item-center', value: 200, targetId: 'other' }),
      expect.objectContaining({ axis: 'y', source: 'item-center', value: 150, targetId: 'other' }),
    ]);
    expect(result.sources).toEqual(['item-center']);
  });

  it('returns snap guides even when visual guide policy is disabled', () => {
    const result = resolveSpatialEditPoint({
      rawPoint: { x: 104, y: 96 },
      rect,
      policy: getEditPolicy('edit', {
        snap: {
          enabled: true,
          grid: { enabled: true },
        },
      }),
    });

    expect(result.guides).toEqual([
      expect.objectContaining({ axis: 'x', source: 'grid', value: 100 }),
      expect.objectContaining({ axis: 'y', source: 'grid', value: 100 }),
    ]);
    expect(result.sources).toEqual(['grid']);
  });

  it('marks aligned snap candidates as snapped even when coordinates do not change', () => {
    const result = resolveSpatialEditPoint({
      rawPoint: { x: 100, y: 100 },
      rect,
      policy: getEditPolicy('edit', {
        snap: {
          enabled: true,
          grid: { enabled: true },
        },
      }),
    });

    expect(result.point).toEqual({ x: 100, y: 100 });
    expect(result.guides).toEqual([
      expect.objectContaining({ axis: 'x', source: 'grid', value: 100 }),
      expect.objectContaining({ axis: 'y', source: 'grid', value: 100 }),
    ]);
    expect(result.snapped).toBe(true);
  });

  it('excludes current item centers using numeric and string id equivalence', () => {
    const result = resolveSpatialEditPoint({
      rawPoint: { x: 101, y: 99 },
      rect,
      policy: getEditPolicy('edit', {
        snap: {
          enabled: true,
          itemCenters: { enabled: true, threshold: 5 },
        },
      }),
      items: [
        { ...item, id: 42, position: { x: 100, y: 100 } },
        { ...item, id: 'other', position: { x: 120, y: 120 } },
      ],
      currentItemId: '42',
    });

    expect(result.point).toEqual({ x: 101, y: 99 });
    expect(result.guides).toEqual([]);
    expect(result.snapped).toBe(false);
  });

  it('clamps before and after snap', () => {
    const result = resolveSpatialEditPoint({
      rawPoint: { x: 398, y: 238 },
      rect,
      policy: getEditPolicy('edit', {
        snap: {
          enabled: true,
          grid: { enabled: true, size: 20, threshold: 8 },
        },
        guides: { enabled: true },
      }),
    });

    expect(result.point).toEqual({ x: 400, y: 240 });
  });

  it('keeps keyboard grid snap moving predictably', () => {
    const result = resolveSpatialEditPoint({
      rawPoint: { x: 121, y: 100 },
      rect,
      policy: getEditPolicy('edit', {
        snap: {
          enabled: true,
          grid: { enabled: true, size: 20 },
        },
      }),
      intent: {
        kind: 'keyboard',
        origin: { x: 120, y: 100 },
        delta: { x: 1, y: 0 },
      },
    });

    expect(result.point).toEqual({ x: 140, y: 100 });
  });

  it('keeps keyboard grid movement from getting stuck on nearby item centers', () => {
    const result = resolveSpatialEditPoint({
      rawPoint: { x: 121, y: 100 },
      rect,
      policy: getEditPolicy('edit', {
        snap: {
          enabled: true,
          grid: { enabled: true, size: 20 },
          itemCenters: { enabled: true, threshold: 8 },
        },
      }),
      items: [
        { ...item, id: 'moving', position: { x: 120, y: 100 } },
        { ...item, id: 'nearby', position: { x: 121, y: 180 } },
      ],
      currentItemId: 'moving',
      intent: {
        kind: 'keyboard',
        origin: { x: 120, y: 100 },
        delta: { x: 1, y: 0 },
      },
    });

    expect(result.point).toEqual({ x: 140, y: 100 });
    expect(result.guides).toEqual([
      expect.objectContaining({ axis: 'x', source: 'grid', value: 140 }),
      expect.objectContaining({ axis: 'y', source: 'grid', value: 100 }),
    ]);
  });

  it('uses keyboard large steps as multiple grid stops', () => {
    const result = resolveSpatialEditPoint({
      rawPoint: { x: 160, y: 100 },
      rect,
      policy: getEditPolicy('edit', {
        snap: {
          enabled: true,
          grid: { enabled: true, size: 20 },
        },
      }),
      intent: {
        kind: 'keyboard',
        origin: { x: 120, y: 100 },
        delta: { x: 40, y: 0 },
      },
    });

    expect(result.point).toEqual({ x: 160, y: 100 });
  });

  it('advances keyboard grid snap from off-grid origins in the movement direction', () => {
    const result = resolveSpatialEditPoint({
      rawPoint: { x: 132, y: 100 },
      rect,
      policy: getEditPolicy('edit', {
        snap: {
          enabled: true,
          grid: { enabled: true, size: 20 },
        },
      }),
      intent: {
        kind: 'keyboard',
        origin: { x: 131, y: 100 },
        delta: { x: 1, y: 0 },
      },
    });

    expect(result.point).toEqual({ x: 140, y: 100 });
  });

  it('accepts pointer and canvas edit point intents', () => {
    const pointerIntent: SpatialEditPointIntent = { kind: 'pointer' };
    const canvasIntent: SpatialEditPointIntent = { kind: 'canvas' };

    expect(pointerIntent.kind).toBe('pointer');
    expect(canvasIntent.kind).toBe('canvas');
  });

  it('falls back to safe grid size for non-positive grid sizes', () => {
    const policy = getEditPolicy('edit', {
      snap: {
        enabled: true,
        grid: { enabled: true, size: 0 },
      },
      guides: { enabled: true },
    });

    const result = resolveSpatialEditPoint({
      rawPoint: { x: 104, y: 96 },
      rect,
      policy,
    });

    expect(policy.snap.grid.size).toEqual({ x: 20, y: 20 });
    expect(result.point).toEqual({ x: 100, y: 100 });
  });

  it('supports exact-only grid snapping with zero threshold', () => {
    const policy = getEditPolicy('edit', {
      snap: {
        enabled: true,
        grid: { enabled: true, threshold: 0 },
      },
    });

    const near = resolveSpatialEditPoint({
      rawPoint: { x: 101, y: 101 },
      rect,
      policy,
    });
    const exact = resolveSpatialEditPoint({
      rawPoint: { x: 100, y: 100 },
      rect,
      policy,
    });

    expect(policy.snap.grid.threshold).toBe(0);
    expect(near.point).toEqual({ x: 101, y: 101 });
    expect(near.guides).toEqual([]);
    expect(near.snapped).toBe(false);
    expect(exact.point).toEqual({ x: 100, y: 100 });
    expect(exact.guides).toEqual([
      expect.objectContaining({ axis: 'x', source: 'grid', value: 100 }),
      expect.objectContaining({ axis: 'y', source: 'grid', value: 100 }),
    ]);
    expect(exact.snapped).toBe(true);
  });

  it('supports exact-only item center snapping with zero threshold', () => {
    const policy = getEditPolicy('edit', {
      snap: {
        enabled: true,
        itemCenters: { enabled: true, threshold: 0 },
      },
    });
    const items = [{ ...item, id: 'target', position: { x: 100, y: 100 } }];

    const near = resolveSpatialEditPoint({
      rawPoint: { x: 101, y: 101 },
      rect,
      policy,
      items,
    });
    const exact = resolveSpatialEditPoint({
      rawPoint: { x: 100, y: 100 },
      rect,
      policy,
      items,
    });

    expect(policy.snap.itemCenters.threshold).toBe(0);
    expect(near.point).toEqual({ x: 101, y: 101 });
    expect(near.guides).toEqual([]);
    expect(near.snapped).toBe(false);
    expect(exact.point).toEqual({ x: 100, y: 100 });
    expect(exact.guides).toEqual([
      expect.objectContaining({ axis: 'x', source: 'item-center', value: 100, targetId: 'target' }),
      expect.objectContaining({ axis: 'y', source: 'item-center', value: 100, targetId: 'target' }),
    ]);
    expect(exact.snapped).toBe(true);
  });

  it('keeps normalizeEditPosition as bounds plus rounding without snap', () => {
    const policy = getEditPolicy('edit', {
      coordinatePrecision: 0,
      snap: {
        enabled: true,
        grid: { enabled: true, threshold: 8 },
      },
    });

    expect(normalizeEditPosition({ x: 104, y: 96 }, rect, policy)).toEqual({ x: 104, y: 96 });
    expect(normalizeEditPosition({ x: 410.4, y: -1.2 }, rect, policy)).toEqual({ x: 400, y: 0 });
  });

  it('detects movable items defensively', () => {
    expect(isMovableSpatialItem(item)).toBe(true);
    expect(isMovableSpatialItem({ ...item, disabled: true })).toBe(false);
    expect(isMovableSpatialItem({ ...item, status: 'inactive' })).toBe(true);
    expect(isMovableSpatialItem({ ...item, position: { x: Number.NaN, y: 1 } })).toBe(false);
    expect(isMovableSpatialItem({ ...item, position: { x: 1, y: Number.POSITIVE_INFINITY } })).toBe(false);
  });

  it('creates next items without mutating the previous item', () => {
    const next = moveSpatialItem(item, { x: 200, y: 180 });
    expect(next).toMatchObject({ id: 'item-1', position: { x: 200, y: 180 } });
    expect(item.position).toEqual({ x: 120, y: 100 });
  });

  it('builds generic item move change context', () => {
    const nextItem = moveSpatialItem(item, { x: 150, y: 115 });
    expect(buildItemChangeContext({
      mode: 'edit',
      previousItem: item,
      nextItem,
      zones: [zone],
    })).toMatchObject({
      kind: 'item-change',
      changeType: 'move',
      mode: 'edit',
      itemId: 'item-1',
      zoneId: 'floor',
      previousPosition: { x: 120, y: 100 },
      position: { x: 150, y: 115 },
      delta: { x: 30, y: 15 },
      item: { id: 'item-1', position: { x: 150, y: 115 } },
      zone: { id: 'floor' },
    });
  });

  it('computes world handle points from local bounds, scale, rotation, and position', () => {
    const handleItem = {
      ...item,
      position: { x: 100, y: 80 },
      rotation: 0,
      transform: { scaleX: 2, scaleY: 1 },
      shape: { type: 'rect', width: 40, height: 20, radius: 2 },
    };

    expect(getSpatialItemWorldHandlePoints(handleItem, getEditPolicy('edit'))).toMatchObject({
      e: { x: 140, y: 80 },
      w: { x: 60, y: 80 },
      n: { x: 100, y: 70 },
      s: { x: 100, y: 90 },
    });
  });

  it('resizes east handles with opposite-edge anchoring', () => {
    const rectItem = {
      ...item,
      position: { x: 100, y: 80 },
      shape: { type: 'rect', width: 80, height: 40, radius: 2 },
    };
    const next = resizeSpatialItem(rectItem, {
      handle: 'e',
      localPoint: { x: 80, y: 0 },
      policy: getEditPolicy('edit'),
      preserveAspectRatio: false,
    });

    expect(next.transform).toEqual({ scaleX: 1.5, scaleY: 1 });
    expect(next.position).toEqual({ x: 120, y: 80 });
    expect(rectItem.position).toEqual({ x: 100, y: 80 });
  });

  it('continues resizing already-scaled items instead of resetting scale toward one', () => {
    const rectItem = {
      ...item,
      position: { x: 100, y: 80 },
      transform: { scaleX: 2, scaleY: 1 },
      shape: { type: 'rect', width: 80, height: 40, radius: 2 },
    };
    const next = resizeSpatialItem(rectItem, {
      handle: 'e',
      localPoint: { x: 50, y: 0 },
      policy: getEditPolicy('edit'),
      preserveAspectRatio: false,
    });

    expect(next.transform).toEqual({ scaleX: 2.25, scaleY: 1 });
    expect(next.position).toEqual({ x: 110, y: 80 });
  });

  it('preserves aspect ratio during resize when requested', () => {
    const rectItem = {
      ...item,
      position: { x: 100, y: 80 },
      shape: { type: 'rect', width: 80, height: 40, radius: 2 },
    };
    const next = resizeSpatialItem(rectItem, {
      handle: 'se',
      localPoint: { x: 80, y: 20 },
      policy: getEditPolicy('edit'),
      preserveAspectRatio: true,
    });

    expect(next.transform).toEqual({ scaleX: 1.5, scaleY: 1.5 });
  });

  it('normalizes rotations and rotates items without mutation', () => {
    expect(normalizeSpatialRotation(190)).toBe(-170);
    expect(normalizeSpatialRotation(-181)).toBe(179);
    expect(rotateSpatialItem(item, 187, getEditPolicy('edit'))).toMatchObject({
      rotation: -175,
    });
    expect(item.rotation).toBe(0);
  });

  it('builds generic resize and rotate change contexts', () => {
    const edit = getEditPolicy('edit', { maxScale: 4 });
    const rectItem = {
      ...item,
      shape: { type: 'rect', width: 80, height: 40, radius: 2 },
    };
    const legacyItem = {
      ...rectItem,
      transform: { scaleX: 8, scaleY: 1 },
    };
    const resized = resizeSpatialItem(rectItem, {
      handle: 'e',
      localPoint: { x: 72, y: 0 },
      policy: edit,
      preserveAspectRatio: false,
    });
    const resizeContext = buildSpatialItemChangeContext({
      mode: 'edit',
      changeType: 'resize',
      previousItem: legacyItem,
      nextItem: resized,
      zones: [zone],
      policy: edit,
    });
    expect(resizeContext).toMatchObject({
      kind: 'item-change',
      changeType: 'resize',
      previousTransform: { scaleX: 4, scaleY: 1 },
      transform: resized.transform,
      previousLocalBounds: { x: -40, y: -20, width: 80, height: 40 },
      localBounds: { x: -40, y: -20, width: 80, height: 40 },
    });

    const rotated = rotateSpatialItem(rectItem, 25, getEditPolicy('edit'));
    const rotateContext = buildSpatialItemChangeContext({
      mode: 'edit',
      changeType: 'rotate',
      previousItem: rectItem,
      nextItem: rotated,
      zones: [zone],
      policy: edit,
    });
    expect(rotateContext).toMatchObject({
      changeType: 'rotate',
      previousRotation: 0,
      rotation: 25,
    });
  });

  it('treats default-equivalent transform and rotation values as no-op changes', () => {
    const edit = getEditPolicy('edit');
    expect(hasSpatialItemChangedByType({
      previousItem: item,
      nextItem: { ...item, transform: { scaleX: 1, scaleY: 1 } },
      changeType: 'resize',
      policy: edit,
    })).toBe(false);
    expect(hasSpatialItemChangedByType({
      previousItem: item,
      nextItem: { ...item, rotation: 360 },
      changeType: 'rotate',
      policy: edit,
    })).toBe(false);
  });
});
