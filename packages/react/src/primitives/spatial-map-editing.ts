import type { SpatialItem, SpatialMapMode, SpatialZone } from './spatial-map.js';

export interface SpatialRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpatialItemTransform {
  scaleX?: number;
  scaleY?: number;
}

export interface SpatialLocalBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type SpatialResizeHandle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

export type SpatialHandlePoints = Record<SpatialResizeHandle | 'rotate', { x: number; y: number }>;

export interface SpatialPolygonVertexHandle {
  index: number;
  point: { x: number; y: number };
}

export interface SpatialPolygonSegmentHandle {
  index: number;
  point: { x: number; y: number };
}

export interface SpatialZonePolygonHandles {
  vertices: SpatialPolygonVertexHandle[];
  segments: SpatialPolygonSegmentHandle[];
}

export const DEFAULT_GRID_SIZE = 20;
export const DEFAULT_SNAP_THRESHOLD = 8;

export type SpatialEditGuideAxis = 'x' | 'y';
export type SpatialEditGuideSource = 'grid' | 'item-center';

export interface SpatialSnapGridPolicy {
  enabled?: boolean;
  size?: number | { x?: number; y?: number };
  offset?: { x?: number; y?: number };
  threshold?: number;
}

export interface SpatialSnapItemCentersPolicy {
  enabled?: boolean;
  threshold?: number;
}

export interface SpatialSnapPolicy {
  enabled?: boolean;
  grid?: SpatialSnapGridPolicy;
  itemCenters?: SpatialSnapItemCentersPolicy;
}

export interface SpatialGuidePolicy {
  enabled?: boolean;
  showCoordinates?: boolean;
  showSnapLines?: boolean;
}

export interface NormalizedSpatialSnapGridPolicy {
  enabled: boolean;
  size: { x: number; y: number };
  offset: { x: number; y: number };
  threshold: number;
}

export interface NormalizedSpatialSnapPolicy {
  enabled: boolean;
  grid: NormalizedSpatialSnapGridPolicy;
  itemCenters: {
    enabled: boolean;
    threshold: number;
  };
}

export interface NormalizedSpatialGuidePolicy {
  enabled: boolean;
  showCoordinates: boolean;
  showSnapLines: boolean;
}

export interface SpatialEditGuide {
  axis: SpatialEditGuideAxis;
  source: SpatialEditGuideSource;
  value: number;
  targetId?: string | number;
}

export type SpatialEditPointIntent =
  | { kind: 'pointer' }
  | { kind: 'canvas' }
  | {
    kind: 'keyboard';
    origin: { x: number; y: number };
    delta: { x: number; y: number };
  };

export interface SpatialSnapResolution {
  point: { x: number; y: number };
  rawPoint: { x: number; y: number };
  snapped: boolean;
  guides: SpatialEditGuide[];
  sources: SpatialEditGuideSource[];
}

interface SpatialEditGuideCandidate extends SpatialEditGuide {
  distance: number;
}

export interface SpatialEditPolicy {
  dragItems?: boolean;
  dragZones?: boolean;
  keyboardMoveItems?: boolean;
  keyboardMoveZones?: boolean;
  resizeItems?: boolean;
  resizeZones?: boolean;
  rotateItems?: boolean;
  keyboardResizeItems?: boolean;
  keyboardResizeZones?: boolean;
  keyboardRotateItems?: boolean;
  shapeEditZones?: boolean;
  keyboardShapeEditZones?: boolean;
  bounds?: 'viewBox' | 'none';
  boundsMode?: 'position';
  keyboardStep?: number;
  keyboardLargeStep?: number;
  resizeStep?: number;
  resizeLargeStep?: number;
  rotationStep?: number;
  rotationLargeStep?: number;
  minScale?: number;
  maxScale?: number;
  handles?: {
    visible?: boolean;
    resize?: boolean;
    rotate?: boolean;
  };
  coordinatePrecision?: number;
  snap?: SpatialSnapPolicy;
  guides?: SpatialGuidePolicy;
}

export interface NormalizedSpatialEditPolicy {
  dragItems: boolean;
  dragZones: boolean;
  keyboardMoveItems: boolean;
  keyboardMoveZones: boolean;
  resizeItems: boolean;
  resizeZones: boolean;
  rotateItems: boolean;
  keyboardResizeItems: boolean;
  keyboardResizeZones: boolean;
  keyboardRotateItems: boolean;
  shapeEditZones: boolean;
  keyboardShapeEditZones: boolean;
  bounds: 'viewBox' | 'none';
  boundsMode: 'position';
  keyboardStep: number;
  keyboardLargeStep: number;
  resizeStep: number;
  resizeLargeStep: number;
  rotationStep: number;
  rotationLargeStep: number;
  minScale: number;
  maxScale: number;
  handles: {
    visible: boolean;
    resize: boolean;
    rotate: boolean;
  };
  coordinatePrecision: number;
  snap: NormalizedSpatialSnapPolicy;
  guides: NormalizedSpatialGuidePolicy;
}

export interface SpatialItemChangeContext {
  kind: 'item-change';
  changeType: 'move' | 'resize' | 'rotate' | 'update' | 'create' | 'duplicate' | 'delete';
  mode: SpatialMapMode;
  itemId: string | number;
  zoneId?: string;
  previousItem: SpatialItem | null;
  nextItem: SpatialItem;
  item: SpatialItem;
  previousPosition?: { x: number; y: number };
  position?: { x: number; y: number };
  delta?: { x: number; y: number };
  previousTransform?: Required<SpatialItemTransform>;
  transform?: Required<SpatialItemTransform>;
  previousRotation?: number;
  rotation?: number;
  previousLocalBounds?: SpatialLocalBounds;
  localBounds?: SpatialLocalBounds;
  zone?: SpatialZone;
}

