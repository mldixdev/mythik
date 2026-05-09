import React from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import type { TargetAndTransition, Transition } from 'motion/react';
import type { Spec, RenderNode, MythikInstance, ActionBinding, TransactionBinding, EventBinding, StorageAdapter, StorageAdapterConfig, UploadFileState, ExportAdapter, LayerBackground, SpecRuntime } from 'mythik';
import { createMythik, createActionDispatcher, createTransactionEngine, createFormEngine, mountSpecRuntime, RESERVED_PATHS } from 'mythik';
import type { MythikConfig } from 'mythik';
import { registerReactPrimitives, PRIMITIVES, CSS_HOVER_SUPPORTED } from './primitives/index.js';
import { createContextDispatcher } from './runtime/context-dispatcher.js';
import { createRowDispatcher } from './runtime/row-dispatcher.js';
import { ToastContainer } from './primitives/toast-container.js';
import { BackgroundStack } from './background/BackgroundStack.js';
import { useDeviceContext } from './use-device-context.js';
import { needsMotionWrapper, generateHoverCSS, hashId } from './css-hover.js';

/**
 * Gate for LayerBackground root mount (plan 3 Task 20). The legacy
 * BackgroundConfig type was deleted in Task 21 but the defensive "has `style`"
 * rejection stays to catch malformed specs — a caller accidentally passing
 * legacy-shaped data (`{ style: 'solid' }`) gets a clean no-mount instead
 * of a crash when BackgroundStack hits the v2 resolver. Empty objects `{}`
 * and array inputs are also rejected so the wrapper never mounts for
 * semantically-empty backgrounds.
 */
function isLayerBackground(bg: unknown): bg is LayerBackground {
  if (typeof bg !== 'object' || bg === null || Array.isArray(bg)) return false;
  if ('style' in bg) return false;
  return 'color' in bg || 'layers' in bg;
}

/**
 * z-index of the content wrapper in the v2 root-mount. The BackgroundStack
 * sibling sits inside its own stacking context (via `isolation: isolate`) so
 * per-layer zIndex values don't leak out — this constant only needs to stay
 * above any ancestor stacking contexts the consumer might establish.
 */
const CONTENT_Z_INDEX = 1;

/** Convert "Infinity" strings to JS Infinity in motion config (JSON can't represent Infinity) */
function resolveInfinity(obj: unknown): unknown {
  if (obj === 'Infinity') return Infinity;
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(resolveInfinity);
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    result[k] = resolveInfinity(v);
  }
  return result;
}

function isTransactionBinding(binding: unknown): binding is TransactionBinding {
  return (
    typeof binding === 'object' &&
    binding !== null &&
    'transaction' in binding &&
    typeof (binding as TransactionBinding).transaction === 'object'
  );
}

interface MythikRendererProps {
  spec: Spec;
  config?: MythikConfig;
  instance?: MythikInstance;
  autoDeviceContext?: boolean;
  /** Override fetch for auth header injection. Passed from MythikApp when auth is configured. */
  fetcher?: (url: string, options?: RequestInit) => Promise<Response>;
  /** Storage adapter for file uploads. Enables uploadFile/deleteFile actions. */
  storage?: StorageAdapter;
  /** Global storage limits (allowedTypes, maxSize). */
  storageConfig?: StorageAdapterConfig;
  /** Export adapters keyed by format. CSV is always built-in. */
  exportAdapters?: Record<string, ExportAdapter>;
  /** Enable auto-skeleton loading placeholders. Default: true. */
  autoSkeleton?: boolean;
  /**
   * Emit each spec element's id as a `data-mythik-id` attribute on its rendered
   * primitive root. Off by default — turn on for inspector tools, dev overlays,
   * E2E test selectors. The id is the spec key (e.g. `btn-random`); same value
   * the consumer already has in spec.elements, so this is a structural metadata
   * exposure, not a secret.
   */
  emitElementIds?: boolean;
  /** Called when this renderer mounts/unmounts its per-spec runtime. */
  onSpecRuntimeMount?: (runtime: SpecRuntime | null) => void;
}

function ErrorPlaceholder({ elementId, error, exposeErrors }: { elementId: string; error: string; exposeErrors: boolean }) {
  if (!exposeErrors) {
    return React.createElement('div', {
      style: { padding: 4, margin: 2, backgroundColor: '#f3f4f6', borderRadius: 4, minHeight: 20 },
      'aria-hidden': true,
    });
  }
  return React.createElement('div', {
    style: {
      padding: 8, margin: 4, border: '2px dashed #ef4444', borderRadius: 4,
      backgroundColor: '#fef2f2', fontFamily: 'monospace', fontSize: 12, color: '#991b1b',
    },
  },
    React.createElement('div', { style: { fontWeight: 'bold', marginBottom: 4 } }, elementId),
    React.createElement('div', null, error),
  );
}

interface RenderErrorBoundaryProps {
  exposeErrors: boolean;
  resetKey: unknown;
  children: React.ReactNode;
}

interface RenderErrorBoundaryState {
  error: Error | null;
  componentStack: string;
  resetKey: unknown;
}

class RenderErrorBoundary extends React.Component<RenderErrorBoundaryProps, RenderErrorBoundaryState> {
  state: RenderErrorBoundaryState = { error: null, componentStack: '', resetKey: this.props.resetKey };

  static getDerivedStateFromProps(
    props: RenderErrorBoundaryProps,
    state: RenderErrorBoundaryState,
  ): Partial<RenderErrorBoundaryState> | null {
    if (props.resetKey !== state.resetKey) {
      return { error: null, componentStack: '', resetKey: props.resetKey };
    }
    return null;
  }

  static getDerivedStateFromError(error: Error): Partial<RenderErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(_error: Error, info: React.ErrorInfo): void {
    this.setState({ componentStack: info.componentStack ?? '' });
  }

