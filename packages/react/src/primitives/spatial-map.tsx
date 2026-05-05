import React from 'react';
import type { CSSProperties } from 'react';
import {
  buildSpatialItemChangeContext,
  buildSpatialZoneChangeContext,
  getEditPolicy,
  getSpatialItemLocalBounds,
  getSpatialItemWorldHandlePoints,
  getSpatialZoneMapBounds,
  getSpatialZonePolygonHandles,
  getSpatialZonePosition,
  getSpatialZoneTransformedBounds,
  getSpatialZoneWorldHandlePoints,
  hasSpatialItemChangedByType,
  hasSpatialZoneChangedByType,
  insertSpatialZonePolygonVertex,
  deleteSpatialZonePolygonVertex,
  isMovableSpatialItem,
  mapPointToItemLocal,
  mapPointToZoneLocal,
  moveSpatialZone,
  moveSpatialItem,
  moveSpatialZonePolygonVertex,
  normalizeSpatialTransform,
  normalizeEditPosition,
  resizeSpatialItem,
  resizeSpatialZone,
  rotateSpatialItem,
  resolveSpatialEditPoint,
  samePoint,
  type SpatialEditGuide,
  type SpatialEditPointIntent,
  type SpatialEditPolicy,
  type SpatialItemChangeContext,
  type SpatialItemTransform,
  type SpatialZoneChangeContext,
  type SpatialLocalBounds,
  type SpatialResizeHandle,
  type SpatialSnapResolution,
} from './spatial-map-editing.js';

export { resolveSpatialEditPoint } from './spatial-map-editing.js';
export type {
  SpatialEditGuide,
  SpatialEditPolicy,
  SpatialItemChangeContext,
  SpatialItemTransform,
  SpatialZoneChangeContext,
  SpatialLocalBounds,
  SpatialSnapResolution,
} from './spatial-map-editing.js';

export type SpatialMapMode = 'readonly' | 'operate' | 'edit';

export type SpatialPoint = [number, number] | { x: number; y: number };

export type SpatialItemShape =
  | { type: 'rect'; width: number; height: number; radius?: number }
  | { type: 'circle'; radius: number }
  | { type: 'ellipse'; radiusX: number; radiusY: number }
  | { type: 'polygon'; points: SpatialPoint[] | string }
  | { type: 'path'; d: string };

export type SpatialZoneShape =
  | { type: 'rect'; x: number; y: number; width: number; height: number; radius?: number }
  | { type: 'circle'; cx: number; cy: number; radius: number }
  | { type: 'ellipse'; cx: number; cy: number; radiusX: number; radiusY: number }
  | { type: 'polygon'; points: SpatialPoint[] | string }
  | { type: 'path'; d: string };

export interface SpatialZone {
  id: string;
  label?: string;
  shape: SpatialZoneShape;
  position?: { x: number; y: number };
  rotation?: number;
  transform?: SpatialItemTransform;
  localBounds?: SpatialLocalBounds;
  style?: CSSProperties;
  layer?: string;
  disabled?: boolean;
  ariaLabel?: string;
  metadata?: Record<string, unknown>;
}

export interface SpatialItem {
  id: string | number;
  label?: string;
  zoneId?: string;
  position: { x: number; y: number };
  rotation?: number;
  transform?: SpatialItemTransform;
  localBounds?: SpatialLocalBounds;
  shape: SpatialItemShape;
  status?: string;
  disabled?: boolean;
  ariaLabel?: string;
  layer?: string;
  metadata?: Record<string, unknown>;
}

export interface SpatialStatusStyle {
  fill?: string;
  stroke?: string;
  text?: string;
  opacity?: number;
  strokeWidth?: number;
}

export interface SpatialSelectionContext {
  kind: 'item';
  mode: SpatialMapMode;
  itemId: string | number;
  zoneId?: string;
  status?: string;
  label?: string;
  position: { x: number; y: number };
  rotation: number;
  transform?: SpatialItemTransform;
  localBounds?: SpatialLocalBounds;
  shape: SpatialItemShape;
  metadata?: Record<string, unknown>;
  item: SpatialItem;
  zone?: SpatialZone;
}

export interface SpatialCanvasPressContext {
  kind: 'canvas';
  mode: SpatialMapMode;
  point: { x: number; y: number };
  rawPoint: { x: number; y: number };
  snap?: { snapped: boolean; sources: Array<'grid' | 'item-center'> };
  viewBox: { x: number; y: number; width: number; height: number };
  zoneId?: string | number;
  zone?: SpatialZone;
}

export interface SpatialZoneSelectionContext {
  kind: 'zone';
  mode: SpatialMapMode;
  zoneId: string;
  label?: string;
  position: { x: number; y: number };
  rotation: number;
  transform?: SpatialItemTransform;
  localBounds?: SpatialLocalBounds;
  shape: SpatialZoneShape;
  metadata?: Record<string, unknown>;
  zone: SpatialZone;
}

export interface SpatialInteractionPolicy {
  selectItems?: boolean;
  activateItems?: boolean;
  selectZones?: boolean;
  activateZones?: boolean;
  zonePressStopsCanvas?: boolean;
  clearSelectionOnCanvasPress?: boolean;
  keyboardNavigation?: boolean;
}

export interface SpatialCanvasGuide {
  visible?: boolean;
  kind?: 'crosshair';
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  opacity?: number;
  showPoint?: boolean;
}

export interface SpatialMapProps {
  viewBox: { x: number; y: number; width: number; height: number } | string;
  zones?: SpatialZone[];
  items?: SpatialItem[];
  layers?: string[];
  mode?: SpatialMapMode;
  statusStyles?: Record<string, SpatialStatusStyle>;
  selectedItemPath?: string;
  selectedItemId?: string | number;
  selectedZonePath?: string;
  selectedZoneId?: string;
  zoneShapeEditId?: string;
  canvasPressPath?: string;
  interactionPolicy?: SpatialInteractionPolicy;
  editPolicy?: SpatialEditPolicy;
  canvasGuide?: SpatialCanvasGuide;
  itemChangePath?: string;
  zoneChangePath?: string;
  ariaLabel?: string;
  style?: CSSProperties;
  className?: string;
  _onItemSelect?: (context: SpatialSelectionContext) => void;
  _onZoneSelect?: (context: SpatialZoneSelectionContext) => void;
  onItemPress?: (context: SpatialSelectionContext) => void;
  onItemChange?: (context: SpatialItemChangeContext) => void;
  onZonePress?: (context: SpatialZoneSelectionContext) => void;
  onZoneChange?: (context: SpatialZoneChangeContext) => void;
  onZoneShapeEditExit?: () => void;
  onCanvasPress?: (context: SpatialCanvasPressContext) => void;
  _selectedItemContext?: SpatialSelectionContext;
  _selectedZoneContext?: SpatialZoneSelectionContext;
}

const DEFAULT_LAYERS = ['background', 'zones', 'items', 'labels', 'overlays'];

const DEFAULT_STATUS_STYLE: SpatialStatusStyle = {
  fill: '#f8fafc',
  stroke: '#94a3b8',
  text: '#1f2937',
  strokeWidth: 2,
};

const SELECTED_STYLE: SpatialStatusStyle = {
  fill: 'transparent',
  stroke: '#2563eb',
  strokeWidth: 5,
};