export interface SpatialZoneChangeContext {
  kind: 'zone-change';
  changeType: 'move' | 'resize' | 'rotate' | 'shape' | 'update' | 'create' | 'duplicate' | 'delete';
  mode: SpatialMapMode;
  zoneId: string;
  previousZone: SpatialZone | null;
  nextZone: SpatialZone;
  zone: SpatialZone;
  previousPosition?: { x: number; y: number };
  position?: { x: number; y: number };
  delta?: { x: number; y: number };
  previousTransform?: Required<SpatialItemTransform>;
  transform?: Required<SpatialItemTransform>;
  previousRotation?: number;
  rotation?: number;
  previousLocalBounds?: SpatialLocalBounds;
  localBounds?: SpatialLocalBounds;
  previousShape?: SpatialZone['shape'];
  shape?: SpatialZone['shape'];
  previousPoints?: Array<{ x: number; y: number }>;
  points?: Array<{ x: number; y: number }>;
  vertexIndex?: number;
  segmentIndex?: number;
  shapeAction?: 'move-vertex' | 'insert-vertex' | 'delete-vertex';
}

function finiteNumber(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function positiveFiniteNumber(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function nonNegativeFiniteNumber(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function normalizeScaleLimit(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizeGridSize(
  size: SpatialSnapGridPolicy['size'],
): { x: number; y: number } {
  if (typeof size === 'number') {
    const value = positiveFiniteNumber(size, DEFAULT_GRID_SIZE);
    return { x: value, y: value };
  }

  return {
    x: positiveFiniteNumber(size?.x, DEFAULT_GRID_SIZE),
    y: positiveFiniteNumber(size?.y, DEFAULT_GRID_SIZE),
  };
}

function normalizePointConfig(
  point: { x?: number; y?: number } | undefined,
): { x: number; y: number } {
  return {
    x: finiteNumber(point?.x, 0),
    y: finiteNumber(point?.y, 0),
  };
}

function normalizeSnapPolicy(policy?: SpatialSnapPolicy): NormalizedSpatialSnapPolicy {
  const enabled = policy?.enabled === true;
  return {
    enabled,
    grid: {
      enabled: enabled && policy.grid?.enabled === true,
      size: normalizeGridSize(policy?.grid?.size),
      offset: normalizePointConfig(policy?.grid?.offset),
      threshold: nonNegativeFiniteNumber(policy?.grid?.threshold, DEFAULT_SNAP_THRESHOLD),
    },
    itemCenters: {
      enabled: enabled && policy?.itemCenters?.enabled === true,
      threshold: nonNegativeFiniteNumber(policy?.itemCenters?.threshold, DEFAULT_SNAP_THRESHOLD),
    },
  };
}

function normalizeGuidePolicy(policy?: SpatialGuidePolicy): NormalizedSpatialGuidePolicy {
  const enabled = policy?.enabled === true;
  return {
    enabled,
    showCoordinates: enabled && policy?.showCoordinates === true,
    showSnapLines: enabled && policy?.showSnapLines !== false,
  };
}

export function getEditPolicy(
  mode: SpatialMapMode,
  policy?: SpatialEditPolicy,
): NormalizedSpatialEditPolicy {
  const editing = mode === 'edit';
  const configured = {
    bounds: policy?.bounds ?? 'viewBox',
    keyboardStep: policy?.keyboardStep ?? 1,
    keyboardLargeStep: policy?.keyboardLargeStep ?? 10,
    coordinatePrecision: policy?.coordinatePrecision ?? 0,
  };
  const minScale = normalizeScaleLimit(policy?.minScale, 0.1);
  const rawMaxScale = normalizeScaleLimit(policy?.maxScale, 10);
  const maxScale = rawMaxScale > minScale ? rawMaxScale : 10;

  return {
    dragItems: editing && policy?.dragItems !== false,
    dragZones: editing && policy?.dragZones !== false,
    keyboardMoveItems: editing && policy?.keyboardMoveItems !== false,
    keyboardMoveZones: editing && policy?.keyboardMoveZones !== false,
    resizeItems: editing && policy?.resizeItems !== false,
    resizeZones: editing && policy?.resizeZones !== false,
    rotateItems: editing && policy?.rotateItems !== false,
    keyboardResizeItems: editing && policy?.keyboardResizeItems !== false,
    keyboardResizeZones: editing && policy?.keyboardResizeZones !== false,
    keyboardRotateItems: editing && policy?.keyboardRotateItems !== false,
    shapeEditZones: editing && policy?.shapeEditZones !== false,
    keyboardShapeEditZones: editing && policy?.keyboardShapeEditZones !== false,
    bounds: configured.bounds,
    boundsMode: 'position',
    keyboardStep: configured.keyboardStep,
    keyboardLargeStep: configured.keyboardLargeStep,
    resizeStep: positiveFiniteNumber(policy?.resizeStep, 0.05),
    resizeLargeStep: positiveFiniteNumber(policy?.resizeLargeStep, 0.25),
    rotationStep: nonNegativeFiniteNumber(policy?.rotationStep, 5),
    rotationLargeStep: nonNegativeFiniteNumber(policy?.rotationLargeStep, 15),
    minScale,
    maxScale,
    handles: {
      visible: editing && policy?.handles?.visible !== false,
      resize: editing && policy?.handles?.resize !== false,
      rotate: editing && policy?.handles?.rotate !== false,
    },
    coordinatePrecision: configured.coordinatePrecision,
    snap: editing
      ? normalizeSnapPolicy(policy?.snap)
      : normalizeSnapPolicy(),
    guides: editing
      ? normalizeGuidePolicy(policy?.guides)
      : normalizeGuidePolicy(),
  };
}

export function clampPointToRect(
  point: { x: number; y: number },
  rect: SpatialRect,
): { x: number; y: number } {
  return {
    x: Math.min(rect.x + rect.width, Math.max(rect.x, point.x)),
    y: Math.min(rect.y + rect.height, Math.max(rect.y, point.y)),
  };
}

export function roundPoint(
  point: { x: number; y: number },
  precision: number,
): { x: number; y: number } {
  const safePrecision = Number.isFinite(precision) && precision > 0 ? Math.floor(precision) : 0;
  const factor = 10 ** safePrecision;
  return {
    x: Math.round(point.x * factor) / factor,
    y: Math.round(point.y * factor) / factor,
  };
}

export function normalizeEditPosition(
  point: { x: number; y: number },
  rect: SpatialRect,
  policy: NormalizedSpatialEditPolicy,
): { x: number; y: number } {
  const bounded = policy.bounds === 'viewBox'
    ? clampPointToRect(point, rect)
    : point;
  return roundPoint(bounded, policy.coordinatePrecision);
}

export function normalizeSpatialTransform(
  transform: SpatialItem['transform'] | undefined,
  policy: Pick<NormalizedSpatialEditPolicy, 'minScale' | 'maxScale'>,
): Required<SpatialItemTransform> {
  const rawScaleX = finiteNumber(transform?.scaleX, 1);
  const rawScaleY = finiteNumber(transform?.scaleY, 1);
  return {
    scaleX: Math.min(policy.maxScale, Math.max(policy.minScale, rawScaleX)),
    scaleY: Math.min(policy.maxScale, Math.max(policy.minScale, rawScaleY)),
  };
}

function finitePoint(point: unknown): point is { x: number; y: number } {
  return Boolean(
    point
    && typeof point === 'object'
    && Number.isFinite((point as { x?: unknown }).x)
    && Number.isFinite((point as { y?: unknown }).y),
  );
}

function parsePolygonPoints(
  points: Extract<SpatialItem['shape'] | SpatialZone['shape'], { type: 'polygon' }>['points'],
): Array<{ x: number; y: number }> {
  if (typeof points === 'string') {
    return points
      .trim()
      .split(/\s+/)
      .map((pair) => {
        const [x, y] = pair.split(',').map(Number);
        return { x, y };
      })
      .filter(finitePoint);
  }

  return points
    .map((point) => (Array.isArray(point) ? { x: point[0], y: point[1] } : point))
    .filter(finitePoint);
}

function boundsFromPoints(points: Array<{ x: number; y: number }>): SpatialLocalBounds | null {
  if (points.length === 0) return null;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
    return null;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function getSpatialItemLocalBounds(item: SpatialItem & { localBounds?: SpatialLocalBounds }): SpatialLocalBounds | null {
  if (item.localBounds
    && Number.isFinite(item.localBounds.x)
    && Number.isFinite(item.localBounds.y)
    && Number.isFinite(item.localBounds.width)
    && Number.isFinite(item.localBounds.height)
    && item.localBounds.width > 0
    && item.localBounds.height > 0) {
    return item.localBounds;
  }

  const shape = item.shape;
  if (shape.type === 'rect') {
    return { x: -shape.width / 2, y: -shape.height / 2, width: shape.width, height: shape.height };
  }
  if (shape.type === 'circle') {
    return { x: -shape.radius, y: -shape.radius, width: shape.radius * 2, height: shape.radius * 2 };
  }
  if (shape.type === 'ellipse') {
    return { x: -shape.radiusX, y: -shape.radiusY, width: shape.radiusX * 2, height: shape.radiusY * 2 };
  }
  if (shape.type === 'polygon') {
    return boundsFromPoints(parsePolygonPoints(shape.points));
  }
  return null;
}

function validLocalBounds(bounds: SpatialLocalBounds | undefined): bounds is SpatialLocalBounds {
  return Boolean(
    bounds
    && Number.isFinite(bounds.x)
    && Number.isFinite(bounds.y)
    && Number.isFinite(bounds.width)
    && Number.isFinite(bounds.height)
    && bounds.width > 0
    && bounds.height > 0,
  );
}

export function getSpatialZoneMapBounds(zone: SpatialZone & { localBounds?: SpatialLocalBounds }): SpatialLocalBounds | null {
  if (validLocalBounds(zone.localBounds)) return zone.localBounds;

  const shape = zone.shape;
  if (shape.type === 'rect') {
    return { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
  }
  if (shape.type === 'circle') {
    return { x: shape.cx - shape.radius, y: shape.cy - shape.radius, width: shape.radius * 2, height: shape.radius * 2 };
  }
  if (shape.type === 'ellipse') {
    return { x: shape.cx - shape.radiusX, y: shape.cy - shape.radiusY, width: shape.radiusX * 2, height: shape.radiusY * 2 };
  }
  if (shape.type === 'polygon') {
    return boundsFromPoints(parsePolygonPoints(shape.points));
  }
  return null;
}

export function getSpatialZonePosition(zone: SpatialZone & { position?: { x: number; y: number } }): { x: number; y: number } {
  return finitePoint(zone.position) ? zone.position : { x: 0, y: 0 };
}

export function normalizeZonePosition(
  zone: SpatialZone & { localBounds?: SpatialLocalBounds; position?: { x: number; y: number } },
  position: { x: number; y: number },
  rect: SpatialRect,
  policy: NormalizedSpatialEditPolicy,
): { x: number; y: number } {
  if (policy.bounds !== 'viewBox') return roundPoint(position, policy.coordinatePrecision);

  const bounds = getSpatialZoneTransformedBounds({ ...zone, position }, policy);
  if (!bounds) return roundPoint(position, policy.coordinatePrecision);

  const minX = position.x + rect.x - bounds.x;
  const maxX = position.x + rect.x + rect.width - (bounds.x + bounds.width);
  const minY = position.y + rect.y - bounds.y;
  const maxY = position.y + rect.y + rect.height - (bounds.y + bounds.height);
  const bounded = {
    x: Math.min(Math.max(minX, maxX), Math.max(Math.min(minX, maxX), position.x)),
    y: Math.min(Math.max(minY, maxY), Math.max(Math.min(minY, maxY), position.y)),
  };
  return roundPoint(bounded, policy.coordinatePrecision);
}

function rotatePoint(point: { x: number; y: number }, degrees: number): { x: number; y: number } {
  const radians = degrees * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  };
}

export function mapPointToItemLocal(
  item: SpatialItem,
  point: { x: number; y: number },
  policy: Pick<NormalizedSpatialEditPolicy, 'minScale' | 'maxScale'>,
): { x: number; y: number } {
  const transform = normalizeSpatialTransform(item.transform, policy);
  const translated = {
    x: point.x - item.position.x,
    y: point.y - item.position.y,
  };
  const unrotated = rotatePoint(translated, -(item.rotation ?? 0));
  return {
    x: unrotated.x / transform.scaleX,
    y: unrotated.y / transform.scaleY,
  };
}

export function itemLocalPointToMap(
  item: SpatialItem,
  point: { x: number; y: number },
  transform: Pick<Required<SpatialItemTransform>, 'scaleX' | 'scaleY'>,
): { x: number; y: number } {
  const scaled = { x: point.x * transform.scaleX, y: point.y * transform.scaleY };
  const rotated = rotatePoint(scaled, item.rotation ?? 0);
  return {
    x: item.position.x + rotated.x,
    y: item.position.y + rotated.y,
  };
}

export function mapPointToZoneLocal(
  zone: SpatialZone,
  point: { x: number; y: number },
  policy: Pick<NormalizedSpatialEditPolicy, 'minScale' | 'maxScale'>,
): { x: number; y: number } {
  const position = getSpatialZonePosition(zone);
  const transform = normalizeSpatialTransform(zone.transform, policy);
  const translated = {
    x: point.x - position.x,
    y: point.y - position.y,
  };
  const unrotated = rotatePoint(translated, -(zone.rotation ?? 0));
  return {
    x: unrotated.x / transform.scaleX,
    y: unrotated.y / transform.scaleY,
  };
}

export function zoneLocalPointToMap(
  zone: SpatialZone,
  point: { x: number; y: number },
  transform: Pick<Required<SpatialItemTransform>, 'scaleX' | 'scaleY'>,
): { x: number; y: number } {
  const position = getSpatialZonePosition(zone);
  const scaled = { x: point.x * transform.scaleX, y: point.y * transform.scaleY };
  const rotated = rotatePoint(scaled, zone.rotation ?? 0);
  return {
    x: position.x + rotated.x,
    y: position.y + rotated.y,
  };
}

function itemLocalDirectionToMap(item: SpatialItem, vector: { x: number; y: number }): { x: number; y: number } {
  return rotatePoint(vector, item.rotation ?? 0);
}

function zoneLocalDirectionToMap(zone: SpatialZone, vector: { x: number; y: number }): { x: number; y: number } {
  return rotatePoint(vector, zone.rotation ?? 0);
}

function handleLocalPoint(bounds: SpatialLocalBounds, handle: SpatialResizeHandle): { x: number; y: number } {
  const minX = bounds.x;
  const maxX = bounds.x + bounds.width;
  const midX = bounds.x + bounds.width / 2;
  const minY = bounds.y;
  const maxY = bounds.y + bounds.height;
  const midY = bounds.y + bounds.height / 2;
  return {
    n: { x: midX, y: minY },
    ne: { x: maxX, y: minY },
    e: { x: maxX, y: midY },
    se: { x: maxX, y: maxY },
    s: { x: midX, y: maxY },
    sw: { x: minX, y: maxY },
    w: { x: minX, y: midY },
    nw: { x: minX, y: minY },
  }[handle];
}

function oppositeHandle(handle: SpatialResizeHandle): SpatialResizeHandle {
  return {
    n: 's',
    ne: 'sw',
    e: 'w',
    se: 'nw',
    s: 'n',
    sw: 'ne',
    w: 'e',
    nw: 'se',
  }[handle] as SpatialResizeHandle;
}

export function getSpatialItemWorldHandlePoints(
  item: SpatialItem & { localBounds?: SpatialLocalBounds },
  policy: NormalizedSpatialEditPolicy,
): SpatialHandlePoints | null {
  const bounds = getSpatialItemLocalBounds(item);
  if (!bounds) return null;
  const transform = normalizeSpatialTransform(item.transform, policy);
  const points: SpatialHandlePoints = {
    n: itemLocalPointToMap(item, handleLocalPoint(bounds, 'n'), transform),
    ne: itemLocalPointToMap(item, handleLocalPoint(bounds, 'ne'), transform),
    e: itemLocalPointToMap(item, handleLocalPoint(bounds, 'e'), transform),
    se: itemLocalPointToMap(item, handleLocalPoint(bounds, 'se'), transform),
    s: itemLocalPointToMap(item, handleLocalPoint(bounds, 's'), transform),
    sw: itemLocalPointToMap(item, handleLocalPoint(bounds, 'sw'), transform),
    w: itemLocalPointToMap(item, handleLocalPoint(bounds, 'w'), transform),
    nw: itemLocalPointToMap(item, handleLocalPoint(bounds, 'nw'), transform),
    rotate: { x: 0, y: 0 },
  };
  const top = points.n;
  const outward = itemLocalDirectionToMap(item, { x: 0, y: -1 });
  const rotateGap = Math.max(28, Math.min(56, bounds.height * 0.35));
  points.rotate = {
    x: top.x + outward.x * rotateGap,
    y: top.y + outward.y * rotateGap,
  };
  return points;
}

export function getSpatialZoneWorldHandlePoints(
  zone: SpatialZone & { localBounds?: SpatialLocalBounds },
  policy: NormalizedSpatialEditPolicy,
): SpatialHandlePoints | null {
  const bounds = getSpatialZoneMapBounds(zone);
  if (!bounds) return null;
  const transform = normalizeSpatialTransform(zone.transform, policy);
  const points: SpatialHandlePoints = {
    n: zoneLocalPointToMap(zone, handleLocalPoint(bounds, 'n'), transform),
    ne: zoneLocalPointToMap(zone, handleLocalPoint(bounds, 'ne'), transform),
    e: zoneLocalPointToMap(zone, handleLocalPoint(bounds, 'e'), transform),
    se: zoneLocalPointToMap(zone, handleLocalPoint(bounds, 'se'), transform),
    s: zoneLocalPointToMap(zone, handleLocalPoint(bounds, 's'), transform),
    sw: zoneLocalPointToMap(zone, handleLocalPoint(bounds, 'sw'), transform),
    w: zoneLocalPointToMap(zone, handleLocalPoint(bounds, 'w'), transform),
    nw: zoneLocalPointToMap(zone, handleLocalPoint(bounds, 'nw'), transform),
    rotate: { x: 0, y: 0 },
  };
  const top = points.n;
  const outward = zoneLocalDirectionToMap(zone, { x: 0, y: -1 });
  const rotateGap = Math.max(28, Math.min(56, bounds.height * 0.35));
  points.rotate = {
    x: top.x + outward.x * rotateGap,
    y: top.y + outward.y * rotateGap,
  };
  return points;
}

export function getSpatialZonePolygonPoints(zone: SpatialZone): Array<{ x: number; y: number }> | null {
  if (zone.shape.type !== 'polygon') return null;
  const points = parsePolygonPoints(zone.shape.points);
  return points.length >= 3 ? points : null;
}

export function getSpatialZonePolygonHandles(
  zone: SpatialZone,
  policy: Pick<NormalizedSpatialEditPolicy, 'minScale' | 'maxScale'>,
): SpatialZonePolygonHandles | null {
  const points = getSpatialZonePolygonPoints(zone);
  if (!points) return null;

  const transform = normalizeSpatialTransform(zone.transform, policy);
  const vertices = points.map((point, index) => ({
    index,
    point: zoneLocalPointToMap(zone, point, transform),
  }));
  const segments = points.map((point, index) => {
    const next = points[(index + 1) % points.length];
    return {
      index,
      point: zoneLocalPointToMap(zone, {
        x: (point.x + next.x) / 2,
        y: (point.y + next.y) / 2,
      }, transform),
    };
  });

  return { vertices, segments };
}

function normalizePolygonWorldPoint(
  zone: SpatialZone,
  point: { x: number; y: number },
  rect: SpatialRect,
  policy: NormalizedSpatialEditPolicy,
): { x: number; y: number } {
  const bounded = policy.bounds === 'viewBox' ? clampPointToRect(point, rect) : point;
  return roundPoint(mapPointToZoneLocal(zone, bounded, policy), policy.coordinatePrecision);
}

export function moveSpatialZonePolygonVertex(
  zone: SpatialZone,
  args: {
    vertexIndex: number;
    worldPoint: { x: number; y: number };
    rect: SpatialRect;
    policy: NormalizedSpatialEditPolicy;
  },
): SpatialZone {
  const points = getSpatialZonePolygonPoints(zone);
  if (!points || args.vertexIndex < 0 || args.vertexIndex >= points.length) return zone;

  const nextPoints = points.map((point, index) => (index === args.vertexIndex
    ? normalizePolygonWorldPoint(zone, args.worldPoint, args.rect, args.policy)
    : point));

  return {
    ...zone,
    shape: {
      type: 'polygon',
      points: nextPoints,
    },
  };
}

export function insertSpatialZonePolygonVertex(
  zone: SpatialZone,
  args: {
    segmentIndex: number;
    worldPoint: { x: number; y: number };
    rect: SpatialRect;
    policy: NormalizedSpatialEditPolicy;
  },
): SpatialZone {
  const points = getSpatialZonePolygonPoints(zone);
  if (!points || args.segmentIndex < 0 || args.segmentIndex >= points.length) return zone;

  const nextPoint = normalizePolygonWorldPoint(zone, args.worldPoint, args.rect, args.policy);
  const nextPoints = [
    ...points.slice(0, args.segmentIndex + 1),
    nextPoint,
    ...points.slice(args.segmentIndex + 1),
  ];

  return {
    ...zone,
    shape: {
      type: 'polygon',
      points: nextPoints,
    },
  };
}

export function deleteSpatialZonePolygonVertex(
  zone: SpatialZone,
  args: { vertexIndex: number },
): SpatialZone {
  const points = getSpatialZonePolygonPoints(zone);
  if (!points || points.length <= 3 || args.vertexIndex < 0 || args.vertexIndex >= points.length) return zone;

  return {
    ...zone,
    shape: {
      type: 'polygon',
      points: points.filter((_, index) => index !== args.vertexIndex),
    },
  };
}

export function getSpatialZoneTransformedBounds(
  zone: SpatialZone & { localBounds?: SpatialLocalBounds },
  policy: NormalizedSpatialEditPolicy,
): SpatialLocalBounds | null {
  const bounds = getSpatialZoneMapBounds(zone);
  if (!bounds) return null;
  const transform = normalizeSpatialTransform(zone.transform, policy);
  const corners = [
    handleLocalPoint(bounds, 'nw'),
    handleLocalPoint(bounds, 'ne'),
    handleLocalPoint(bounds, 'se'),
    handleLocalPoint(bounds, 'sw'),
  ].map((point) => zoneLocalPointToMap(zone, point, transform));
  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function resizeSpatialItem(
  item: SpatialItem & { localBounds?: SpatialLocalBounds },
  args: {
    handle: SpatialResizeHandle;
    localPoint: { x: number; y: number };
    policy: NormalizedSpatialEditPolicy;
    preserveAspectRatio: boolean;
  },
): SpatialItem {
  const bounds = getSpatialItemLocalBounds(item);
  if (!bounds) return item;
  const current = normalizeSpatialTransform(item.transform, args.policy);
  const anchor = handleLocalPoint(bounds, oppositeHandle(args.handle));
  const active = handleLocalPoint(bounds, args.handle);
  const widthDenominator = active.x - anchor.x;
  const heightDenominator = active.y - anchor.y;
  const scaledLocalPoint = {
    x: args.localPoint.x * current.scaleX,
    y: args.localPoint.y * current.scaleY,
  };
  const scaledAnchor = {
    x: anchor.x * current.scaleX,
    y: anchor.y * current.scaleY,
  };
  let nextScaleX = current.scaleX;
  let nextScaleY = current.scaleY;

  if (widthDenominator !== 0) {
    nextScaleX = Math.abs((scaledLocalPoint.x - scaledAnchor.x) / widthDenominator);
  }
  if (heightDenominator !== 0) {
    nextScaleY = Math.abs((scaledLocalPoint.y - scaledAnchor.y) / heightDenominator);
  }
  if (args.preserveAspectRatio) {
    const dominant = Math.abs(nextScaleX - current.scaleX) >= Math.abs(nextScaleY - current.scaleY)
      ? nextScaleX
      : nextScaleY;
    if (widthDenominator !== 0) nextScaleX = dominant;
    if (heightDenominator !== 0) nextScaleY = dominant;
  }

  const transform = normalizeSpatialTransform({ scaleX: nextScaleX, scaleY: nextScaleY }, args.policy);
  const anchorBefore = itemLocalPointToMap(item, anchor, current);
  const rotatedAnchorAfter = rotatePoint({ x: anchor.x * transform.scaleX, y: anchor.y * transform.scaleY }, item.rotation ?? 0);
  return {
    ...item,
    position: {
      x: anchorBefore.x - rotatedAnchorAfter.x,
      y: anchorBefore.y - rotatedAnchorAfter.y,
    },
    transform,
  };
}

export function resizeSpatialZone(
  zone: SpatialZone & { localBounds?: SpatialLocalBounds },
  args: {
    handle: SpatialResizeHandle;
    localPoint: { x: number; y: number };
    policy: NormalizedSpatialEditPolicy;
    preserveAspectRatio: boolean;
  },
): SpatialZone {
  const bounds = getSpatialZoneMapBounds(zone);
  if (!bounds) return zone;
  const current = normalizeSpatialTransform(zone.transform, args.policy);
  const anchor = handleLocalPoint(bounds, oppositeHandle(args.handle));
  const active = handleLocalPoint(bounds, args.handle);
  const widthDenominator = active.x - anchor.x;
  const heightDenominator = active.y - anchor.y;
  const scaledLocalPoint = {
    x: args.localPoint.x * current.scaleX,
    y: args.localPoint.y * current.scaleY,
  };
  const scaledAnchor = {
    x: anchor.x * current.scaleX,
    y: anchor.y * current.scaleY,
  };
  let nextScaleX = current.scaleX;
  let nextScaleY = current.scaleY;

  if (widthDenominator !== 0) {
    nextScaleX = Math.abs((scaledLocalPoint.x - scaledAnchor.x) / widthDenominator);
  }
  if (heightDenominator !== 0) {
    nextScaleY = Math.abs((scaledLocalPoint.y - scaledAnchor.y) / heightDenominator);
  }
  if (args.preserveAspectRatio) {
    const dominant = Math.abs(nextScaleX - current.scaleX) >= Math.abs(nextScaleY - current.scaleY)
      ? nextScaleX
      : nextScaleY;
    if (widthDenominator !== 0) nextScaleX = dominant;
    if (heightDenominator !== 0) nextScaleY = dominant;
  }

  const transform = normalizeSpatialTransform({ scaleX: nextScaleX, scaleY: nextScaleY }, args.policy);
  const anchorBefore = zoneLocalPointToMap(zone, anchor, current);
  const rotatedAnchorAfter = rotatePoint({ x: anchor.x * transform.scaleX, y: anchor.y * transform.scaleY }, zone.rotation ?? 0);
  return {
    ...zone,
    position: {
      x: anchorBefore.x - rotatedAnchorAfter.x,
      y: anchorBefore.y - rotatedAnchorAfter.y,
    },
    transform,
  };
}

export function normalizeSpatialRotation(rotation: number): number {
  if (!Number.isFinite(rotation)) return 0;
  let normalized = rotation % 360;
  if (normalized >= 180) normalized -= 360;
  if (normalized < -180) normalized += 360;
  return normalized;
}

export function rotateSpatialItem(
  item: SpatialItem,
  rotation: number,
  policy: Pick<NormalizedSpatialEditPolicy, 'rotationStep'>,
): SpatialItem {
  const step = policy.rotationStep;
  const snapped = step > 0 ? Math.round(rotation / step) * step : rotation;
  return {
    ...item,
    rotation: normalizeSpatialRotation(snapped),
  };
}

function sameSpatialTransform(
  a: SpatialItem['transform'] | undefined,
  b: SpatialItem['transform'] | undefined,
  policy: Pick<NormalizedSpatialEditPolicy, 'minScale' | 'maxScale'>,
): boolean {
  const left = normalizeSpatialTransform(a, policy);
  const right = normalizeSpatialTransform(b, policy);
  return left.scaleX === right.scaleX && left.scaleY === right.scaleY;
}

function nearestGridValue(value: number, size: number, offset: number): number {
  return offset + Math.round((value - offset) / size) * size;
}

function keyboardGridValue(origin: number, delta: number, size: number, offset: number): number {
  const direction = delta < 0 ? -1 : 1;
  const steps = Math.max(1, Math.round(Math.abs(delta) / size));
  const originRatio = (origin - offset) / size;
  const originStop = direction > 0
    ? Math.floor(originRatio)
    : Math.ceil(originRatio);
  return offset + (originStop + direction * steps) * size;
}

function uniqueSources(guides: SpatialEditGuide[]): SpatialEditGuideSource[] {
  const seen = new Set<SpatialEditGuideSource>();
  const sources: SpatialEditGuideSource[] = [];
  for (const guide of guides) {
    if (!seen.has(guide.source)) {
      seen.add(guide.source);
      sources.push(guide.source);
    }
  }
  return sources;
}

function candidateWins(
  candidate: SpatialEditGuideCandidate,
  current: SpatialEditGuideCandidate | undefined,
): boolean {
  if (!current) return true;
  if (candidate.distance < current.distance) return true;
  return candidate.distance === current.distance && candidate.source === 'item-center';
}

function axisValue(point: { x: number; y: number }, axis: SpatialEditGuideAxis): number {
  return axis === 'x' ? point.x : point.y;
}

function axisPoint(
  point: { x: number; y: number },
  axis: SpatialEditGuideAxis,
  value: number,
): { x: number; y: number } {
  return axis === 'x'
    ? { x: value, y: point.y }
    : { x: point.x, y: value };
}

export function resolveSpatialEditPoint(args: {
  rawPoint: { x: number; y: number };
  rect: SpatialRect;
  policy: NormalizedSpatialEditPolicy;
  items?: SpatialItem[];
  currentItemId?: string | number;
  intent?: SpatialEditPointIntent;
}): SpatialSnapResolution {
  const boundedRaw = args.policy.bounds === 'viewBox'
    ? clampPointToRect(args.rawPoint, args.rect)
    : args.rawPoint;
  let point = boundedRaw;
  const guidesByAxis: Partial<Record<SpatialEditGuideAxis, SpatialEditGuideCandidate>> = {};

  if (args.policy.snap.enabled) {
    if (args.policy.snap.grid.enabled) {
      for (const axis of ['x', 'y'] as const) {
        const value = axisValue(point, axis);
        const size = args.policy.snap.grid.size[axis];
        const offset = args.policy.snap.grid.offset[axis];
        const keyboardIntent = args.intent?.kind === 'keyboard' ? args.intent : undefined;
        const intentDelta = keyboardIntent ? keyboardIntent.delta[axis] : 0;
        let usesKeyboardGridStep = false;
        let position = nearestGridValue(value, size, offset);
        if (keyboardIntent && intentDelta !== 0) {
          usesKeyboardGridStep = true;
          position = keyboardGridValue(keyboardIntent.origin[axis], intentDelta, size, offset);
        }
        const distance = usesKeyboardGridStep ? 0 : Math.abs(position - value);
        if (usesKeyboardGridStep || distance <= args.policy.snap.grid.threshold) {
          guidesByAxis[axis] = {
            axis,
            source: 'grid',
            value: position,
            distance,
          };
        }
      }
    }

    if (args.policy.snap.itemCenters.enabled) {
      for (const candidateItem of args.items ?? []) {
        if (
          args.currentItemId !== undefined
          && String(candidateItem.id) === String(args.currentItemId)
        ) {
          continue;
        }
        if (!Number.isFinite(candidateItem.position?.x) || !Number.isFinite(candidateItem.position?.y)) {
          continue;
        }

        for (const axis of ['x', 'y'] as const) {
          const position = candidateItem.position[axis];
          const keyboardIntent = args.intent?.kind === 'keyboard' ? args.intent : undefined;
          const intentDelta = keyboardIntent ? keyboardIntent.delta[axis] : 0;
          const gridGuide = intentDelta !== 0 && guidesByAxis[axis]?.source === 'grid'
            ? guidesByAxis[axis]
            : undefined;
          if (keyboardIntent && intentDelta !== 0 && !gridGuide) {
            const origin = keyboardIntent.origin[axis];
            if (
              (intentDelta > 0 && position <= origin)
              || (intentDelta < 0 && position >= origin)
            ) {
              continue;
            }
          }
          const comparisonValue = gridGuide ? gridGuide.value : axisValue(point, axis);
          const distance = Math.abs(position - comparisonValue);
          if (distance > args.policy.snap.itemCenters.threshold) continue;

          const candidate = {
            axis,
            source: 'item-center' as const,
            value: position,
            distance,
            targetId: candidateItem.id,
          };
          if (candidateWins(candidate, guidesByAxis[axis])) {
            guidesByAxis[axis] = candidate;
          }
        }
      }
    }

    const axisGuides = (['x', 'y'] as const)
      .map((axis) => guidesByAxis[axis])
      .filter((guide): guide is SpatialEditGuideCandidate => Boolean(guide));
    for (const guide of axisGuides) {
      point = axisPoint(point, guide.axis, guide.value);
    }
  }

  const snapGuides = (['x', 'y'] as const)
    .map((axis) => guidesByAxis[axis])
    .filter((guide): guide is SpatialEditGuideCandidate => Boolean(guide))
    .map(({ distance: _distance, ...guide }) => guide);
  const snapped = snapGuides.length > 0;
  const boundedSnapped = args.policy.bounds === 'viewBox'
    ? clampPointToRect(point, args.rect)
    : point;
  const roundedPoint = roundPoint(boundedSnapped, args.policy.coordinatePrecision);

  return {
    point: roundedPoint,
    rawPoint: args.rawPoint,
    snapped,
    guides: snapGuides,
    sources: uniqueSources(snapGuides),
  };
}

export function isMovableSpatialItem(item: SpatialItem): boolean {
  if (item.disabled) return false;
  return Number.isFinite(item.position?.x) && Number.isFinite(item.position?.y);
}

export function moveSpatialItem(
  item: SpatialItem,
  position: { x: number; y: number },
): SpatialItem {
  return {
    ...item,
    position: { x: position.x, y: position.y },
  };
}

export function moveSpatialZone(
  zone: SpatialZone & { position?: { x: number; y: number }; localBounds?: SpatialLocalBounds },
  position: { x: number; y: number },
  rect: SpatialRect,
  policy: NormalizedSpatialEditPolicy,
): SpatialZone {
  return {
    ...zone,
    position: normalizeZonePosition(zone, position, rect, policy),
  };
}

export function samePoint(
  a: { x: number; y: number },
  b: { x: number; y: number },
): boolean {
  return a.x === b.x && a.y === b.y;
}

export function hasSpatialItemChangedByType(args: {
  previousItem: SpatialItem;
  nextItem: SpatialItem;
  changeType: SpatialItemChangeContext['changeType'];
  policy: NormalizedSpatialEditPolicy;
  rect?: SpatialRect;
}): boolean {
  const previousPosition = args.rect
    ? normalizeEditPosition(args.previousItem.position, args.rect, args.policy)
    : args.previousItem.position;
  const nextPosition = args.rect
    ? normalizeEditPosition(args.nextItem.position, args.rect, args.policy)
    : args.nextItem.position;
  if (args.changeType === 'move') {
    return !samePoint(previousPosition, nextPosition);
  }
  if (args.changeType === 'resize') {
    return !sameSpatialTransform(args.previousItem.transform, args.nextItem.transform, args.policy)
      || !samePoint(previousPosition, nextPosition);
  }
  if (args.changeType === 'rotate') {
    return normalizeSpatialRotation(args.previousItem.rotation ?? 0) !== normalizeSpatialRotation(args.nextItem.rotation ?? 0);
  }
  return args.previousItem !== args.nextItem;
}

export function hasSpatialZoneChangedByType(args: {
  previousZone: SpatialZone;
  nextZone: SpatialZone;
  changeType: SpatialZoneChangeContext['changeType'];
  policy: NormalizedSpatialEditPolicy;
}): boolean {
  const previousPosition = getSpatialZonePosition(args.previousZone);
  const nextPosition = getSpatialZonePosition(args.nextZone);
  if (args.changeType === 'move') {
    return !samePoint(previousPosition, nextPosition);
  }
  if (args.changeType === 'resize') {
    return !sameSpatialTransform(args.previousZone.transform, args.nextZone.transform, args.policy)
      || !samePoint(previousPosition, nextPosition);
  }
  if (args.changeType === 'rotate') {
    return normalizeSpatialRotation(args.previousZone.rotation ?? 0) !== normalizeSpatialRotation(args.nextZone.rotation ?? 0);
  }
  if (args.changeType === 'shape') {
    const previousPoints = getSpatialZonePolygonPoints(args.previousZone);
    const nextPoints = getSpatialZonePolygonPoints(args.nextZone);
    if (!previousPoints || !nextPoints) {
      return previousPoints !== nextPoints;
    }
    if (previousPoints.length !== nextPoints.length) {
      return true;
    }
    return previousPoints.some((point, index) => !samePoint(point, nextPoints[index]));
  }
  return args.previousZone !== args.nextZone;
}

export function buildSpatialItemChangeContext(args: {
  mode: SpatialMapMode;
  changeType: SpatialItemChangeContext['changeType'];
  previousItem: SpatialItem | null;
  nextItem: SpatialItem;
  zones: SpatialZone[];
  policy: NormalizedSpatialEditPolicy;
}): SpatialItemChangeContext {
  const zone = args.nextItem.zoneId
    ? args.zones.find((candidate) => candidate.id === args.nextItem.zoneId)
    : undefined;
  const previousPosition = args.previousItem?.position;
  const position = args.nextItem.position;
  const previousTransform = args.previousItem
    ? normalizeSpatialTransform(args.previousItem.transform, args.policy)
    : undefined;
  const transform = normalizeSpatialTransform(args.nextItem.transform, args.policy);
  const previousRotation = args.previousItem?.rotation ?? 0;
  const rotation = args.nextItem.rotation ?? 0;
  const previousLocalBounds = args.previousItem
    ? getSpatialItemLocalBounds(args.previousItem) ?? undefined
    : undefined;
  const localBounds = getSpatialItemLocalBounds(args.nextItem) ?? undefined;

  return {
    kind: 'item-change',
    changeType: args.changeType,
    mode: args.mode,
    itemId: args.nextItem.id,
    zoneId: args.nextItem.zoneId,
    previousItem: args.previousItem,
    nextItem: args.nextItem,
    item: args.nextItem,
    ...(previousPosition ? { previousPosition } : {}),
    position,
    ...(previousPosition ? {
      delta: {
        x: position.x - previousPosition.x,
        y: position.y - previousPosition.y,
      },
    } : {}),
    previousTransform,
    transform,
    previousRotation,
    rotation,
    previousLocalBounds,
    localBounds,
    zone,
  };
}

export function buildSpatialZoneChangeContext(args: {
  mode: SpatialMapMode;
  changeType: SpatialZoneChangeContext['changeType'];
  previousZone: SpatialZone | null;
  nextZone: SpatialZone;
  policy: NormalizedSpatialEditPolicy;
  shapeAction?: SpatialZoneChangeContext['shapeAction'];
  vertexIndex?: number;
  segmentIndex?: number;
}): SpatialZoneChangeContext {
  const previousPosition = args.previousZone ? getSpatialZonePosition(args.previousZone) : undefined;
  const position = getSpatialZonePosition(args.nextZone);
  const previousTransform = args.previousZone
    ? normalizeSpatialTransform(args.previousZone.transform, args.policy)
    : undefined;
  const transform = normalizeSpatialTransform(args.nextZone.transform, args.policy);
  const previousRotation = args.previousZone?.rotation ?? 0;
  const rotation = args.nextZone.rotation ?? 0;
  const previousLocalBounds = args.previousZone
    ? getSpatialZoneMapBounds(args.previousZone) ?? undefined
    : undefined;
  const localBounds = getSpatialZoneMapBounds(args.nextZone) ?? undefined;
  const previousPoints = args.previousZone
    ? getSpatialZonePolygonPoints(args.previousZone) ?? undefined
    : undefined;
  const points = getSpatialZonePolygonPoints(args.nextZone) ?? undefined;

  return {
    kind: 'zone-change',
    changeType: args.changeType,
    mode: args.mode,
    zoneId: args.nextZone.id,
    previousZone: args.previousZone,
    nextZone: args.nextZone,
    zone: args.nextZone,
    ...(previousPosition ? { previousPosition } : {}),
    position,
    ...(previousPosition ? {
      delta: {
        x: position.x - previousPosition.x,
        y: position.y - previousPosition.y,
      },
    } : {}),
    previousTransform,
    transform,
    previousRotation,
    rotation,
    previousLocalBounds,
    localBounds,
    ...(args.changeType === 'shape' ? {
      ...(args.previousZone ? { previousShape: args.previousZone.shape } : {}),
      shape: args.nextZone.shape,
      ...(previousPoints ? { previousPoints } : {}),
      ...(points ? { points } : {}),
      ...(typeof args.vertexIndex === 'number' ? { vertexIndex: args.vertexIndex } : {}),
      ...(typeof args.segmentIndex === 'number' ? { segmentIndex: args.segmentIndex } : {}),
      ...(args.shapeAction ? { shapeAction: args.shapeAction } : {}),
    } : {}),
  };
}

export function buildItemChangeContext(args: {
  mode: SpatialMapMode;
  previousItem: SpatialItem;
  nextItem: SpatialItem;
  zones: SpatialZone[];
  policy?: NormalizedSpatialEditPolicy;
}): SpatialItemChangeContext {
  return buildSpatialItemChangeContext({
    ...args,
    changeType: 'move',
    policy: args.policy ?? getEditPolicy(args.mode),
  });
}