  render(): React.ReactNode {
    if (!this.state.error) return this.props.children;

    if (process.env.NODE_ENV === 'production' || !this.props.exposeErrors) {
      return React.createElement('div', {
        style: { padding: 12, backgroundColor: '#f3f4f6', borderRadius: 4, minHeight: 40 },
        'aria-hidden': true,
      });
    }

    return React.createElement('div', {
      role: 'alert',
      'data-mythik-error-overlay': 'true',
      style: {
        padding: 16,
        margin: 8,
        border: '2px solid #ef4444',
        borderRadius: 6,
        backgroundColor: '#fef2f2',
        color: '#7f1d1d',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        whiteSpace: 'pre-wrap',
      },
    },
      React.createElement('div', { style: { fontWeight: 700, marginBottom: 8 } }, 'Mythik render error'),
      React.createElement('div', null, this.state.error.message),
      this.state.componentStack
        ? React.createElement('pre', { style: { marginTop: 12, fontSize: 12, overflow: 'auto' } }, this.state.componentStack)
        : null,
    );
  }
}

/** Create an icon renderer from the plugin system, or undefined if no icon plugin registered */
function createIconRenderer(svc: MythikInstance): ((name: string, size: number, color: string) => React.ReactNode) | undefined {
  const iconRenderer = svc.plugins.getPrimitives().get('icon');
  if (!iconRenderer) return undefined;
  return (name: string, size: number, color: string) => {
    const iconNode = iconRenderer({ name, size, color }, []);
    const IconComp = (iconNode.props._component as React.ComponentType<Record<string, unknown>>) ?? PRIMITIVES['icon'];
    if (!IconComp) return null;
    return React.createElement(IconComp, { name, size, color });
  };
}

// --- Auto-Skeleton ---

const SKELETON_SHAPES: Record<string, { variant: 'text' | 'circle' | 'rect'; height: number; width?: string }> = {
  text: { variant: 'text', height: 16, width: '90%' },
  image: { variant: 'rect', height: 120 },
  button: { variant: 'rect', height: 36, width: '120px' },
  input: { variant: 'rect', height: 40 },
  textarea: { variant: 'rect', height: 80 },
  select: { variant: 'rect', height: 40 },
  icon: { variant: 'circle', height: 24 },
  'bar-chart': { variant: 'rect', height: 200 },
  'line-chart': { variant: 'rect', height: 200 },
  'pie-chart': { variant: 'rect', height: 200 },
  'area-chart': { variant: 'rect', height: 200 },
  table: { variant: 'rect', height: 200 },
  slider: { variant: 'rect', height: 20 },
  checkbox: { variant: 'rect', height: 20, width: '20px' },
  toggle: { variant: 'rect', height: 24, width: '44px' },
};

const SKELETON_PASSTHROUGH = new Set(['stack', 'grid', 'box', 'scroll', 'list']);

const SKELETON_SKIP = new Set([
  'modal', 'drawer', 'tabs', 'accordion', 'wizard', 'screen',
  'file-upload', 'camera', 'signature',
  'audio-player', 'toast-container', 'screen-outlet', 'kanban-board', 'skeleton',
]);

// Elements rendered as-is during skeleton mode (structural, not data-dependent)
const SKELETON_RENDER_ASIS = new Set(['divider', 'spacer']);

const SHIMMER_CSS = `
@keyframes sv-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.sv-skeleton {
  background: linear-gradient(90deg, #E5E7EB 25%, #F3F4F6 50%, #E5E7EB 75%);
  background-size: 200% 100%;
  animation: sv-shimmer 1.5s ease-in-out infinite;
}
.sv-skeleton-dark {
  background: linear-gradient(90deg, #374151 25%, #4B5563 50%, #374151 75%);
  background-size: 200% 100%;
  animation: sv-shimmer 1.5s ease-in-out infinite;
}`;

/**
 * When `emitElementIds` is on, wrap each rendered primitive in a
 * layout-transparent `<div data-mythik-id>` sentinel. `display: contents`
 * makes the wrapper invisible to flex/grid/block layout — its child
 * behaves as if it were the direct child of the wrapper's parent. This
 * lets us mark elements without touching individual primitive components
 * or breaking layouts.
 */
function withInspectId(
  element: React.ReactNode,
  elementId: string | undefined,
  emitElementIds: boolean | undefined,
  key?: string | number,
): React.ReactNode {
  if (!emitElementIds || !elementId || !element) return element;
  return React.createElement(
    'div',
    {
      key: key ?? elementId,
      'data-mythik-id': elementId,
      style: { display: 'contents' },
    },
    element,
  );
}