function viewBoxToString(viewBox: SpatialMapProps['viewBox']): string {
  if (typeof viewBox === 'string') return viewBox;
  return `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;
}

function viewBoxRect(viewBox: SpatialMapProps['viewBox']): { x: number; y: number; width: number; height: number } {
  if (typeof viewBox !== 'string') return viewBox;
  const [x, y, width, height] = viewBox.split(/\s+/).map(Number);
  return { x, y, width, height };
}

interface SpatialMoveState {
  kind: 'move';
  itemId: string | number;
  pointerId: number;
  previousItem: SpatialItem;
  startPoint: { x: number; y: number };
  previewPosition: { x: number; y: number };
  previewItem?: SpatialItem;
  snapResolution: SpatialSnapResolution;
  hasMoved: boolean;
}

interface SpatialZoneMoveState {
  kind: 'zone-move';
  zoneId: string;
  pointerId: number;
  previousZone: SpatialZone;
  startPoint: { x: number; y: number };
  startPosition: { x: number; y: number };
  previewZone?: SpatialZone;
  snapResolution: SpatialSnapResolution;
  hasMoved: boolean;
}

interface SpatialResizeState {
  kind: 'resize';
  itemId: string | number;
  pointerId: number;
  previousItem: SpatialItem;
  handle: SpatialResizeHandle;
  previewItem: SpatialItem;
  snapResolution: SpatialSnapResolution | null;
  hasChanged: boolean;
}

interface SpatialZoneResizeState {
  kind: 'zone-resize';
  zoneId: string;
  pointerId: number;
  previousZone: SpatialZone;
  handle: SpatialResizeHandle;
  previewZone: SpatialZone;
  snapResolution: SpatialSnapResolution | null;
  hasChanged: boolean;
}

interface SpatialRotateState {
  kind: 'rotate';
  itemId: string | number;
  pointerId: number;
  previousItem: SpatialItem;
  startAngle: number;
  startRotation: number;
  previewItem: SpatialItem;
  hasChanged: boolean;
}

interface SpatialZoneShapeDragState {
  kind: 'zone-shape';
  zoneId: string;
  pointerId: number;
  previousZone: SpatialZone;
  vertexIndex: number;
  previewZone: SpatialZone;
  snapResolution: SpatialSnapResolution | null;
  hasChanged: boolean;
}

type SpatialDragState =
  | SpatialMoveState
  | SpatialZoneMoveState
  | SpatialResizeState
  | SpatialZoneResizeState
  | SpatialRotateState
  | SpatialZoneShapeDragState;

function svgPointFromPointer(
  event: Pick<PointerEvent | React.PointerEvent<SVGElement>, 'clientX' | 'clientY'>,
  svg: SVGSVGElement,
  rect: { x: number; y: number; width: number; height: number },
): { x: number; y: number } {
  const svgWithPoint = svg as SVGSVGElement & {
    createSVGPoint?: () => DOMPoint;
    getScreenCTM?: () => DOMMatrix | null;
  };
  const pointFactory = svgWithPoint.createSVGPoint;
  const matrix = svgWithPoint.getScreenCTM?.();
  if (pointFactory && matrix) {
    const point = pointFactory.call(svgWithPoint);
    point.x = event.clientX;
    point.y = event.clientY;
    const transformed = point.matrixTransform(matrix.inverse());
    return { x: transformed.x, y: transformed.y };
  }

  const clientRect = svg.getBoundingClientRect();
  const width = clientRect.width || rect.width;
  const height = clientRect.height || rect.height;
  return {
    x: rect.x + ((event.clientX - clientRect.left) / width) * rect.width,
    y: rect.y + ((event.clientY - clientRect.top) / height) * rect.height,
  };
}

function pointsToString(points: SpatialPoint[] | string): string {
  if (typeof points === 'string') return points;
  return points.map((point) => {
    if (Array.isArray(point)) return `${point[0]},${point[1]}`;
    return `${point.x},${point.y}`;
  }).join(' ');
}

function renderItemShape(
  shape: SpatialItemShape,
  key: string,
  style: SpatialStatusStyle,
  extraProps: Record<string, unknown> = {},
): React.ReactElement {
  const common = {
    key,
    fill: style.fill ?? DEFAULT_STATUS_STYLE.fill,
    stroke: style.stroke ?? DEFAULT_STATUS_STYLE.stroke,
    strokeWidth: style.strokeWidth ?? DEFAULT_STATUS_STYLE.strokeWidth,
    opacity: style.opacity,
    vectorEffect: 'non-scaling-stroke',
    ...extraProps,
  };

  if (shape.type === 'rect') {
    return React.createElement('rect', {
      ...common,
      x: -shape.width / 2,
      y: -shape.height / 2,
      width: shape.width,
      height: shape.height,
      rx: shape.radius ?? 0,
      ry: shape.radius ?? 0,
    });
  }

  if (shape.type === 'circle') {
    return React.createElement('circle', { ...common, r: shape.radius });
  }

  if (shape.type === 'ellipse') {
    return React.createElement('ellipse', { ...common, rx: shape.radiusX, ry: shape.radiusY });
  }

  if (shape.type === 'polygon') {
    return React.createElement('polygon', { ...common, points: pointsToString(shape.points) });
  }

  return React.createElement('path', { ...common, d: shape.d });
}

function renderZoneShape(
  zone: SpatialZone,
  key: string,
  styleOverride?: SpatialStatusStyle,
  extraProps?: Record<string, unknown>,
): React.ReactElement {
  const style = {
    fill: '#ffffff',
    stroke: '#94a3b8',
    strokeWidth: 3,
    ...(zone.style ?? {}),
    ...(styleOverride ?? {}),
  };
  const common = {
    key,
    fill: style.fill ?? '#ffffff',
    stroke: style.stroke ?? '#94a3b8',
    strokeWidth: style.strokeWidth ?? 3,
    opacity: style.opacity,
    vectorEffect: 'non-scaling-stroke',
    'data-testid': `spatial-zone-shape-${zone.id}`,
    ...(extraProps ?? {}),
  };

  if (zone.shape.type === 'rect') {
    return React.createElement('rect', {
      ...common,
      x: zone.shape.x,
      y: zone.shape.y,
      width: zone.shape.width,
      height: zone.shape.height,
      rx: zone.shape.radius ?? 0,
      ry: zone.shape.radius ?? 0,
    });
  }

  if (zone.shape.type === 'circle') {
    return React.createElement('circle', {
      ...common,
      cx: zone.shape.cx,
      cy: zone.shape.cy,
      r: zone.shape.radius,
    });
  }

  if (zone.shape.type === 'ellipse') {
    return React.createElement('ellipse', {
      ...common,
      cx: zone.shape.cx,
      cy: zone.shape.cy,
      rx: zone.shape.radiusX,
      ry: zone.shape.radiusY,
    });
  }

  if (zone.shape.type === 'polygon') {
    return React.createElement('polygon', { ...common, points: pointsToString(zone.shape.points) });
  }

  return React.createElement('path', { ...common, d: zone.shape.d });
}

function buildItemContext(item: SpatialItem, zones: SpatialZone[], mode: SpatialMapMode): SpatialSelectionContext {
  const zone = item.zoneId ? zones.find((candidate) => candidate.id === item.zoneId) : undefined;
  return {
    kind: 'item',
    mode,
    itemId: item.id,
    zoneId: item.zoneId,
    status: item.status,
    label: item.label,
    position: item.position,
    rotation: item.rotation ?? 0,
    transform: item.transform,
    localBounds: item.localBounds,
    shape: item.shape,
    metadata: item.metadata,
    item,
    zone,
  };
}

function buildZoneContext(zone: SpatialZone, mode: SpatialMapMode): SpatialZoneSelectionContext {
  return {
    kind: 'zone',
    mode,
    zoneId: zone.id,
    label: zone.label,
    position: getSpatialZonePosition(zone),
    rotation: zone.rotation ?? 0,
    transform: zone.transform,
    localBounds: zone.localBounds,
    shape: zone.shape,
    metadata: zone.metadata,
    zone,
  };
}

function zoneFromCanvasEvent(
  event: React.MouseEvent<SVGSVGElement>,
  zones: SpatialZone[],
): SpatialZone | undefined {
  const target = event.target;
  if (!(target instanceof Element)) return undefined;
  const zoneId = target.closest('[data-spatial-zone-id]')?.getAttribute('data-spatial-zone-id');
  if (zoneId === null || zoneId === undefined) return undefined;
  return zones.find((candidate) => String(candidate.id) === zoneId);
}

function getPolicy(mode: SpatialMapMode, policy?: SpatialInteractionPolicy): Required<SpatialInteractionPolicy> {
  const selectZones = policy?.selectZones ?? false;
  const activateZones = policy?.activateZones ?? false;
  const defaults: Required<SpatialInteractionPolicy> = {
    selectItems: mode !== 'readonly',
    activateItems: mode === 'operate',
    selectZones,
    activateZones,
    zonePressStopsCanvas: selectZones || activateZones,
    clearSelectionOnCanvasPress: mode !== 'readonly',
    keyboardNavigation: mode !== 'readonly',
  };
  return { ...defaults, ...(policy ?? {}) };
}

function itemAriaLabel(item: SpatialItem): string {
  if (item.ariaLabel) return item.ariaLabel;
  const label = item.label ?? String(item.id);
  return item.status ? `${label}, ${item.status}` : label;
}

function zoneAriaLabel(zone: SpatialZone): string {
  return zone.ariaLabel ?? zone.label ?? String(zone.id);
}

function sameEditGuide(a: SpatialEditGuide, b: SpatialEditGuide): boolean {
  return a.axis === b.axis
    && a.source === b.source
    && a.value === b.value
    && a.targetId === b.targetId;
}

function sameSnapResolution(a: SpatialSnapResolution, b: SpatialSnapResolution): boolean {
  return samePoint(a.point, b.point)
    && samePoint(a.rawPoint, b.rawPoint)
    && a.snapped === b.snapped
    && a.sources.length === b.sources.length
    && a.sources.every((source, index) => source === b.sources[index])
    && a.guides.length === b.guides.length
    && a.guides.every((guide, index) => sameEditGuide(guide, b.guides[index]));
}

export function SpatialMap({
  viewBox,
  zones = [],
  items = [],
  layers = DEFAULT_LAYERS,
  mode = 'operate',
  statusStyles = {},
  selectedItemId,
  selectedZoneId,
  zoneShapeEditId,
  interactionPolicy,
  editPolicy,
  canvasGuide,
  ariaLabel = 'Spatial map',
  style,
  className,
  _onItemSelect,
  _onZoneSelect,
  onItemPress,
  onItemChange,
  onZonePress,
  onZoneChange,
  onZoneShapeEditExit,
  onCanvasPress,
  _selectedItemContext,
  _selectedZoneContext,
}: SpatialMapProps) {
  const policy = getPolicy(mode, interactionPolicy);
  const rect = React.useMemo(() => viewBoxRect(viewBox), [viewBox]);
  const edit = React.useMemo(() => getEditPolicy(mode, editPolicy), [mode, editPolicy]);
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const dragStateRef = React.useRef<SpatialDragState | null>(null);
  const [dragState, setDragState] = React.useState<SpatialDragState | null>(null);
  const [droppedPreviewItems, setDroppedPreviewItems] = React.useState<Map<string | number, SpatialItem>>(() => new Map());
  const [droppedPreviewZones, setDroppedPreviewZones] = React.useState<Map<string, SpatialZone>>(() => new Map());
  const [canvasGuideResolution, setCanvasGuideResolution] = React.useState<SpatialSnapResolution | null>(null);
  const canvasGuideRawPointRef = React.useRef<{ x: number; y: number } | null>(null);
  const droppedPreviewFrameIdsRef = React.useRef<Map<string | number, number>>(new Map());
  const droppedZonePreviewFrameIdsRef = React.useRef<Map<string, number>>(new Map());
  const suppressClickItemRef = React.useRef<string | number | null>(null);
  const suppressCanvasClickRef = React.useRef(false);
  const suppressCanvasClickTokenRef = React.useRef(0);
  const activeSelectedItemId = selectedItemId ?? (policy.selectItems ? _selectedItemContext?.itemId : undefined);
  const activeSelectedZoneId = selectedZoneId ?? (policy.selectZones ? _selectedZoneContext?.zoneId : undefined);
  const canvasGuideVisible = canvasGuide?.visible === true;

  const zonesByLayer = new Map<string, SpatialZone[]>();
  const itemsByLayer = new Map<string, SpatialItem[]>();
  for (const zone of zones) {
    const layer = zone.layer ?? 'zones';
    zonesByLayer.set(layer, [...(zonesByLayer.get(layer) ?? []), zone]);
  }
  for (const item of items) {
    const layer = item.layer ?? 'items';
    itemsByLayer.set(layer, [...(itemsByLayer.get(layer) ?? []), item]);
  }

  function setCurrentDragState(next: SpatialDragState | null): void {
    dragStateRef.current = next;
    setDragState(next);
  }

  function clearDroppedPreviewItem(itemId: string | number): void {
    setDroppedPreviewItems((current) => {
      if (!current.has(itemId)) return current;
      const next = new Map(current);
      next.delete(itemId);
      return next;
    });
  }

  function bridgeDroppedPreviewItem(itemId: string | number, item: SpatialItem): void {
    // Keep the committed drop item visible until the renderer's store-driven frame catches up.
    setDroppedPreviewItems((current) => {
      const next = new Map(current);
      next.set(itemId, item);
      return next;
    });

    const existingFrameId = droppedPreviewFrameIdsRef.current.get(itemId);
    if (existingFrameId !== undefined) {
      window.cancelAnimationFrame(existingFrameId);
    }

    const frameId = window.requestAnimationFrame(() => {
      droppedPreviewFrameIdsRef.current.delete(itemId);
      clearDroppedPreviewItem(itemId);
    });
    droppedPreviewFrameIdsRef.current.set(itemId, frameId);
  }

  function clearDroppedPreviewZone(zoneId: string): void {
    setDroppedPreviewZones((current) => {
      if (!current.has(zoneId)) return current;
      const next = new Map(current);
      next.delete(zoneId);
      return next;
    });
  }

  function bridgeDroppedPreviewZone(zoneId: string, zone: SpatialZone): void {
    setDroppedPreviewZones((current) => {
      const next = new Map(current);
      next.set(zoneId, zone);
      return next;
    });

    const existingFrameId = droppedZonePreviewFrameIdsRef.current.get(zoneId);
    if (existingFrameId !== undefined) {
      window.cancelAnimationFrame(existingFrameId);
    }

    const frameId = window.requestAnimationFrame(() => {
      droppedZonePreviewFrameIdsRef.current.delete(zoneId);
      clearDroppedPreviewZone(zoneId);
    });
    droppedZonePreviewFrameIdsRef.current.set(zoneId, frameId);
  }

  function suppressNextCanvasClick(): void {
    suppressCanvasClickRef.current = true;
    suppressCanvasClickTokenRef.current += 1;
    const token = suppressCanvasClickTokenRef.current;
    window.setTimeout(() => {
      if (suppressCanvasClickTokenRef.current === token) {
        suppressCanvasClickRef.current = false;
      }
    }, 0);
  }

  function resolveEditPoint(
    rawPoint: { x: number; y: number },
    currentItemId?: string | number,
    intent: SpatialEditPointIntent = { kind: 'pointer' },
  ): SpatialSnapResolution {
    return resolveSpatialEditPoint({
      rawPoint,
      rect,
      policy: edit,
      items,
      currentItemId,
      intent,
    });
  }

  function commitItemUpdate(
    previousItem: SpatialItem,
    nextItem: SpatialItem,
    changeType: SpatialItemChangeContext['changeType'],
  ): SpatialItem | null {
    if (!hasSpatialItemChangedByType({
      previousItem,
      nextItem,
      changeType,
      policy: edit,
      rect,
    })) return null;

    onItemChange?.(buildSpatialItemChangeContext({
      mode,
      changeType,
      previousItem,
      nextItem,
      zones,
      policy: edit,
    }));
    return nextItem;
  }

  function commitItemMove(
    previousItem: SpatialItem,
    position: { x: number; y: number },
    intent: SpatialEditPointIntent = { kind: 'pointer' },
  ): SpatialItem | null {
    const previousPosition = normalizeEditPosition(previousItem.position, rect, edit);
    const nextPosition = resolveEditPoint(position, previousItem.id, intent).point;
    if (samePoint(previousPosition, nextPosition)) return null;
    const nextItem = moveSpatialItem(previousItem, nextPosition);
    return commitItemUpdate(previousItem, nextItem, 'move');
  }

  function commitZoneUpdate(
    previousZone: SpatialZone,
    nextZone: SpatialZone,
    changeType: SpatialZoneChangeContext['changeType'],
    shapeContext?: Pick<SpatialZoneChangeContext, 'shapeAction' | 'vertexIndex' | 'segmentIndex'>,
  ): SpatialZone | null {
    if (!hasSpatialZoneChangedByType({
      previousZone,
      nextZone,
      changeType,
      policy: edit,
    })) return null;

    onZoneChange?.(buildSpatialZoneChangeContext({
      mode,
      changeType,
      previousZone,
      nextZone,
      policy: edit,
      ...(shapeContext ?? {}),
    }));
    return nextZone;
  }

  function commitZoneMove(
    previousZone: SpatialZone,
    position: { x: number; y: number },
    intent: SpatialEditPointIntent = { kind: 'pointer' },
  ): SpatialZone | null {
    const nextZone = resolveZoneMove(previousZone, position, intent).zone;
    return commitZoneUpdate(previousZone, nextZone, 'move');
  }

  function zoneSnapAnchor(zone: SpatialZone): { x: number; y: number } {
    const position = getSpatialZonePosition(zone);
    const bounds = getSpatialZoneTransformedBounds(zone, edit);
    if (!bounds) return position;
    return {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    };
  }

  function resolveZoneMove(
    previousZone: SpatialZone,
    rawPosition: { x: number; y: number },
    intent: SpatialEditPointIntent = { kind: 'pointer' },
  ): { position: { x: number; y: number }; zone: SpatialZone; resolution: SpatialSnapResolution } {
    const previousPosition = getSpatialZonePosition(previousZone);
    const previousAnchor = zoneSnapAnchor(previousZone);
    const rawAnchor = {
      x: previousAnchor.x + rawPosition.x - previousPosition.x,
      y: previousAnchor.y + rawPosition.y - previousPosition.y,
    };
    const resolution = resolveEditPoint(rawAnchor, undefined, intent);
    const snappedPosition = {
      x: rawPosition.x + resolution.point.x - rawAnchor.x,
      y: rawPosition.y + resolution.point.y - rawAnchor.y,
    };
    const zone = moveSpatialZone(previousZone, snappedPosition, rect, edit);
    return {
      position: getSpatialZonePosition(zone),
      zone,
      resolution,
    };
  }

  function startItemDrag(event: React.PointerEvent<SVGGElement>, item: SpatialItem): void {
    if (!edit.dragItems || !isMovableSpatialItem(item) || !svgRef.current) return;
    event.stopPropagation();
    canvasGuideRawPointRef.current = null;
    setCanvasGuideResolution(null);
    const startPoint = svgPointFromPointer(event, svgRef.current, rect);
    setCurrentDragState({
      kind: 'move',
      itemId: item.id,
      pointerId: event.pointerId,
      previousItem: item,
      startPoint,
      previewPosition: item.position,
      snapResolution: {
        rawPoint: item.position,
        point: item.position,
        snapped: false,
        sources: [],
        guides: [],
      },
      hasMoved: false,
    });
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function startZoneDrag(event: React.PointerEvent<SVGGElement>, zone: SpatialZone): void {
    if (!edit.dragZones || zone.disabled || !svgRef.current) return;
    event.stopPropagation();
    if (policy.zonePressStopsCanvas) {
      suppressNextCanvasClick();
    }
    canvasGuideRawPointRef.current = null;
    setCanvasGuideResolution(null);
    const startPoint = svgPointFromPointer(event, svgRef.current, rect);
    const startAnchor = zoneSnapAnchor(zone);
    setCurrentDragState({
      kind: 'zone-move',
      zoneId: zone.id,
      pointerId: event.pointerId,
      previousZone: zone,
      startPoint,
      startPosition: getSpatialZonePosition(zone),
      snapResolution: {
        rawPoint: startAnchor,
        point: startAnchor,
        snapped: false,
        sources: [],
        guides: [],
      },
      hasMoved: false,
    });
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function startItemResize(
    event: React.PointerEvent<SVGRectElement>,
    item: SpatialItem,
    handle: SpatialResizeHandle,
  ): void {
    if (!edit.resizeItems || item.disabled || !svgRef.current) return;
    if (!getSpatialItemLocalBounds(item)) return;
    event.preventDefault();
    event.stopPropagation();
    canvasGuideRawPointRef.current = null;
    setCanvasGuideResolution(null);
    setCurrentDragState({
      kind: 'resize',
      itemId: item.id,
      pointerId: event.pointerId,
      previousItem: item,
      handle,
      previewItem: item,
      snapResolution: null,
      hasChanged: false,
    });
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function updateItemResize(event: PointerEvent, currentDrag: SpatialResizeState): void {
    if (!svgRef.current) return;
    const point = svgPointFromPointer(event, svgRef.current, rect);
    const resolution = resolveEditPoint(point, currentDrag.itemId, { kind: 'pointer' });
    const localPoint = mapPointToItemLocal(currentDrag.previousItem, resolution.point, edit);
    const nextItem = resizeSpatialItem(currentDrag.previousItem, {
      handle: currentDrag.handle,
      localPoint,
      policy: edit,
      preserveAspectRatio: event.shiftKey,
    });
    setCurrentDragState({
      ...currentDrag,
      previewItem: nextItem,
      snapResolution: resolution,
      hasChanged: hasSpatialItemChangedByType({
        previousItem: currentDrag.previousItem,
        nextItem,
        changeType: 'resize',
        policy: edit,
        rect,
      }),
    });
  }

  function startZoneResize(
    event: React.PointerEvent<SVGRectElement>,
    zone: SpatialZone,
    handle: SpatialResizeHandle,
  ): void {
    if (!edit.resizeZones || zone.disabled || !svgRef.current) return;
    if (!getSpatialZoneMapBounds(zone)) return;
    event.preventDefault();
    event.stopPropagation();
    canvasGuideRawPointRef.current = null;
    setCanvasGuideResolution(null);
    setCurrentDragState({
      kind: 'zone-resize',
      zoneId: zone.id,
      pointerId: event.pointerId,
      previousZone: zone,
      handle,
      previewZone: zone,
      snapResolution: null,
      hasChanged: false,
    });
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function updateZoneResize(event: PointerEvent, currentDrag: SpatialZoneResizeState): void {
    if (!svgRef.current) return;
    const point = svgPointFromPointer(event, svgRef.current, rect);
    const resolution = resolveEditPoint(point, undefined, { kind: 'pointer' });
    const localPoint = mapPointToZoneLocal(currentDrag.previousZone, resolution.point, edit);
    const nextZone = resizeSpatialZone(currentDrag.previousZone, {
      handle: currentDrag.handle,
      localPoint,
      policy: edit,
      preserveAspectRatio: event.shiftKey,
    });
    setCurrentDragState({
      ...currentDrag,
      previewZone: nextZone,
      snapResolution: resolution,
      hasChanged: hasSpatialZoneChangedByType({
        previousZone: currentDrag.previousZone,
        nextZone,
        changeType: 'resize',
        policy: edit,
      }),
    });
  }

  function zoneShapeModeActive(zone: SpatialZone): boolean {
    return mode === 'edit'
      && edit.shapeEditZones
      && !zone.disabled
      && String(zoneShapeEditId ?? '') === String(zone.id)
      && String(activeSelectedZoneId ?? '') === String(zone.id);
  }

  function resolveZoneShapeVertexMove(
    zone: SpatialZone,
    vertexIndex: number,
    worldPoint: { x: number; y: number },
    intent: SpatialEditPointIntent = { kind: 'pointer' },
  ): { zone: SpatialZone; resolution: SpatialSnapResolution } {
    const resolution = resolveEditPoint(worldPoint, undefined, intent);
    return {
      zone: moveSpatialZonePolygonVertex(zone, {
        vertexIndex,
        worldPoint: resolution.point,
        rect,
        policy: edit,
      }),
      resolution,
    };
  }

  function startZoneShapeVertexDrag(
    event: React.PointerEvent<SVGCircleElement>,
    zone: SpatialZone,
    vertexIndex: number,
  ): void {
    if (!zoneShapeModeActive(zone) || !svgRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    if (policy.zonePressStopsCanvas) {
      suppressNextCanvasClick();
    }
    canvasGuideRawPointRef.current = null;
    setCanvasGuideResolution(null);
    setCurrentDragState({
      kind: 'zone-shape',
      zoneId: zone.id,
      pointerId: event.pointerId,
      previousZone: zone,
      vertexIndex,
      previewZone: zone,
      snapResolution: null,
      hasChanged: false,
    });
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function updateZoneShapeVertexDrag(event: PointerEvent, currentDrag: SpatialZoneShapeDragState): void {
    if (!svgRef.current) return;
    const point = svgPointFromPointer(event, svgRef.current, rect);
    const nextMove = resolveZoneShapeVertexMove(
      currentDrag.previousZone,
      currentDrag.vertexIndex,
      point,
      { kind: 'pointer' },
    );
    setCurrentDragState({
      ...currentDrag,
      previewZone: nextMove.zone,
      snapResolution: nextMove.resolution,
      hasChanged: hasSpatialZoneChangedByType({
        previousZone: currentDrag.previousZone,
        nextZone: nextMove.zone,
        changeType: 'shape',
        policy: edit,
      }),
    });
  }

  function insertZoneShapeVertex(
    event: React.MouseEvent<SVGCircleElement> | React.KeyboardEvent<SVGCircleElement>,
    zone: SpatialZone,
    segmentIndex: number,
    worldPoint: { x: number; y: number },
  ): void {
    if (!zoneShapeModeActive(zone)) return;
    event.preventDefault();
    event.stopPropagation();
    if (policy.zonePressStopsCanvas) {
      suppressNextCanvasClick();
    }
    const resolution = resolveEditPoint(worldPoint, undefined, { kind: 'pointer' });
    const nextZone = insertSpatialZonePolygonVertex(zone, {
      segmentIndex,
      worldPoint: resolution.point,
      rect,
      policy: edit,
    });
    const committedZone = commitZoneUpdate(zone, nextZone, 'shape', {
      shapeAction: 'insert-vertex',
      segmentIndex,
    });
    if (committedZone) {
      bridgeDroppedPreviewZone(zone.id, committedZone);
      if (policy.selectZones) {
        _onZoneSelect?.(buildZoneContext(committedZone, mode));
      }
    }
  }

  function angleFromItemCenter(item: SpatialItem, point: { x: number; y: number }): number {
    return Math.atan2(point.y - item.position.y, point.x - item.position.x) * 180 / Math.PI;
  }

  function startItemRotate(event: React.PointerEvent<SVGCircleElement>, item: SpatialItem): void {
    if (!edit.rotateItems || item.disabled || !svgRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    canvasGuideRawPointRef.current = null;
    setCanvasGuideResolution(null);
    const point = svgPointFromPointer(event, svgRef.current, rect);
    setCurrentDragState({
      kind: 'rotate',
      itemId: item.id,
      pointerId: event.pointerId,
      previousItem: item,
      startAngle: angleFromItemCenter(item, point),
      startRotation: item.rotation ?? 0,
      previewItem: item,
      hasChanged: false,
    });
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function updateItemRotate(event: PointerEvent, currentDrag: SpatialRotateState): void {
    if (!svgRef.current) return;
    const point = svgPointFromPointer(event, svgRef.current, rect);
    const currentAngle = angleFromItemCenter(currentDrag.previousItem, point);
    const stepPolicy = event.shiftKey
      ? { ...edit, rotationStep: edit.rotationLargeStep }
      : edit;
    const nextItem = rotateSpatialItem(
      currentDrag.previousItem,
      currentDrag.startRotation + currentAngle - currentDrag.startAngle,
      stepPolicy,
    );
    setCurrentDragState({
      ...currentDrag,
      previewItem: nextItem,
      hasChanged: hasSpatialItemChangedByType({
        previousItem: currentDrag.previousItem,
        nextItem,
        changeType: 'rotate',
        policy: edit,
        rect,
      }),
    });
  }

  function updateItemDrag(event: PointerEvent): void {
    const currentDrag = dragStateRef.current;
    if (!currentDrag || currentDrag.pointerId !== event.pointerId || !svgRef.current) return;
    event.preventDefault();
    if (currentDrag.kind === 'resize') {
      updateItemResize(event, currentDrag);
      return;
    }
    if (currentDrag.kind === 'zone-resize') {
      updateZoneResize(event, currentDrag);
      return;
    }
    if (currentDrag.kind === 'rotate') {
      updateItemRotate(event, currentDrag);
      return;
    }
    if (currentDrag.kind === 'zone-shape') {
      updateZoneShapeVertexDrag(event, currentDrag);
      return;
    }
    if (currentDrag.kind === 'zone-move') {
      const point = svgPointFromPointer(event, svgRef.current, rect);
      const nextPosition = {
        x: currentDrag.startPosition.x + point.x - currentDrag.startPoint.x,
        y: currentDrag.startPosition.y + point.y - currentDrag.startPoint.y,
      };
      const nextMove = resolveZoneMove(currentDrag.previousZone, nextPosition, { kind: 'pointer' });
      const previousPosition = getSpatialZonePosition(currentDrag.previousZone);
      setCurrentDragState({
        ...currentDrag,
        previewZone: nextMove.zone,
        snapResolution: nextMove.resolution,
        hasMoved: currentDrag.hasMoved || !samePoint(nextMove.position, previousPosition),
      });
      return;
    }
    const point = svgPointFromPointer(event, svgRef.current, rect);
    const rawNextPosition = {
      x: currentDrag.previousItem.position.x + point.x - currentDrag.startPoint.x,
      y: currentDrag.previousItem.position.y + point.y - currentDrag.startPoint.y,
    };
    const nextResolution = resolveEditPoint(rawNextPosition, currentDrag.itemId, { kind: 'pointer' });
    const previousPosition = normalizeEditPosition(currentDrag.previousItem.position, rect, edit);
    setCurrentDragState({
      ...currentDrag,
      previewPosition: nextResolution.point,
      snapResolution: nextResolution,
      hasMoved: currentDrag.hasMoved || !samePoint(nextResolution.point, previousPosition),
    });
  }

  function endItemDrag(event: PointerEvent): void {
    const currentDrag = dragStateRef.current;
    if (!currentDrag || currentDrag.pointerId !== event.pointerId) return;
    event.preventDefault();
    if (currentDrag.kind === 'resize') {
      if (currentDrag.hasChanged) {
        suppressClickItemRef.current = currentDrag.itemId;
        suppressNextCanvasClick();
        const nextItem = commitItemUpdate(currentDrag.previousItem, currentDrag.previewItem, 'resize');
        if (nextItem) {
          bridgeDroppedPreviewItem(currentDrag.itemId, nextItem);
        }
      }
      setCurrentDragState(null);
      return;
    }

    if (currentDrag.kind === 'zone-resize') {
      if (currentDrag.hasChanged) {
        suppressNextCanvasClick();
        const nextZone = commitZoneUpdate(currentDrag.previousZone, currentDrag.previewZone, 'resize');
        if (nextZone) {
          bridgeDroppedPreviewZone(currentDrag.zoneId, nextZone);
          if (policy.selectZones) {
            _onZoneSelect?.(buildZoneContext(nextZone, mode));
          }
        }
      }
      setCurrentDragState(null);
      return;
    }

    if (currentDrag.kind === 'rotate') {
      if (currentDrag.hasChanged) {
        suppressClickItemRef.current = currentDrag.itemId;
        suppressNextCanvasClick();
        const nextItem = commitItemUpdate(currentDrag.previousItem, currentDrag.previewItem, 'rotate');
        if (nextItem) {
          bridgeDroppedPreviewItem(currentDrag.itemId, nextItem);
        }
      }
      setCurrentDragState(null);
      return;
    }

    if (currentDrag.kind === 'zone-move') {
      if (currentDrag.hasMoved) {
        suppressNextCanvasClick();
        const nextZone = commitZoneMove(
          currentDrag.previousZone,
          getSpatialZonePosition(currentDrag.previewZone ?? currentDrag.previousZone),
        );
        if (nextZone) {
          bridgeDroppedPreviewZone(currentDrag.zoneId, nextZone);
          if (policy.selectZones) {
            _onZoneSelect?.(buildZoneContext(nextZone, mode));
          }
        }
      }
      setCurrentDragState(null);
      return;
    }

    if (currentDrag.kind === 'zone-shape') {
      if (currentDrag.hasChanged) {
        suppressNextCanvasClick();
        const nextZone = commitZoneUpdate(currentDrag.previousZone, currentDrag.previewZone, 'shape', {
          shapeAction: 'move-vertex',
          vertexIndex: currentDrag.vertexIndex,
        });
        if (nextZone) {
          bridgeDroppedPreviewZone(currentDrag.zoneId, nextZone);
          if (policy.selectZones) {
            _onZoneSelect?.(buildZoneContext(nextZone, mode));
          }
        }
      }
      setCurrentDragState(null);
      return;
    }

    if (currentDrag.hasMoved) {
      suppressClickItemRef.current = currentDrag.itemId;
      suppressNextCanvasClick();
      const nextItem = commitItemMove(
        currentDrag.previousItem,
        currentDrag.snapResolution.rawPoint,
        { kind: 'pointer' },
      );
      if (nextItem) {
        bridgeDroppedPreviewItem(currentDrag.itemId, nextItem);
      }
    }
    setCurrentDragState(null);
  }

  function cancelItemDrag(event: PointerEvent): void {
    const currentDrag = dragStateRef.current;
    if (!currentDrag || currentDrag.pointerId !== event.pointerId) return;
    setCurrentDragState(null);
  }

  React.useEffect(() => {
    if (!dragState) return;
    document.addEventListener('pointermove', updateItemDrag);
    document.addEventListener('pointerup', endItemDrag);
    document.addEventListener('pointercancel', cancelItemDrag);
    return () => {
      document.removeEventListener('pointermove', updateItemDrag);
      document.removeEventListener('pointerup', endItemDrag);
      document.removeEventListener('pointercancel', cancelItemDrag);
    };
  }, [dragState !== null, edit, items, rect, mode, zones, onItemChange, onZoneChange, _onZoneSelect, policy.selectZones]);

  React.useEffect(() => {
    const currentDrag = dragStateRef.current;
    if (currentDrag?.kind !== 'zone-shape') return;
    const stillEditingSameZone = String(zoneShapeEditId ?? '') === String(currentDrag.zoneId)
      && String(activeSelectedZoneId ?? '') === String(currentDrag.zoneId)
      && zones.some((zone) => String(zone.id) === String(currentDrag.zoneId));
    if (!stillEditingSameZone) {
      setCurrentDragState(null);
    }
  }, [zoneShapeEditId, activeSelectedZoneId, zones]);

  React.useEffect(() => {
    return () => {
      for (const frameId of droppedPreviewFrameIdsRef.current.values()) {
        window.cancelAnimationFrame(frameId);
      }
      droppedPreviewFrameIdsRef.current.clear();
      for (const frameId of droppedZonePreviewFrameIdsRef.current.values()) {
        window.cancelAnimationFrame(frameId);
      }
      droppedZonePreviewFrameIdsRef.current.clear();
    };
  }, []);

  React.useEffect(() => {
    if (!canvasGuideVisible) {
      canvasGuideRawPointRef.current = null;
      setCanvasGuideResolution(null);
      return;
    }

    setCanvasGuideResolution((current) => {
      const rawPoint = canvasGuideRawPointRef.current;
      if (!current || !rawPoint) return current;
      const next = resolveEditPoint(rawPoint, undefined, { kind: 'canvas' });
      return sameSnapResolution(current, next) ? current : next;
    });
  }, [canvasGuideVisible, edit, items, rect]);

  function keyboardDelta(event: React.KeyboardEvent<SVGGElement>): { x: number; y: number } | null {
    if (event.ctrlKey) return null;
    const step = event.shiftKey ? edit.keyboardLargeStep : edit.keyboardStep;
    if (event.key === 'ArrowRight') return { x: step, y: 0 };
    if (event.key === 'ArrowLeft') return { x: -step, y: 0 };
    if (event.key === 'ArrowDown') return { x: 0, y: step };
    if (event.key === 'ArrowUp') return { x: 0, y: -step };
    return null;
  }

  function moveItemByKeyboard(event: React.KeyboardEvent<SVGGElement>, item: SpatialItem): boolean {
    if (!edit.keyboardMoveItems || !isMovableSpatialItem(item)) return false;
    const delta = keyboardDelta(event);
    if (!delta) return false;
    const nextPosition = {
      x: item.position.x + delta.x,
      y: item.position.y + delta.y,
    };
    event.preventDefault();
    event.stopPropagation();
    const nextItem = commitItemMove(item, nextPosition, {
      kind: 'keyboard',
      origin: item.position,
      delta,
    });
    if (!nextItem) return true;
    if (policy.selectItems) {
      _onItemSelect?.(buildItemContext(nextItem, zones, mode));
    }
    return true;
  }

  function moveZoneByKeyboard(event: React.KeyboardEvent<SVGGElement>, zone: SpatialZone): boolean {
    if (!edit.keyboardMoveZones || zone.disabled) return false;
    const delta = keyboardDelta(event);
    if (!delta) return false;
    const startPosition = getSpatialZonePosition(zone);
    const nextPosition = {
      x: startPosition.x + delta.x,
      y: startPosition.y + delta.y,
    };
    event.preventDefault();
    event.stopPropagation();
    const nextZone = commitZoneMove(zone, nextPosition, {
      kind: 'keyboard',
      origin: zoneSnapAnchor(zone),
      delta,
    });
    if (!nextZone) return true;
    if (policy.selectZones) {
      _onZoneSelect?.(buildZoneContext(nextZone, mode));
    }
    return true;
  }

  function resizeZoneByKeyboard(event: React.KeyboardEvent<SVGGElement>, zone: SpatialZone): boolean {
    if (!edit.keyboardResizeZones || !event.ctrlKey || zone.disabled) return false;
    if (!getSpatialZoneMapBounds(zone)) return false;
    const step = event.shiftKey ? edit.resizeLargeStep : edit.resizeStep;
    let nextTransform = normalizeSpatialTransform(zone.transform, edit);

    if (event.key === 'ArrowRight') nextTransform = { ...nextTransform, scaleX: nextTransform.scaleX + step };
    else if (event.key === 'ArrowLeft') nextTransform = { ...nextTransform, scaleX: nextTransform.scaleX - step };
    else if (event.key === 'ArrowDown') nextTransform = { ...nextTransform, scaleY: nextTransform.scaleY + step };
    else if (event.key === 'ArrowUp') nextTransform = { ...nextTransform, scaleY: nextTransform.scaleY - step };
    else return false;

    event.preventDefault();
    event.stopPropagation();
    const nextZone = {
      ...zone,
      transform: normalizeSpatialTransform(nextTransform, edit),
    };
    const committedZone = commitZoneUpdate(zone, nextZone, 'resize');
    if (committedZone && policy.selectZones) {
      _onZoneSelect?.(buildZoneContext(committedZone, mode));
    }
    return true;
  }

  function resizeItemByKeyboard(event: React.KeyboardEvent<SVGGElement>, item: SpatialItem): boolean {
    if (!edit.keyboardResizeItems || !event.ctrlKey || item.disabled) return false;
    const step = event.shiftKey ? edit.resizeLargeStep : edit.resizeStep;
    let nextTransform = normalizeSpatialTransform(item.transform, edit);

    if (event.key === 'ArrowRight') nextTransform = { ...nextTransform, scaleX: nextTransform.scaleX + step };
    else if (event.key === 'ArrowLeft') nextTransform = { ...nextTransform, scaleX: nextTransform.scaleX - step };
    else if (event.key === 'ArrowDown') nextTransform = { ...nextTransform, scaleY: nextTransform.scaleY + step };
    else if (event.key === 'ArrowUp') nextTransform = { ...nextTransform, scaleY: nextTransform.scaleY - step };
    else return false;

    event.preventDefault();
    event.stopPropagation();
    const nextItem = {
      ...item,
      transform: normalizeSpatialTransform(nextTransform, edit),
    };
    const committedItem = commitItemUpdate(item, nextItem, 'resize');
    if (committedItem && policy.selectItems) {
      _onItemSelect?.(buildItemContext(committedItem, zones, mode));
    }
    return true;
  }

  function rotateItemByKeyboard(event: React.KeyboardEvent<SVGGElement>, item: SpatialItem): boolean {
    if (!edit.keyboardRotateItems || item.disabled) return false;
    if (!['[', ']', '{', '}'].includes(event.key)) return false;
    event.preventDefault();
    event.stopPropagation();
    const step = event.shiftKey ? edit.rotationLargeStep : edit.rotationStep;
    const direction = event.key === ']' || event.key === '}' ? 1 : -1;
    const nextItem = rotateSpatialItem(item, (item.rotation ?? 0) + direction * step, { ...edit, rotationStep: 0 });
    const committedItem = commitItemUpdate(item, nextItem, 'rotate');
    if (committedItem && policy.selectItems) {
      _onItemSelect?.(buildItemContext(committedItem, zones, mode));
    }
    return true;
  }

  function itemKeyboardShortcuts(): string | undefined {
    const shortcuts: string[] = [];
    if (edit.keyboardMoveItems) shortcuts.push('ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight');
    if (edit.keyboardResizeItems) {
      shortcuts.push('Ctrl+ArrowUp', 'Ctrl+ArrowDown', 'Ctrl+ArrowLeft', 'Ctrl+ArrowRight');
    }
    if (edit.keyboardRotateItems) shortcuts.push('[', ']');
    return shortcuts.length > 0 ? shortcuts.join(' ') : undefined;
  }

  function zoneKeyboardShortcuts(): string | undefined {
    const shortcuts: string[] = [];
    if (edit.keyboardMoveZones) shortcuts.push('ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight');
    if (edit.keyboardResizeZones) {
      shortcuts.push('Ctrl+ArrowUp', 'Ctrl+ArrowDown', 'Ctrl+ArrowLeft', 'Ctrl+ArrowRight');
    }
    return shortcuts.length > 0 ? shortcuts.join(' ') : undefined;
  }

  function zoneShapeKeyboardShortcuts(): string | undefined {
    if (!edit.keyboardShapeEditZones) return undefined;
    return 'ArrowUp ArrowDown ArrowLeft ArrowRight Delete Backspace Escape';
  }

  function zoneShapeInsertKeyboardShortcuts(): string | undefined {
    if (!edit.keyboardShapeEditZones) return undefined;
    return 'Enter Space';
  }

  function zoneShapeKeyboardDelta(event: React.KeyboardEvent<SVGCircleElement>): { x: number; y: number } | null {
    if (event.ctrlKey) return null;
    const step = event.shiftKey ? edit.keyboardLargeStep : edit.keyboardStep;
    if (event.key === 'ArrowRight') return { x: step, y: 0 };
    if (event.key === 'ArrowLeft') return { x: -step, y: 0 };
    if (event.key === 'ArrowDown') return { x: 0, y: step };
    if (event.key === 'ArrowUp') return { x: 0, y: -step };
    return null;
  }

  function commitZoneShapeKeyboardChange(
    previousZone: SpatialZone,
    nextZone: SpatialZone,
    shapeContext: Pick<SpatialZoneChangeContext, 'shapeAction' | 'vertexIndex' | 'segmentIndex'>,
  ): boolean {
    const committedZone = commitZoneUpdate(previousZone, nextZone, 'shape', shapeContext);
    if (committedZone && policy.selectZones) {
      _onZoneSelect?.(buildZoneContext(committedZone, mode));
    }
    return committedZone !== null;
  }

  function handleZoneShapeVertexKeyDown(
    event: React.KeyboardEvent<SVGCircleElement>,
    zone: SpatialZone,
    vertexIndex: number,
  ): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setCurrentDragState(null);
      onZoneShapeEditExit?.();
      return;
    }

    if (!edit.keyboardShapeEditZones || zone.disabled) return;

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      event.stopPropagation();
      const nextZone = deleteSpatialZonePolygonVertex(zone, { vertexIndex });
      commitZoneShapeKeyboardChange(zone, nextZone, {
        shapeAction: 'delete-vertex',
        vertexIndex,
      });
      return;
    }

    const delta = zoneShapeKeyboardDelta(event);
    if (!delta) return;
    const handles = getSpatialZonePolygonHandles(zone, edit);
    const vertex = handles?.vertices.find((candidate) => candidate.index === vertexIndex);
    if (!vertex) return;
    event.preventDefault();
    event.stopPropagation();
    const rawPoint = {
      x: vertex.point.x + delta.x,
      y: vertex.point.y + delta.y,
    };
    const nextMove = resolveZoneShapeVertexMove(zone, vertexIndex, rawPoint, {
      kind: 'keyboard',
      origin: vertex.point,
      delta,
    });
    commitZoneShapeKeyboardChange(zone, nextMove.zone, {
      shapeAction: 'move-vertex',
      vertexIndex,
    });
  }

  function activateZone(
    event: React.MouseEvent<SVGGElement> | React.KeyboardEvent<SVGGElement>,
    zone: SpatialZone,
  ): void {
    if (policy.zonePressStopsCanvas) {
      event.stopPropagation();
    }
    if (zone.disabled) return;
    const context = buildZoneContext(zone, mode);
    if (policy.selectZones) {
      _onZoneSelect?.(context);
    }
    if (policy.activateZones) {
      onZonePress?.(context);
    }
  }

  function activateItem(
    event: React.MouseEvent<SVGGElement> | React.KeyboardEvent<SVGGElement>,
    item: SpatialItem,
  ): void {
    event.stopPropagation();
    if (suppressClickItemRef.current === item.id) {
      suppressClickItemRef.current = null;
      suppressCanvasClickRef.current = false;
      return;
    }
    if (item.disabled) return;
    if (!policy.selectItems && !policy.activateItems) return;
    const context = buildItemContext(item, zones, mode);
    if (policy.selectItems) {
      _onItemSelect?.(context);
    }
    if (policy.activateItems) {
      onItemPress?.(context);
    }
  }

  function handleCanvasClick(event: React.MouseEvent<SVGSVGElement>): void {
    if (suppressCanvasClickRef.current) {
      suppressCanvasClickRef.current = false;
      return;
    }
    if (!svgRef.current) return;
    const rawPoint = svgPointFromPointer(event, svgRef.current, rect);
    const resolution = resolveEditPoint(rawPoint, undefined, { kind: 'canvas' });
    if (canvasGuideVisible) {
      canvasGuideRawPointRef.current = rawPoint;
      setCanvasGuideResolution(resolution);
    }
    const zone = zoneFromCanvasEvent(event, zones);
    onCanvasPress?.({
      kind: 'canvas',
      mode,
      point: resolution.point,
      rawPoint,
      ...(edit.snap.enabled ? {
        snap: {
          snapped: resolution.snapped,
          sources: resolution.sources,
        },
      } : {}),
      viewBox: rect,
      zoneId: zone?.id,
      zone,
    });
  }

  function handleCanvasPointerMove(event: React.PointerEvent<SVGSVGElement>): void {
    if (!canvasGuideVisible || dragStateRef.current || !svgRef.current) return;
    const rawPoint = svgPointFromPointer(event, svgRef.current, rect);
    canvasGuideRawPointRef.current = rawPoint;
    setCanvasGuideResolution(resolveEditPoint(rawPoint, undefined, { kind: 'canvas' }));
  }

  function handleCanvasPointerLeave(): void {
    if (canvasGuideVisible) {
      canvasGuideRawPointRef.current = null;
      setCanvasGuideResolution(null);
    }
  }

  function renderCanvasGuide(): React.ReactElement | null {
    if (!canvasGuideVisible || !canvasGuideResolution) return null;
    const guidePoint = canvasGuideResolution.point;
    const stroke = canvasGuide?.stroke ?? '#4f46e5';
    const strokeWidth = canvasGuide?.strokeWidth ?? 1.5;
    const strokeDasharray = canvasGuide?.strokeDasharray ?? '6 6';
    const opacity = canvasGuide?.opacity ?? 0.72;
    const showPoint = canvasGuide?.showPoint !== false;

    return React.createElement(
      'g',
      {
        key: 'canvas-guide',
        'data-testid': 'spatial-canvas-guide',
        'aria-hidden': true,
        pointerEvents: 'none',
        opacity,
      },
      [
        React.createElement('line', {
          key: 'x',
          'data-testid': 'spatial-canvas-guide-x',
          x1: guidePoint.x,
          x2: guidePoint.x,
          y1: rect.y,
          y2: rect.y + rect.height,
          stroke,
          strokeWidth,
          strokeDasharray,
          strokeLinecap: 'round',
          vectorEffect: 'non-scaling-stroke',
        }),
        React.createElement('line', {
          key: 'y',
          'data-testid': 'spatial-canvas-guide-y',
          x1: rect.x,
          x2: rect.x + rect.width,
          y1: guidePoint.y,
          y2: guidePoint.y,
          stroke,
          strokeWidth,
          strokeDasharray,
          strokeLinecap: 'round',
          vectorEffect: 'non-scaling-stroke',
        }),
        showPoint ? React.createElement('circle', {
          key: 'point',
          'data-testid': 'spatial-canvas-guide-point',
          cx: guidePoint.x,
          cy: guidePoint.y,
          r: Math.max(3, strokeWidth * 2),
          fill: stroke,
          stroke: '#ffffff',
          strokeWidth: 1,
          vectorEffect: 'non-scaling-stroke',
        }) : null,
      ],
    );
  }

  function renderEditGuides(resolution: SpatialSnapResolution | null): React.ReactElement | null {
    if (!edit.guides.enabled || !resolution) return null;
    const stroke = '#2563eb';
    const strokeWidth = 1.5;
    const children: React.ReactNode[] = [];

    if (edit.guides.showSnapLines) {
      for (const guide of resolution.guides) {
        children.push(renderEditGuideLine(guide, stroke, strokeWidth));
      }
    }

    if (edit.guides.showCoordinates) {
      children.push(React.createElement('text', {
        key: 'coordinate',
        'data-testid': 'spatial-edit-coordinate',
        x: resolution.point.x + 10,
        y: resolution.point.y - 10,
        fill: stroke,
        stroke: '#ffffff',
        strokeWidth: 3,
        paintOrder: 'stroke',
        style: {
          fontSize: 12,
          fontWeight: 700,
          userSelect: 'none',
        },
      }, `${resolution.point.x}, ${resolution.point.y}`));
    }

    if (children.length === 0) return null;

    return React.createElement('g', {
      key: 'edit-guides',
      'data-testid': 'spatial-edit-guides',
      'aria-hidden': true,
      pointerEvents: 'none',
    }, children);
  }

  function renderEditGuideLine(
    guide: SpatialEditGuide,
    stroke: string,
    strokeWidth: number,
  ): React.ReactElement {
    if (guide.axis === 'x') {
      return React.createElement('line', {
        key: `x-${guide.source}-${guide.value}`,
        'data-testid': `spatial-edit-guide-x-${guide.source}-${guide.value}`,
        x1: guide.value,
        x2: guide.value,
        y1: rect.y,
        y2: rect.y + rect.height,
        stroke,
        strokeWidth,
        strokeDasharray: '5 5',
        strokeLinecap: 'round',
        vectorEffect: 'non-scaling-stroke',
      });
    }

    return React.createElement('line', {
      key: `y-${guide.source}-${guide.value}`,
      'data-testid': `spatial-edit-guide-y-${guide.source}-${guide.value}`,
      x1: rect.x,
      x2: rect.x + rect.width,
      y1: guide.value,
      y2: guide.value,
      stroke,
      strokeWidth,
      strokeDasharray: '5 5',
      strokeLinecap: 'round',
      vectorEffect: 'non-scaling-stroke',
    });
  }

  function resolveRenderedItem(item: SpatialItem): SpatialItem {
    const droppedPreviewItem = droppedPreviewItems.get(item.id);
    if (dragState && 'itemId' in dragState && dragState.itemId === item.id) {
      if (dragState.previewItem) return dragState.previewItem;
      if (dragState.kind === 'move') return moveSpatialItem(dragState.previousItem, dragState.previewPosition);
    }
    return droppedPreviewItem ?? item;
  }

  function resolveRenderedZone(zone: SpatialZone): SpatialZone {
    const droppedPreviewZone = droppedPreviewZones.get(zone.id);
    if (
      (dragState?.kind === 'zone-move' || dragState?.kind === 'zone-resize' || dragState?.kind === 'zone-shape')
      && dragState.zoneId === zone.id
      && dragState.previewZone
    ) {
      return dragState.previewZone;
    }
    return droppedPreviewZone ?? zone;
  }

  function zoneTransform(zone: SpatialZone): string | undefined {
    const position = getSpatialZonePosition(zone);
    const transform = normalizeSpatialTransform(zone.transform, edit);
    const parts: string[] = [];
    if (position.x !== 0 || position.y !== 0) parts.push(`translate(${position.x} ${position.y})`);
    if ((zone.rotation ?? 0) !== 0) parts.push(`rotate(${zone.rotation ?? 0})`);
    if (transform.scaleX !== 1 || transform.scaleY !== 1) parts.push(`scale(${transform.scaleX} ${transform.scaleY})`);
    return parts.length > 0 ? parts.join(' ') : undefined;
  }

  function labelTransform(item: SpatialItem, transform: Required<SpatialItemTransform>): string {
    const rotation = `rotate(${-(item.rotation ?? 0)})`;
    if (transform.scaleX === 1 && transform.scaleY === 1) return rotation;
    return `scale(${1 / transform.scaleX} ${1 / transform.scaleY}) ${rotation}`;
  }

  function renderItem(item: SpatialItem): React.ReactElement {
    const renderedItem = resolveRenderedItem(item);
    const disabled = renderedItem.disabled === true;
    const movable = edit.dragItems
      || edit.keyboardMoveItems
      || edit.resizeItems
      || edit.rotateItems
      || edit.keyboardResizeItems
      || edit.keyboardRotateItems;
    const interactive = !disabled && (policy.selectItems || policy.activateItems || movable);
    const statusStyle = renderedItem.status ? statusStyles[renderedItem.status] : undefined;
    const visualStyle = { ...DEFAULT_STATUS_STYLE, ...(statusStyle ?? {}) };
    const selected = String(activeSelectedItemId ?? '') === String(item.id);
    const itemTransform = normalizeSpatialTransform(renderedItem.transform, edit);
    const transform = `translate(${renderedItem.position.x} ${renderedItem.position.y}) rotate(${renderedItem.rotation ?? 0}) scale(${itemTransform.scaleX} ${itemTransform.scaleY})`;

    return React.createElement(
      'g',
      {
        key: String(item.id),
        role: interactive ? 'button' : undefined,
        tabIndex: interactive && policy.keyboardNavigation ? 0 : undefined,
        'aria-label': interactive ? itemAriaLabel(renderedItem) : undefined,
        'aria-disabled': disabled || undefined,
        'aria-keyshortcuts': interactive && policy.keyboardNavigation ? itemKeyboardShortcuts() : undefined,
        'data-testid': `spatial-item-${item.id}`,
        'data-selected': selected ? 'true' : 'false',
        transform,
        style: {
          cursor: interactive ? 'pointer' : 'default',
          outline: 'none',
        },
        onPointerDown: edit.dragItems && isMovableSpatialItem(renderedItem)
          ? (event: React.PointerEvent<SVGGElement>) => startItemDrag(event, renderedItem)
          : undefined,
        onClick: interactive ? (event: React.MouseEvent<SVGGElement>) => activateItem(event, renderedItem) : undefined,
        onKeyDown: interactive ? (event: React.KeyboardEvent<SVGGElement>) => {
          if (resizeItemByKeyboard(event, renderedItem)) return;
          if (rotateItemByKeyboard(event, renderedItem)) return;
          if (moveItemByKeyboard(event, renderedItem)) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            activateItem(event, renderedItem);
          }
        } : undefined,
      },
      [
        renderItemShape(renderedItem.shape, 'shape', visualStyle, { 'data-testid': `spatial-shape-${item.id}` }),
        selected ? renderItemShape(renderedItem.shape, 'selected', SELECTED_STYLE, {
          pointerEvents: 'none',
          'data-testid': `spatial-selection-${item.id}`,
        }) : null,
        renderedItem.label ? React.createElement(
          'text',
          {
            key: 'label',
            'data-testid': `spatial-label-${item.id}`,
            transform: labelTransform(renderedItem, itemTransform),
            textAnchor: 'middle',
            dominantBaseline: 'middle',
            fill: visualStyle.text ?? DEFAULT_STATUS_STYLE.text,
            style: {
              fontWeight: 700,
              fontSize: 18,
              pointerEvents: 'none',
              userSelect: 'none',
            },
          },
          renderedItem.label,
        ) : null,
      ],
    );
  }

  function renderEditHandles(item: SpatialItem, selected: boolean): React.ReactElement | null {
    if (!selected || mode !== 'edit' || !edit.handles.visible || item.disabled) return null;
    const points = getSpatialItemWorldHandlePoints(item, edit);
    const children: React.ReactNode[] = [];
    const handleSize = 7;

    if (points && edit.resizeItems && edit.handles.resize) {
      for (const handle of ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as SpatialResizeHandle[]) {
        children.push(React.createElement('rect', {
          key: handle,
          'data-testid': `spatial-edit-handle-${item.id}-${handle}`,
          x: points[handle].x - handleSize / 2,
          y: points[handle].y - handleSize / 2,
          width: handleSize,
          height: handleSize,
          rx: 2,
          ry: 2,
          fill: '#ffffff',
          stroke: '#2563eb',
          strokeWidth: 1.5,
          vectorEffect: 'non-scaling-stroke',
          pointerEvents: 'all',
          onPointerDown: (event: React.PointerEvent<SVGRectElement>) => startItemResize(event, item, handle),
          'aria-hidden': true,
        }));
      }
    }

    if (edit.rotateItems && edit.handles.rotate) {
      const rotatePoint = points?.rotate ?? { x: item.position.x, y: item.position.y - 48 };
      children.push(React.createElement('circle', {
        key: 'rotate',
        'data-testid': `spatial-edit-handle-${item.id}-rotate`,
        cx: rotatePoint.x,
        cy: rotatePoint.y,
        r: 6,
        fill: '#ffffff',
        stroke: '#2563eb',
        strokeWidth: 1.5,
        vectorEffect: 'non-scaling-stroke',
        pointerEvents: 'all',
        onPointerDown: (event: React.PointerEvent<SVGCircleElement>) => startItemRotate(event, item),
        'aria-hidden': true,
      }));
    }

    if (children.length === 0) return null;
    return React.createElement('g', {
      key: `handles-${item.id}`,
      'data-testid': `spatial-edit-handles-${item.id}`,
      pointerEvents: 'none',
    }, children);
  }

  function renderZoneShapeEditHandles(zone: SpatialZone, selected: boolean): React.ReactElement | null {
    if (!selected || !zoneShapeModeActive(zone) || !edit.handles.visible) return null;
    const handles = getSpatialZonePolygonHandles(zone, edit);
    if (!handles) return null;

    const children: React.ReactNode[] = [];
    const keyboardActive = policy.keyboardNavigation && edit.keyboardShapeEditZones;
    const zoneLabel = zoneAriaLabel(zone);
    const vertexCount = handles.vertices.length;
    for (const segment of handles.segments) {
      const nextVertexNumber = segment.index + 2 > vertexCount ? 1 : segment.index + 2;
      const insertLabel = `Insert vertex between points ${segment.index + 1} and ${nextVertexNumber} of ${zoneLabel}`;
      children.push(React.createElement('g', {
        key: `segment-${segment.index}`,
        'data-testid': `spatial-zone-segment-control-${zone.id}-${segment.index}`,
      }, [
        React.createElement('circle', {
          key: 'handle',
          'data-testid': `spatial-zone-segment-handle-${zone.id}-${segment.index}`,
          'data-action': 'insert-vertex',
          cx: segment.point.x,
          cy: segment.point.y,
          r: 4.5,
          fill: '#ffffff',
          stroke: '#7c3aed',
          strokeWidth: 1.5,
          strokeDasharray: '2 2',
          vectorEffect: 'non-scaling-stroke',
          pointerEvents: 'all',
          role: keyboardActive ? 'button' : undefined,
          tabIndex: keyboardActive ? 0 : undefined,
          'aria-label': keyboardActive ? insertLabel : undefined,
          'aria-keyshortcuts': keyboardActive ? zoneShapeInsertKeyboardShortcuts() : undefined,
          'aria-hidden': keyboardActive ? undefined : true,
          style: { cursor: 'copy' },
          onPointerDown: (event: React.PointerEvent<SVGCircleElement>) => {
            event.preventDefault();
            event.stopPropagation();
          },
          onClick: (event: React.MouseEvent<SVGCircleElement>) => insertZoneShapeVertex(
            event,
            zone,
            segment.index,
            segment.point,
          ),
          onKeyDown: keyboardActive
            ? (event: React.KeyboardEvent<SVGCircleElement>) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              insertZoneShapeVertex(event, zone, segment.index, segment.point);
            }
            : undefined,
        }, React.createElement('title', { key: 'title' }, insertLabel)),
        React.createElement('line', {
          key: 'plus-x',
          'data-testid': `spatial-zone-segment-handle-plus-${zone.id}-${segment.index}-x`,
          x1: segment.point.x - 3,
          y1: segment.point.y,
          x2: segment.point.x + 3,
          y2: segment.point.y,
          stroke: '#7c3aed',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          vectorEffect: 'non-scaling-stroke',
          pointerEvents: 'none',
          'aria-hidden': true,
        }),
        React.createElement('line', {
          key: 'plus-y',
          'data-testid': `spatial-zone-segment-handle-plus-${zone.id}-${segment.index}-y`,
          x1: segment.point.x,
          y1: segment.point.y - 3,
          x2: segment.point.x,
          y2: segment.point.y + 3,
          stroke: '#7c3aed',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          vectorEffect: 'non-scaling-stroke',
          pointerEvents: 'none',
          'aria-hidden': true,
        }),
      ]));
    }

    for (const vertex of handles.vertices) {
      const vertexLabel = `Move vertex ${vertex.index + 1} of ${zoneLabel}`;
      children.push(React.createElement('circle', {
        key: `vertex-${vertex.index}`,
        'data-testid': `spatial-zone-vertex-handle-${zone.id}-${vertex.index}`,
        'data-action': 'move-vertex',
        cx: vertex.point.x,
        cy: vertex.point.y,
        r: 6,
        fill: '#ffffff',
        stroke: '#2563eb',
        strokeWidth: 1.8,
        vectorEffect: 'non-scaling-stroke',
        pointerEvents: 'all',
        role: keyboardActive ? 'button' : undefined,
        tabIndex: keyboardActive ? 0 : undefined,
        'aria-label': keyboardActive ? vertexLabel : undefined,
        'aria-keyshortcuts': keyboardActive ? zoneShapeKeyboardShortcuts() : undefined,
        'aria-hidden': keyboardActive ? undefined : true,
        style: { cursor: 'grab' },
        onPointerDown: (event: React.PointerEvent<SVGCircleElement>) => startZoneShapeVertexDrag(
          event,
          zone,
          vertex.index,
        ),
        onKeyDown: keyboardActive
          ? (event: React.KeyboardEvent<SVGCircleElement>) => handleZoneShapeVertexKeyDown(event, zone, vertex.index)
          : undefined,
      }, React.createElement('title', { key: 'title' }, vertexLabel)));
    }

    if (children.length === 0) return null;
    return React.createElement('g', {
      key: `zone-shape-handles-${zone.id}`,
      'data-testid': `spatial-zone-shape-handles-${zone.id}`,
      pointerEvents: 'none',
    }, children);
  }

  function renderZoneEditHandles(zone: SpatialZone, selected: boolean): React.ReactElement | null {
    if (!selected || zoneShapeModeActive(zone) || mode !== 'edit' || !edit.handles.visible || !edit.resizeZones || !edit.handles.resize || zone.disabled) return null;
    const points = getSpatialZoneWorldHandlePoints(zone, edit);
    if (!points) return null;
    const handleSize = 7;
    const children: React.ReactNode[] = [];

    for (const handle of ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as SpatialResizeHandle[]) {
      children.push(React.createElement('rect', {
        key: handle,
        'data-testid': `spatial-zone-edit-handle-${zone.id}-${handle}`,
        x: points[handle].x - handleSize / 2,
        y: points[handle].y - handleSize / 2,
        width: handleSize,
        height: handleSize,
        rx: 2,
        ry: 2,
        fill: '#ffffff',
        stroke: '#2563eb',
        strokeWidth: 1.5,
        vectorEffect: 'non-scaling-stroke',
        pointerEvents: 'all',
        onPointerDown: (event: React.PointerEvent<SVGRectElement>) => startZoneResize(event, zone, handle),
        'aria-hidden': true,
      }));
    }

    return React.createElement('g', {
      key: `zone-handles-${zone.id}`,
      'data-testid': `spatial-zone-edit-handles-${zone.id}`,
      pointerEvents: 'none',
    }, children);
  }

  function renderLayer(layer: string): React.ReactNode[] {
    const nodes: React.ReactNode[] = [];
    for (const zone of zonesByLayer.get(layer) ?? []) {
      const renderedZone = resolveRenderedZone(zone);
      const selected = String(activeSelectedZoneId ?? '') === String(renderedZone.id);
      const interactive = !renderedZone.disabled && (
        policy.selectZones
        || policy.activateZones
        || edit.dragZones
        || edit.keyboardMoveZones
        || edit.resizeZones
        || edit.keyboardResizeZones
      );
      nodes.push(React.createElement('g', {
        key: `zone-${renderedZone.id}`,
        'data-testid': `spatial-zone-${renderedZone.id}`,
        'data-spatial-zone-id': String(renderedZone.id),
        'data-selected': selected ? 'true' : 'false',
        transform: zoneTransform(renderedZone),
        role: interactive ? 'button' : undefined,
        tabIndex: interactive && policy.keyboardNavigation ? 0 : undefined,
        'aria-label': interactive ? zoneAriaLabel(renderedZone) : undefined,
        'aria-keyshortcuts': interactive && policy.keyboardNavigation ? zoneKeyboardShortcuts() : undefined,
        style: interactive ? { cursor: renderedZone.disabled ? 'not-allowed' : 'pointer', outline: 'none' } : undefined,
        onPointerDown: edit.dragZones && !renderedZone.disabled
          ? (event: React.PointerEvent<SVGGElement>) => startZoneDrag(event, renderedZone)
          : undefined,
        onClick: interactive
          ? (event: React.MouseEvent<SVGGElement>) => activateZone(event, renderedZone)
          : undefined,
        onKeyDown: interactive
          ? (event: React.KeyboardEvent<SVGGElement>) => {
            if (resizeZoneByKeyboard(event, renderedZone)) return;
            if (moveZoneByKeyboard(event, renderedZone)) return;
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              activateZone(event, renderedZone);
            }
          }
          : undefined,
      }, [
        renderZoneShape(renderedZone, 'shape'),
        selected ? renderZoneShape(renderedZone, 'selected', SELECTED_STYLE, {
          pointerEvents: 'none',
          'data-testid': `spatial-zone-selection-${renderedZone.id}`,
        }) : null,
        renderedZone.label ? React.createElement('title', { key: 'title' }, renderedZone.label) : null,
      ]));
      const shapeHandles = renderZoneShapeEditHandles(renderedZone, selected);
      if (shapeHandles) nodes.push(shapeHandles);
      const handles = renderZoneEditHandles(renderedZone, selected);
      if (handles) nodes.push(handles);
    }
    for (const item of itemsByLayer.get(layer) ?? []) {
      nodes.push(renderItem(item));
      const selected = String(activeSelectedItemId ?? '') === String(item.id);
      const handles = renderEditHandles(resolveRenderedItem(item), selected);
      if (handles) nodes.push(handles);
    }
    return nodes;
  }

  const activeEditGuideResolution = dragState?.kind === 'move'
    ? dragState.snapResolution
    : dragState?.kind === 'zone-move'
    ? dragState.snapResolution
    : dragState?.kind === 'resize'
    ? dragState.snapResolution
    : dragState?.kind === 'zone-resize'
    ? dragState.snapResolution
    : dragState?.kind === 'zone-shape'
    ? dragState.snapResolution
    : null;

  return React.createElement(
    'div',
    {
      className,
      style: {
        width: '100%',
        ...style,
      },
    },
    React.createElement(
      'svg',
      {
        ref: svgRef,
        role: 'img',
        'aria-label': ariaLabel,
        viewBox: viewBoxToString(viewBox),
        preserveAspectRatio: 'xMidYMid meet',
        style: {
          width: '100%',
          height: 'auto',
          display: 'block',
          overflow: 'visible',
          cursor: canvasGuideVisible ? 'crosshair' : undefined,
        },
        onClick: policy.clearSelectionOnCanvasPress || onCanvasPress ? handleCanvasClick : undefined,
        onPointerMove: canvasGuideVisible ? handleCanvasPointerMove : undefined,
        onPointerLeave: canvasGuideVisible ? handleCanvasPointerLeave : undefined,
      },
      [
        React.createElement('rect', {
          key: 'canvas-hit-area',
          'data-testid': 'spatial-map-canvas',
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          fill: 'transparent',
        }),
        ...layers.flatMap(renderLayer),
        renderEditGuides(activeEditGuideResolution ?? canvasGuideResolution),
        renderCanvasGuide(),
      ],
    ),
  );
}