/** Recursively render a RenderNode tree to React elements */
function renderNode(
  node: RenderNode,
  svc: MythikInstance,
  dispatchAction: (binding: EventBinding) => void,
  index: number = 0,
  cssCollector?: Map<string, string>,
  fileRegistryRef?: React.MutableRefObject<Map<string, File[]>>,
  skeletonMode?: boolean,
  spec?: Spec,
  emitElementIds?: boolean,
): React.ReactNode {
  // Handle error nodes from render engine
  if (node.type === '_error') {
    const exposeErrors = (svc.security as Record<string, unknown>)?.exposeErrors !== false;
    return React.createElement(ErrorPlaceholder, {
      key: node.key ?? `error-${index}`,
      elementId: node.props.elementId as string,
      error: node.props.error as string,
      exposeErrors,
    });
  }

  const { _component, _bindings, _eventBindings, _hover, _active, _focus, _transition, _motion, _elementId, ...restProps } = node.props;

  // NOTE: the legacy `motionEntrance` identity token → Framer-Motion-props
  // injection used to live here. It was removed in plan 2 (Task 23) when the
  // animation engine was introduced. Consumers now declare entrance animations
  // via `Element.animations.mount` on individual elements; the `<Box>`
  // primitive (and future primitives) consume the field via `useElementAnimations`.
  // Plan 3 adds identity-level cascade for `animations` so the ergonomics match
  // the old token-driven approach — until then, specs wanting global mount
  // animation must set `animations.mount` per element or via template/variant.

  // Auto-skeleton: replace data-dependent elements with skeleton shapes during loading
  if (skeletonMode && spec) {
    const elementId = _elementId as string | undefined;
    const element = elementId ? spec.elements[elementId] : undefined;

    // Respect skeleton: false opt-out
    if (element?.skeleton !== false) {
      // Skip types that shouldn't be skeletonized
      if (SKELETON_SKIP.has(node.type)) {
        return null;
      }

      // Render structural elements as-is (divider, spacer)
      if (SKELETON_RENDER_ASIS.has(node.type)) {
        const Comp = (_component as React.ComponentType<Record<string, unknown>>) ?? PRIMITIVES[node.type];
        if (!Comp) return null;
        return React.createElement(Comp, { ...restProps, key: node.key ?? index });
      }

      // Passthrough: render children but keep layout
      if (SKELETON_PASSTHROUGH.has(node.type)) {
        const Component = (_component as React.ComponentType<Record<string, unknown>>) ?? PRIMITIVES[node.type];
        if (!Component) return null;
        const children = node.children.length > 0
          ? node.children.map((child: RenderNode, i: number) => withInspectId(renderNode(child, svc, dispatchAction, i, cssCollector, fileRegistryRef, skeletonMode, spec, emitElementIds), child.props._elementId as string | undefined, emitElementIds, child.key ?? `${child.props._elementId as string}-${i}`))
          : undefined;
        return React.createElement(Component, { ...restProps, key: node.key ?? index }, children);
      }

      // Check if a manual skeleton sibling exists — if so, skip auto-skeleton for this element
      // (manual skeletons handle their own visibility via visible conditions)
      if (node.type === 'skeleton') {
        const SkeletonComp = PRIMITIVES['skeleton'];
        if (SkeletonComp) {
          return React.createElement(SkeletonComp, { ...restProps, key: node.key ?? index });
        }
      }

      // Shape mapping: replace element with skeleton
      const shape = SKELETON_SHAPES[node.type];
      if (shape) {
        const SkeletonComp = PRIMITIVES['skeleton'];
        if (SkeletonComp) {
          return React.createElement(SkeletonComp, {
            variant: shape.variant,
            height: shape.height,
            width: shape.width,
            _tokens: restProps._tokens,
            key: node.key ?? index,
          });
        }
      }
    }
  }

  const Component = (_component as React.ComponentType<Record<string, unknown>>) ?? PRIMITIVES[node.type];

  if (!Component) {
    console.warn(`MythikRenderer: No React component found for type "${node.type}"`);
    return null;
  }

  // Wire $bindState bindings to onChange handlers
  const handlers: Record<string, unknown> = {};
  if (_bindings && typeof _bindings === 'object') {
    const bindings = _bindings as Record<string, string>;
    for (const [propName, statePath] of Object.entries(bindings)) {
      if (propName === 'value' || propName === 'checked') {
        handlers.onChange = (val: unknown) => {
          svc.store.set(statePath, val);
        };
      }
    }
  }

  // Wire on.press, on.change, etc. to action dispatcher
  if (_eventBindings && typeof _eventBindings === 'object') {
    const eventBindings = _eventBindings as Record<string, EventBinding>;
    if (eventBindings.press) {
      handlers.onClick = () => dispatchAction(eventBindings.press);
    }
    if (eventBindings.change) {
      const existingOnChange = handlers.onChange as ((val: unknown) => void) | undefined;
      handlers.onChange = (val: unknown) => {
        existingOnChange?.(val);
        dispatchAction(eventBindings.change);
      };
    }
    if (eventBindings.submit) {
      handlers.onSubmit = () => dispatchAction(eventBindings.submit);
    }
  }

  // Wire onStateChange and renderIcon for table primitives
  if (node.type === 'table') {
    handlers.onStateChange = (path: string, value: unknown) => {
      svc.store.set(path, value);
    };
    handlers.renderIcon = createIconRenderer(svc) ?? (() => null);
    // Shared row-context dispatcher — writes row to /ui/selectedRow before
    // invoking the action chain. Used by column action buttons and onRowClick —
    // they share the same row-context contract per ai-context-runtime-semantics § 2.1.
    const rowDispatch = createRowDispatcher(svc.store, dispatchAction);
    handlers.dispatchAction = rowDispatch;
    // Wire onRowClick: if spec provides ActionBinding(s), wrap into a function
    // the primitive can invoke. If consumer passed a function directly
    // (programmatic mode), leave it untouched (the primitive receives it as-is via restProps).
    const onRowClickRaw = restProps.onRowClick;
    if (onRowClickRaw && typeof onRowClickRaw !== 'function') {
      handlers.onRowClick = (row: Record<string, unknown>) => {
        rowDispatch(onRowClickRaw as EventBinding, row);
      };
    }
  }

  // Wire spatial-map contextual selection + lazy actions.
  if (node.type === 'spatial-map') {
    const selectedItemPath = typeof restProps.selectedItemPath === 'string'
      ? restProps.selectedItemPath
      : RESERVED_PATHS.SELECTED_SPATIAL_ITEM;
    const selectedContext = svc.store.get(selectedItemPath) as Record<string, unknown> | undefined;
    restProps._selectedItemContext = selectedContext;
    const selectedZonePath = typeof restProps.selectedZonePath === 'string'
      ? restProps.selectedZonePath
      : RESERVED_PATHS.SELECTED_SPATIAL_ZONE;
    const selectedZoneContext = svc.store.get(selectedZonePath) as Record<string, unknown> | undefined;
    restProps._selectedZoneContext = selectedZoneContext;

    const spatialDispatch = createContextDispatcher<Record<string, unknown>>(
      svc.store,
      dispatchAction,
      selectedItemPath,
    );

    const onItemPressRaw = restProps.onItemPress;
    if (typeof onItemPressRaw !== 'function') {
      handlers._onItemSelect = (context: Record<string, unknown>) => {
        spatialDispatch(undefined, context);
      };
      if (onItemPressRaw) {
        handlers.onItemPress = (context: Record<string, unknown>) => {
          spatialDispatch(onItemPressRaw as EventBinding, context);
        };
      }
    }

    const spatialZoneDispatch = createContextDispatcher<Record<string, unknown>>(
      svc.store,
      dispatchAction,
      selectedZonePath,
    );

    const onZonePressRaw = restProps.onZonePress;
    if (typeof onZonePressRaw !== 'function') {
      handlers._onZoneSelect = (context: Record<string, unknown>) => {
        spatialZoneDispatch(undefined, context);
      };
      if (onZonePressRaw) {
        handlers.onZonePress = (context: Record<string, unknown>) => {
          spatialZoneDispatch(onZonePressRaw as EventBinding, context);
        };
      }
    }

    const itemChangePath = typeof restProps.itemChangePath === 'string'
      ? restProps.itemChangePath
      : RESERVED_PATHS.SPATIAL_ITEM_CHANGE;
    const spatialChangeDispatch = createContextDispatcher<Record<string, unknown>>(
      svc.store,
      dispatchAction,
      itemChangePath,
    );

    const onItemChangeRaw = restProps.onItemChange;
    if (typeof onItemChangeRaw !== 'function') {
      handlers.onItemChange = (context: Record<string, unknown>) => {
        spatialChangeDispatch(onItemChangeRaw as EventBinding | undefined, context);
      };
    }

    const zoneChangePath = typeof restProps.zoneChangePath === 'string'
      ? restProps.zoneChangePath
      : RESERVED_PATHS.SPATIAL_ZONE_CHANGE;
    const spatialZoneChangeDispatch = createContextDispatcher<Record<string, unknown>>(
      svc.store,
      dispatchAction,
      zoneChangePath,
    );

    const onZoneChangeRaw = restProps.onZoneChange;
    if (typeof onZoneChangeRaw !== 'function') {
      handlers.onZoneChange = (context: Record<string, unknown>) => {
        spatialZoneChangeDispatch(onZoneChangeRaw as EventBinding | undefined, context);
      };
    }

    const onZoneShapeEditExitRaw = restProps.onZoneShapeEditExit;
    if (typeof onZoneShapeEditExitRaw !== 'function' && onZoneShapeEditExitRaw) {
      handlers.onZoneShapeEditExit = () => {
        dispatchAction(onZoneShapeEditExitRaw as EventBinding);
      };
    }

    const onCanvasPressRaw = restProps.onCanvasPress;
    if (typeof onCanvasPressRaw !== 'function') {
      const policy = restProps.interactionPolicy as { clearSelectionOnCanvasPress?: boolean } | undefined;
      const shouldClearSelection = policy?.clearSelectionOnCanvasPress !== false;
      if (shouldClearSelection || onCanvasPressRaw) {
        const canvasPressPath = typeof restProps.canvasPressPath === 'string'
          ? restProps.canvasPressPath
          : RESERVED_PATHS.SPATIAL_CANVAS_PRESS;
        const canvasDispatch = createContextDispatcher<Record<string, unknown>>(
          svc.store,
          dispatchAction,
          canvasPressPath,
        );
        handlers.onCanvasPress = (context: Record<string, unknown>) => {
          if (shouldClearSelection) {
            svc.store.set(selectedItemPath, undefined);
            svc.store.set(selectedZonePath, undefined);
          }
          canvasDispatch(onCanvasPressRaw as EventBinding | undefined, context);
        };
      }
    }
  }

  // Wire file-upload primitive — inject upload state + callbacks from registry
  if (node.type === 'file-upload' && _elementId && fileRegistryRef) {
    const elementId = _elementId as string;
    // Read upload state from store
    const uploadFiles = svc.store.get(`/ui/uploads/${elementId}/files`) as UploadFileState[] | undefined;
    if (uploadFiles) restProps.uploadState = uploadFiles;

    // Generate preview URLs for images
    restProps.onFiles = (files: File[]) => {
      fileRegistryRef.current.set(elementId, files);
      // Generate preview URLs for image files
      const states: UploadFileState[] = files.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
        progress: 0,
        status: 'pending' as const,
        previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
        error: null,
      }));
      svc.store.set(`/ui/uploads/${elementId}/files`, states);

      // Auto-upload if configured (default: true)
      const autoUpload = restProps.autoUpload !== false;
      if (autoUpload && _eventBindings) {
        const eventBindings = _eventBindings as Record<string, unknown>;
        const uploadBinding = eventBindings.upload as ActionBinding | undefined;
        if (uploadBinding) {
          // dispatchAction with internal params (File[] is not an Expression — cast needed for internal plumbing)
          dispatchAction({ action: 'uploadFile', params: {
            ...uploadBinding.params,
            files, elementId,
            accept: (restProps.accept as string) ?? '*',
            maxSize: (restProps.maxSize as number) ?? 10_485_760,
          } } as unknown as EventBinding);
        }
      }
    };

    restProps.onRemove = (idx: number) => {
      const currentFiles = fileRegistryRef.current.get(elementId) ?? [];
      const currentStates = (svc.store.get(`/ui/uploads/${elementId}/files`) as UploadFileState[]) ?? [];
      // Revoke preview URL
      if (currentStates[idx]?.previewUrl) {
        URL.revokeObjectURL(currentStates[idx].previewUrl!);
      }
      currentFiles.splice(idx, 1);
      const newStates = currentStates.filter((_: UploadFileState, i: number) => i !== idx);
      fileRegistryRef.current.set(elementId, currentFiles);
      svc.store.set(`/ui/uploads/${elementId}/files`, newStates);
    };

    restProps.onRetry = (idx: number) => {
      const currentFiles = fileRegistryRef.current.get(elementId) ?? [];
      const file = currentFiles[idx];
      if (!file || !_eventBindings) return;
      const eventBindings = _eventBindings as Record<string, unknown>;
      const uploadBinding = eventBindings.upload as ActionBinding | undefined;
      if (uploadBinding) {
        // Reset this file's state
        const currentStates = ((svc.store.get(`/ui/uploads/${elementId}/files`) as UploadFileState[]) ?? []).slice();
        if (currentStates[idx]) {
          currentStates[idx] = { ...currentStates[idx], status: 'uploading', progress: 0, error: null };
          svc.store.set(`/ui/uploads/${elementId}/files`, currentStates);
        }
        dispatchAction({ action: 'uploadFile', params: {
          ...uploadBinding.params,
          files: [file], elementId,
          accept: (restProps.accept as string) ?? '*',
          maxSize: (restProps.maxSize as number) ?? 10_485_760,
        } } as unknown as EventBinding);
      }
    };
  }

  // Wire store and onDismiss for toast-container primitives (spec mode)
  if (node.type === 'toast-container') {
    handlers.store = svc.store;
    handlers.onDismiss = (id: string) => {
      dispatchAction({ action: 'dismissNotification', params: { id } });
    };
    const iconRender = createIconRenderer(svc);
    if (iconRender) handlers.renderIcon = iconRender;
  }

  const children = node.children.length > 0
    ? node.children.map((child: RenderNode, i: number) => withInspectId(renderNode(child, svc, dispatchAction, i, cssCollector, fileRegistryRef, skeletonMode, spec, emitElementIds), child.props._elementId as string | undefined, emitElementIds, child.key ?? `${child.props._elementId as string}-${i}`))
    : undefined;

  // Check if this element has any interaction or animation props
  const hasInteractions = _hover || _active || _focus || _motion;

  // Overlays (modal, drawer) handle _motion internally — they animate
  // backdrop and content panel separately. Pass _motion as a prop instead
  // of wrapping in motion.div (which breaks fixed positioning).
  const isOverlay = node.type === 'modal' || node.type === 'drawer';

  if (isOverlay && _motion) {
    const overlayMotion = _motion as Record<string, unknown>;
    const isExiting = restProps._exiting === true;
    const hasExit = overlayMotion?.exit;

    if (hasExit) {
      // Wrap in AnimatePresence for exit animations (modal close, drawer close)
      const overlayElement = React.createElement(
        motion.div,
        {
          key: `overlay-${node.key ?? index}`,
          initial: overlayMotion.initial as TargetAndTransition,
          animate: overlayMotion.animate as TargetAndTransition,
          exit: overlayMotion.exit as TargetAndTransition,
          transition: overlayMotion.transition as Transition,
          layoutId: overlayMotion.layoutId as string | undefined,
          style: { position: 'fixed' as const, inset: 0, zIndex: 1000 },
        },
        React.createElement(
          Component,
          { ...restProps, ...handlers, key: node.key ?? index },
          children,
        ),
      );

      return React.createElement(
        AnimatePresence,
        { mode: 'wait', key: `ap-overlay-${node.key ?? index}` },
        isExiting ? null : overlayElement,
      );
    }

    return React.createElement(
      Component,
      { ...restProps, ...handlers, _motion, key: node.key ?? index },
      children,
    );
  }

  if (hasInteractions) {
    const hoverObj = _hover as Record<string, unknown> | undefined;
    const activeObj = _active as Record<string, unknown> | undefined;
    const focusObj = _focus as Record<string, unknown> | undefined;
    const hasCssInteractions = hoverObj || activeObj || focusObj;
    const motionNeeded = needsMotionWrapper(hoverObj, activeObj, focusObj);
    const motionConfig = _motion as Record<string, unknown> | undefined;
    const hasMotionAnimation = motionConfig?.initial || motionConfig?.animate || motionConfig?.exit;

    // CSS-only path: no transform props in hover/active/focus
    // May still have motion animation (initial/animate/exit) — mixed case
    if (hasCssInteractions && !motionNeeded) {
      // Dev warning: primitive must accept className for CSS hover to work
      if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production' && !CSS_HOVER_SUPPORTED.has(node.type)) {
        console.warn(
          `[Mythik] Element "${_elementId ?? node.key ?? index}" (type: "${node.type}") has CSS hover/active/focus but "${node.type}" does not support className. The interaction will be silently ignored. Add className support to the primitive or use transform-based hover (scale, y, etc.) which uses a Motion wrapper instead.`
        );
      }
      const cssId = _elementId ?? node.key ?? `el-${index}`;
      const className = hashId(String(cssId));
      const transitionObj = _transition as { duration?: number; ease?: string; delay?: number } | undefined;
      const cssRule = generateHoverCSS(className, {
        hover: hoverObj,
        active: activeObj,
        focus: focusObj,
        transition: transitionObj,
      });
      cssCollector?.set(className, cssRule);

      if (hasMotionAnimation) {
        // Mixed case: CSS handles hover/active/focus, motion.div handles animation
        const motionProps: Record<string, unknown> = {};
        if (motionConfig?.initial) motionProps.initial = motionConfig.initial;
        if (motionConfig?.animate) motionProps.animate = resolveInfinity(motionConfig.animate);
        if (motionConfig?.exit) motionProps.exit = motionConfig.exit;
        if (motionConfig?.transition) motionProps.transition = resolveInfinity(motionConfig.transition);
        if (motionConfig?.layoutId) motionProps.layoutId = motionConfig.layoutId;

        return React.createElement(
          motion.div,
          { key: node.key ?? index, ...motionProps },
          React.createElement(
            Component,
            { ...restProps, ...handlers, className },
            children,
          ),
        );
      }

      // Pure CSS path: no wrapper at all
      return React.createElement(
        Component,
        { ...restProps, ...handlers, className, key: node.key ?? index },
        children,
      );
    }

    // Motion wrapper path: transform-based interactions (scale, rotate, x, y)
    const motionProps: Record<string, unknown> = {};
    if (_hover) motionProps.whileHover = _hover;
    if (_active) motionProps.whileTap = _active;
    if (_focus) motionProps.whileFocus = _focus;
    if (_transition) motionProps.transition = _transition;

    if (motionConfig?.initial) motionProps.initial = motionConfig.initial;
    if (motionConfig?.animate) motionProps.animate = resolveInfinity(motionConfig.animate);
    if (motionConfig?.exit) motionProps.exit = motionConfig.exit;
    if (motionConfig?.layoutId) motionProps.layoutId = motionConfig.layoutId;
    if (motionConfig?.whileTap && !_active) motionProps.whileTap = motionConfig.whileTap;
    if (motionConfig?.whileHover && !_hover) motionProps.whileHover = motionConfig.whileHover;
    if (motionConfig?.transition && !_transition) {
      motionProps.transition = resolveInfinity(motionConfig.transition);
    }

    // Wrap: motion.div is a transparent animation wrapper.
    // The primitive keeps ALL its styles (layout, colors, borders, etc.)
    // motion.div only handles transforms/opacity/animations.
    //
    // The wrapper must inherit visual shape props from the element so that:
    // - borderRadius: hover hit area matches the visible rounded shape (no square flash)
    // - overflow: clipped content stays clipped during transforms
    // - position/top/right/etc: absolutely positioned elements don't collapse
    const elementStyle = restProps.style as React.CSSProperties | undefined;
    const pos = elementStyle?.position;
    const needsPositioning = pos === 'absolute' || pos === 'fixed';

    const wrapperStyle: React.CSSProperties = {};
    const innerStyleOverrides: Record<string, unknown> = {};

    // Always inherit borderRadius and overflow so the wrapper matches the element's shape
    if (elementStyle?.borderRadius != null) {
      wrapperStyle.borderRadius = elementStyle.borderRadius;
    }
    if (elementStyle?.overflow != null) {
      wrapperStyle.overflow = elementStyle.overflow;
    }

    // For absolutely/fixed positioned elements: move positioning to wrapper
    if (needsPositioning) {
      wrapperStyle.position = elementStyle!.position;
      wrapperStyle.top = elementStyle!.top;
      wrapperStyle.right = elementStyle!.right;
      wrapperStyle.bottom = elementStyle!.bottom;
      wrapperStyle.left = elementStyle!.left;
      wrapperStyle.zIndex = elementStyle!.zIndex;
      innerStyleOverrides.position = undefined;
      innerStyleOverrides.top = undefined;
      innerStyleOverrides.right = undefined;
      innerStyleOverrides.bottom = undefined;
      innerStyleOverrides.left = undefined;
      innerStyleOverrides.zIndex = undefined;
    }

    const hasWrapperStyle = Object.keys(wrapperStyle).length > 0;
    const hasInnerOverrides = Object.keys(innerStyleOverrides).length > 0;
    const innerStyle = hasInnerOverrides
      ? { ...elementStyle, ...innerStyleOverrides } as React.CSSProperties
      : elementStyle;

    const needsPresence = motionProps.exit || motionProps.layoutId;
    const isExiting = restProps._exiting === true;

    const motionElement = React.createElement(
      motion.div,
      {
        key: `m-${node.key ?? index}`,
        style: hasWrapperStyle ? wrapperStyle : undefined,
        ...motionProps,
      },
      React.createElement(
        Component,
        { ...restProps, ...handlers, style: innerStyle },
        children,
      ),
    );

    // Wrap in AnimatePresence for exit animations and layoutId transitions
    if (needsPresence) {
      return React.createElement(
        AnimatePresence,
        { mode: 'popLayout', key: `ap-${node.key ?? index}` },
        isExiting ? null : motionElement,
      );
    }

    return motionElement;
  }

  // No interactions — render directly (zero overhead)
  return React.createElement(
    Component,
    { ...restProps, ...handlers, key: node.key ?? index },
    children,
  );
}

export function MythikRenderer({ spec, config = {}, instance, autoDeviceContext = true, fetcher, storage, storageConfig, exportAdapters, autoSkeleton = true, emitElementIds = false, onSpecRuntimeMount }: MythikRendererProps) {
  const svc = React.useMemo(() => {
    if (instance) return instance;
    const s = createMythik(config);
    registerReactPrimitives(s.plugins);
    s.applyPlugins();
    return s;
  }, [instance, config]);

  // Auto-track device context (viewport, platform, orientation, colorScheme)
  useDeviceContext(svc.store, autoDeviceContext);

  // Create form engine if spec has forms config
  const formEngine = React.useMemo(() => {
    if (!spec.forms || Object.keys(spec.forms).length === 0) return undefined;
    return createFormEngine({
      store: svc.store,
      resolve: (expr: unknown) => svc.resolver.resolve(expr),
      forms: spec.forms,
    });
  }, [spec, svc]);

  // Cleanup form engine on unmount or spec change
  React.useEffect(() => {
    return () => { formEngine?.destroy(); };
  }, [formEngine]);

  // File registry — holds File objects in refs, never in state (binary data stays out of store)
  const fileRegistryRef = React.useRef<Map<string, File[]>>(new Map());

  // Create action dispatcher with security guards + plugin actions + form engine + framework fetch + storage
  const dispatcher = React.useMemo(() => {
    const d = createActionDispatcher({
      store: svc.store,
      customActions: svc.plugins.getActions(),
      urlGuard: svc.security?.urlGuard,
      stateGuard: svc.security?.stateGuard,
      rateLimiter: svc.security?.rateLimiter,
      formEngine,
      fetcher,
      storage,
      storageConfig,
      exportAdapters,
    });
    return d;
  }, [svc, formEngine, fetcher, storage, storageConfig, exportAdapters]);

  // Create transaction engine for optimistic updates
  const txEngine = React.useMemo(() => {
    return createTransactionEngine({
      store: svc.store,
      dispatcher,
      resolve: (expr: unknown) => svc.resolver.resolve(expr),
    });
  }, [svc, dispatcher]);

  // Dispatch function — handles standard actions, arrays, and transactions
  const dispatchAction = React.useCallback((binding: EventBinding) => {
    // Transaction binding
    if (isTransactionBinding(binding)) {
      txEngine.execute(binding.transaction).catch((err) => {
        console.error('Transaction failed:', err);
      });
      return;
    }

    // Standard action binding(s)
    const bindings = Array.isArray(binding) ? binding : [binding];
    (async () => {
      for (const b of bindings) {
        try {
          if (isTransactionBinding(b)) {
            await txEngine.execute(b.transaction);
            continue;
          }

          const promise = dispatcher.dispatch(b, (expr) => svc.resolver.resolve(expr));
          if (!b.fireAndForget) {
            await promise;
          }
        } catch (err) {
          // Auth actions log only in development — prevents leaking stack traces in production
          const authActions = ['login', 'logout', 'refreshSession'];
          const actionName = isTransactionBinding(b) ? 'transaction' : b.action;
          if (!authActions.includes(actionName) || process.env.NODE_ENV !== 'production') {
            console.error(`Action "${actionName}" failed:`, err);
          }
        }
      }
    })();
  }, [dispatcher, svc, txEngine]);

  // Re-render when state changes (batched + incremental)
  // Collect changed paths between frames, pass to engine for selective re-render
  // NOTE: declared BEFORE mountSpecRuntime so the subscription is attached
  // before deriveEngine.mount() writes initial derive values — otherwise the
  // first-paint synchronous writes would land before any listener exists.
  const changedPathsRef = React.useRef<Set<string>>(new Set());
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    let frameId: number | null = null;
    const unsubscribe = svc.store.subscribe((_state: Record<string, unknown>, changedPath: string) => {
      changedPathsRef.current.add(changedPath);
      if (frameId === null) {
        frameId = requestAnimationFrame(() => {
          frameId = null;
          setTick((t) => t + 1);
        });
      }
    });
    return () => {
      unsubscribe();
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, [svc]);

  // ── v49 Item E: per-spec runtime (derive + dataSources engines) ──
  React.useEffect(() => {
    const runtime = mountSpecRuntime(spec, {
      store: svc.store,
      resolver: svc.resolver,
      dispatcher,
      protectionRegistry: svc.protectionRegistry,
      fetcher,
      urlGuard: svc.security?.urlGuard,
    });
    onSpecRuntimeMount?.(runtime);
    return () => {
      onSpecRuntimeMount?.(null);
      runtime.unmount();
    };
  }, [spec, dispatcher, svc, fetcher, onSpecRuntimeMount]);

  // Execute initial actions on mount (e.g., fetch data from Supabase)
  React.useEffect(() => {
    if (spec.initialActions && spec.initialActions.length > 0) {
      (async () => {
        for (const binding of spec.initialActions!) {
          try {
            if (isTransactionBinding(binding)) {
              await txEngine.execute(binding.transaction);
            } else {
              await dispatcher.dispatch(binding, (expr) => svc.resolver.resolve(expr));
            }
          } catch (err) {
            const label = 'action' in binding ? (binding as ActionBinding).action : 'transaction';
            console.error(`Initial action "${label}" failed:`, err);
          }
        }
      })();
    }
  }, [spec, dispatcher, svc]);

  // Clipboard bridge — write to browser clipboard when /ui/clipboard changes
  React.useEffect(() => {
    const unsub = svc.store.subscribe((_s: Record<string, unknown>, path: string) => {
      if (path === RESERVED_PATHS.CLIPBOARD) {
        const data = svc.store.get(RESERVED_PATHS.CLIPBOARD) as { value?: string } | undefined;
        if (data?.value && typeof navigator !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.writeText(String(data.value)).catch(() => {});
        }
      }
    });
    return unsub;
  }, [svc]);

  // Pass collected changedPaths for incremental render, then clear
  const changedPaths = changedPathsRef.current.size > 0 ? changedPathsRef.current : undefined;
  const tree = svc.engine.render(spec, changedPaths);
  changedPathsRef.current = new Set();

  // Auto-skeleton detection
  const isLoading = svc.store.get(RESERVED_PATHS.LOADING) === true;
  const skeletonMode = React.useMemo(() => {
    if (!autoSkeleton || !isLoading) return false;
    const hasFetch = spec.initialActions?.some(
      (a) => !isTransactionBinding(a) && (a as ActionBinding).action === 'fetch'
    );
    if (!hasFetch) return false;
    const fetchTargets = (spec.initialActions ?? [])
      .filter((a) => !isTransactionBinding(a))
      .filter((a) => (a as ActionBinding).action === 'fetch')
      .map((a) => (a as ActionBinding).params?.target as string)
      .filter(Boolean);
    return fetchTargets.some((t) => {
      const data = svc.store.get(t);
      return data === undefined || data === null || (Array.isArray(data) && data.length === 0);
    });
  }, [autoSkeleton, isLoading, spec, svc]);

  // Collect render errors and write to /ui/renderErrors in dev mode (deduped to prevent loops)
  const exposeErrors = (svc.security as Record<string, unknown>)?.exposeErrors !== false;
  const prevErrorKeyRef = React.useRef<string>('');
  React.useEffect(() => {
    if (!exposeErrors) return;
    const errors: Array<{ elementId: string; message: string; type: string }> = [];
    function collectErrors(node: RenderNode) {
      if (node.type === '_error') {
        errors.push({
          elementId: node.props.elementId as string,
          message: node.props.error as string,
          type: node.props.originalType as string,
        });
      }
      for (const child of node.children) {
        collectErrors(child);
      }
    }
    collectErrors(tree);
    const errorKey = errors.map(e => `${e.elementId}:${e.message}`).join('|');
    if (errorKey === prevErrorKeyRef.current) return; // Same errors — skip write to prevent loop
    prevErrorKeyRef.current = errorKey;
    if (errors.length > 0) {
      svc.store.set(RESERVED_PATHS.RENDER_ERRORS, errors);
    } else {
      const existing = svc.store.get(RESERVED_PATHS.RENDER_ERRORS);
      if (existing) svc.store.set(RESERVED_PATHS.RENDER_ERRORS, undefined);
    }
  });

  // Collect CSS rules for CSS-based hover/active/focus
  const cssCollector = React.useMemo(() => new Map<string, string>(), []);
  cssCollector.clear(); // Clear before each render pass

  const rendered = withInspectId(
    renderNode(tree, svc, dispatchAction, 0, cssCollector, fileRegistryRef, skeletonMode, spec, emitElementIds),
    tree.props._elementId as string | undefined,
    emitElementIds,
  );

  const cssText = cssCollector.size > 0
    ? Array.from(cssCollector.values()).join('\n')
    : null;

  // Auto-inject ToastContainer if spec doesn't include one
  const specHasToastContainer = React.useMemo(() => {
    return Object.values(spec.elements).some(
      (el: unknown) => (el as Record<string, unknown>).type === 'toast-container'
    );
  }, [spec]);

  const toastElement = !specHasToastContainer
    ? React.createElement(ToastContainer, {
        store: svc.store,
        onDismiss: (id: string) => {
          dispatchAction({ action: 'dismissNotification', params: { id } });
        },
        renderIcon: createIconRenderer(svc),
      })
    : null;

  // Plan 3 Task 20 — root mount for LayerBackground v2 consumer path.
  // When `tokens.identity.background` is a LayerBackground (has color or
  // layers), wrap the rendered tree in a positioned container and mount
  // <BackgroundStack>. Palette threads from tokens.colors so blob layers
  // render the real BlobLayer (Task 18) instead of the stub. Legacy
  // BackgroundConfig was deleted in Task 21 — the isLayerBackground
  // rejection of `{ style: ... }` shapes now serves as malformed-spec
  // defense rather than coexistence handling.
  // Tokens source (Task 23 follow-up): read from `/tokens/resolved` in the
  // store — factory persists the fully-resolved token tree there at
  // creation and after every updateTokens call. This is the single reliable
  // source for DNA-derived colors + current identity.background shape.
  // Falls back to `spec.tokens` for test harnesses that attach tokens
  // inline on the spec without going through createMythik config.
  const resolvedTokens = svc.store.get(RESERVED_PATHS.RESOLVED_TOKENS) as Record<string, unknown> | undefined;
  const resolvedIdentity = resolvedTokens?.identity as Record<string, unknown> | undefined;
  const specInline = spec.tokens;
  const specInlineIdentity = specInline?.identity as Record<string, unknown> | undefined;
  // identity.background priority: spec-inline (explicit consumer intent) →
  // resolved store value.
  const backgroundRaw = specInlineIdentity?.background ?? resolvedIdentity?.background;
  const specColors = (specInline?.colors as Record<string, string> | undefined)
    ?? (resolvedTokens?.colors as Record<string, string> | undefined);
  const layerBackground = isLayerBackground(backgroundRaw) ? backgroundRaw : undefined;
  let palette: { primary: string; accent: string } | undefined;
  if (layerBackground) {
    if (specColors && typeof specColors.primary === 'string' && typeof specColors.accent === 'string') {
      palette = { primary: specColors.primary, accent: specColors.accent };
    } else if (process.env.NODE_ENV !== 'production') {
      // Task 20 review M3 — surface malformed tokens.colors at the renderer
      // seam, more diagnostic than BackgroundStack's generic "no palette"
      // warn because we know the user intended a LayerBackground here.
      // eslint-disable-next-line no-console
      console.warn(
        'MythikRenderer: identity.background is a LayerBackground but tokens.colors.{primary,accent} are missing or non-string — blob layers will fall back to the stub. Check tokens shape.',
      );
    }
  }

  const body = (
    <RenderErrorBoundary exposeErrors={exposeErrors} resetKey={spec}>
      <>
        {cssText && <style data-mythik-hover>{cssText}</style>}
        {skeletonMode && <style data-mythik-skeleton>{SHIMMER_CSS}</style>}
        {rendered}
        {toastElement}
      </>
    </RenderErrorBoundary>
  );

  if (layerBackground) {
    // Task 20 review C1 — `isolation: isolate` creates a new stacking context
    // so per-layer zIndex values (which resolveCommon defaults to array-index,
    // so a 3-layer stack reaches zIndex 3) compete only among siblings, not
    // against the content wrapper's `CONTENT_Z_INDEX`. Review I1 — `minHeight`
    // removed: the renderer should not invent layout height; consumers
    // determine the mount-point dimensions.
    return (
      <LayoutGroup>
        <div data-sv-renderer-root="v2" style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, isolation: 'isolate', zIndex: 0, pointerEvents: 'none' }}>
            <BackgroundStack background={layerBackground} palette={palette} />
          </div>
          <div style={{ position: 'relative', zIndex: CONTENT_Z_INDEX }}>{body}</div>
        </div>
      </LayoutGroup>
    );
  }

  return (
    <LayoutGroup>
      {body}
    </LayoutGroup>
  );
}
