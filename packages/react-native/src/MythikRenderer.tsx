import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { MotionView } from './motion-view.js';
import type { Spec, RenderNode, MythikInstance, ActionBinding, TransactionBinding, EventBinding, LayerBackground } from 'mythik';
import { createMythik, createActionDispatcher, createTransactionEngine, createFormEngine, mountSpecRuntime } from 'mythik';
import type { MythikConfig } from 'mythik';
import { registerReactNativePrimitives, PRIMITIVES } from './primitives/index.js';
import { ToastContainer } from './primitives/toast-container.js';
import { BackgroundStack } from './background/BackgroundStack.js';
import { useDeviceContext } from './use-device-context.js';
import { cssToNative } from './css-to-native.js';
import { toMotionViewProps, mergeInteractionStyles } from './motion-adapter.js';

/**
 * Gate for LayerBackground root mount — RN parity with web
 * (plan 3 Task 20 + Task 21 legacy deletion). Legacy BackgroundConfig was
 * deleted; the `has style` rejection persists as malformed-spec defense.
 * Empty objects and arrays also rejected so the wrapper never mounts for
 * semantically-empty backgrounds.
 */
function isLayerBackground(bg: unknown): bg is LayerBackground {
  if (typeof bg !== 'object' || bg === null || Array.isArray(bg)) return false;
  if ('style' in bg) return false;
  return 'color' in bg || 'layers' in bg;
}

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
  /** Override fetch for auth header injection. */
  fetcher?: (url: string, options?: RequestInit) => Promise<Response>;
  /** Enable auto-skeleton loading placeholders. Default: true. */
  autoSkeleton?: boolean;
}

function ErrorPlaceholder({ elementId, error, exposeErrors }: { elementId: string; error: string; exposeErrors: boolean }) {
  if (!exposeErrors) {
    return (
      <View style={{ padding: 4, margin: 2, backgroundColor: '#f3f4f6', borderRadius: 4, minHeight: 20 }} />
    );
  }
  return (
    <View style={{ padding: 8, margin: 4, borderWidth: 2, borderStyle: 'dashed', borderColor: '#ef4444', borderRadius: 4, backgroundColor: '#fef2f2' }}>
      <Text style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: '700', color: '#991b1b', marginBottom: 4 }}>{elementId}</Text>
      <Text style={{ fontFamily: 'monospace', fontSize: 12, color: '#991b1b' }}>{error}</Text>
    </View>
  );
}

/** Create an icon renderer from the plugin system */
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

const SKELETON_SHAPES: Record<string, { variant: 'text' | 'circle' | 'rect'; height: number; width?: number }> = {
  text: { variant: 'text', height: 16 },
  image: { variant: 'rect', height: 120 },
  button: { variant: 'rect', height: 36, width: 120 },
  input: { variant: 'rect', height: 40 },
  textarea: { variant: 'rect', height: 80 },
  select: { variant: 'rect', height: 40 },
  icon: { variant: 'circle', height: 24 },
  slider: { variant: 'rect', height: 20 },
  checkbox: { variant: 'rect', height: 20, width: 20 },
  toggle: { variant: 'rect', height: 24, width: 44 },
};

const SKELETON_PASSTHROUGH = new Set(['stack', 'grid', 'box', 'scroll', 'list']);

const SKELETON_SKIP = new Set([
  'modal', 'drawer', 'tabs', 'accordion', 'wizard', 'screen',
  'toast-container', 'screen-outlet', 'skeleton',
]);

const SKELETON_RENDER_ASIS = new Set(['divider', 'spacer']);

/** Recursively render a RenderNode tree to React Native elements */
function renderNode(
  node: RenderNode,
  svc: MythikInstance,
  dispatchAction: (binding: EventBinding) => void,
  index: number = 0,
  skeletonMode?: boolean,
  spec?: Spec,
): React.ReactNode {
  // Handle error nodes
  if (node.type === '_error') {
    const exposeErrors = (svc.security as Record<string, unknown>)?.exposeErrors !== false;
    return React.createElement(ErrorPlaceholder, {
      key: node.key ?? `error-${index}`,
      elementId: node.props.elementId as string,
      error: node.props.error as string,
      exposeErrors,
    });
  }

  const { _component, _bindings, _eventBindings, _hover, _active, _focus, _transition, _motion, _elementId, _exiting, ...restProps } = node.props;

  // _focus is not supported on RN V1 — on mobile, focus states are handled internally by form primitives
  if (_focus && typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
    console.warn(`[Mythik RN] Element "${_elementId ?? node.key}" has focus interaction styles, but focus states are not supported in React Native V1. The styles will be ignored.`);
  }

  // --- Auto-skeleton ---
  if (skeletonMode && spec) {
    const elementId = _elementId as string | undefined;
    const element = elementId ? spec.elements[elementId] : undefined;

    if (element?.skeleton !== false) {
      if (SKELETON_SKIP.has(node.type)) return null;

      if (SKELETON_RENDER_ASIS.has(node.type)) {
        const Comp = (_component as React.ComponentType<Record<string, unknown>>) ?? PRIMITIVES[node.type];
        if (!Comp) return null;
        return React.createElement(Comp, { ...restProps, key: node.key ?? index });
      }

      if (SKELETON_PASSTHROUGH.has(node.type)) {
        const Component = (_component as React.ComponentType<Record<string, unknown>>) ?? PRIMITIVES[node.type];
        if (!Component) return null;
        const children = node.children.length > 0
          ? node.children.map((child: RenderNode, i: number) => renderNode(child, svc, dispatchAction, i, skeletonMode, spec))
          : undefined;
        return React.createElement(Component, { ...restProps, key: node.key ?? index }, children);
      }

      if (node.type === 'skeleton') {
        const SkeletonComp = PRIMITIVES['skeleton'];
        if (SkeletonComp) return React.createElement(SkeletonComp, { ...restProps, key: node.key ?? index });
      }

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

  // --- Resolve component ---
  const Component = (_component as React.ComponentType<Record<string, unknown>>) ?? PRIMITIVES[node.type];
  if (!Component) {
    console.warn(`MythikRenderer: No React Native component found for type "${node.type}"`);
    return null;
  }

  // --- Translate CSS styles to RN ---
  if (restProps.style && typeof restProps.style === 'object') {
    restProps.style = cssToNative(restProps.style as Record<string, unknown>).style;
  }

  // --- Wire $bindState bindings to onChange ---
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

  // --- Wire on.press, on.change, etc. ---
  if (_eventBindings && typeof _eventBindings === 'object') {
    const eventBindings = _eventBindings as Record<string, ActionBinding | ActionBinding[]>;
    if (eventBindings.press) {
      // RN: onClick maps to onPress on Pressable/Button components
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

  // --- Wire store/onDismiss for toast-container ---
  if (node.type === 'toast-container') {
    handlers.store = svc.store;
    handlers.onDismiss = (id: string) => {
      dispatchAction({ action: 'dismissNotification', params: { id } });
    };
    const iconRender = createIconRenderer(svc);
    if (iconRender) handlers.renderIcon = iconRender;
  }

  // --- Render children recursively ---
  const children = node.children.length > 0
    ? node.children.map((child: RenderNode, i: number) => renderNode(child, svc, dispatchAction, i, skeletonMode, spec))
    : undefined;

  // --- Interaction + Animation handling ---
  const hoverObj = _hover as Record<string, unknown> | undefined;
  const activeObj = _active as Record<string, unknown> | undefined;
  const motionConfig = _motion as Record<string, unknown> | undefined;
  const hasInteractions = hoverObj || activeObj;
  const hasMotion = motionConfig?.initial || motionConfig?.animate || motionConfig?.exit || motionConfig?.layoutId;

  // Overlays handle _motion internally
  const isOverlay = node.type === 'modal' || node.type === 'drawer';

  if (isOverlay && motionConfig) {
    return React.createElement(
      Component,
      { ...restProps, ...handlers, _motion: motionConfig, key: node.key ?? index },
      children,
    );
  }

  // Motion animation (enter/animate/exit)
  if (hasMotion) {
    const motionProps = toMotionViewProps(motionConfig!);
    // Resolve Infinity in animate/transition
    if (motionProps.animate) motionProps.animate = resolveInfinity(motionProps.animate) as Record<string, unknown>;
    if (motionProps.transition) motionProps.transition = resolveInfinity(motionProps.transition) as any;

    const isExiting = restProps._exiting === true;
    const needsPresence = motionProps.exit || motionProps.layoutId;

    // If also has interactions, merge pressed style
    if (hasInteractions) {
      const pressedStyle = mergeInteractionStyles(
        hoverObj ? cssToNative(hoverObj).style as Record<string, unknown> : undefined,
        activeObj ? cssToNative(activeObj).style as Record<string, unknown> : undefined,
      );

      const motionElement = React.createElement(
        MotionView,
        { key: `m-${node.key ?? index}`, ...motionProps },
        React.createElement(
          Pressable,
          {
            onPress: handlers.onClick as (() => void) | undefined,
            style: ({ pressed }: { pressed: boolean }) => pressed && pressedStyle ? pressedStyle : undefined,
          },
          React.createElement(Component, { ...restProps, ...handlers, key: node.key ?? index }, children),
        ),
      );

      if (needsPresence) {
        // AnimatePresence removed — exit animations are a V2 item
      return isExiting ? null : motionElement;
      }
      return motionElement;
    }

    // Motion only, no interactions
    const motionElement = React.createElement(
      MotionView,
      { key: `m-${node.key ?? index}`, ...motionProps },
      React.createElement(Component, { ...restProps, ...handlers }, children),
    );

    if (needsPresence) {
      // AnimatePresence removed — exit animations are a V2 item
      return isExiting ? null : motionElement;
    }
    return motionElement;
  }

  // Interactions only (no motion animation)
  if (hasInteractions) {
    const pressedStyle = mergeInteractionStyles(
      hoverObj ? cssToNative(hoverObj).style as Record<string, unknown> : undefined,
      activeObj ? cssToNative(activeObj).style as Record<string, unknown> : undefined,
    );

    return React.createElement(
      Pressable,
      {
        key: node.key ?? index,
        onPress: handlers.onClick as (() => void) | undefined,
        style: ({ pressed }: { pressed: boolean }) => pressed && pressedStyle ? pressedStyle : undefined,
      },
      React.createElement(Component, { ...restProps, ...handlers }, children),
    );
  }

  // No interactions, no animations — render directly (zero overhead)
  return React.createElement(
    Component,
    { ...restProps, ...handlers, key: node.key ?? index },
    children,
  );
}

// --- Main component ---

export function MythikRenderer({ spec, config = {}, instance, autoDeviceContext = true, fetcher, autoSkeleton = true }: MythikRendererProps) {
  const svc = React.useMemo(() => {
    if (instance) return instance;
    const s = createMythik(config);
    registerReactNativePrimitives(s.plugins);
    s.applyPlugins();
    return s;
  }, [instance, config]);

  // Auto-track device context
  useDeviceContext(svc.store, autoDeviceContext);

  // Form engine
  const formEngine = React.useMemo(() => {
    if (!spec.forms || Object.keys(spec.forms).length === 0) return undefined;
    return createFormEngine({
      store: svc.store,
      resolve: (expr: unknown) => svc.resolver.resolve(expr),
      forms: spec.forms,
    });
  }, [spec, svc]);

  React.useEffect(() => {
    return () => { formEngine?.destroy(); };
  }, [formEngine]);

  // Action dispatcher with security guards
  const dispatcher = React.useMemo(() => {
    return createActionDispatcher({
      store: svc.store,
      customActions: svc.plugins.getActions(),
      urlGuard: svc.security?.urlGuard,
      stateGuard: svc.security?.stateGuard,
      rateLimiter: svc.security?.rateLimiter,
      formEngine,
      fetcher,
    });
  }, [svc, formEngine, fetcher]);

  // Transaction engine
  const txEngine = React.useMemo(() => {
    return createTransactionEngine({
      store: svc.store,
      dispatcher,
      resolve: (expr: unknown) => svc.resolver.resolve(expr),
    });
  }, [svc, dispatcher]);

  // Dispatch function — handles actions, arrays, and transactions
  const dispatchAction = React.useCallback((binding: EventBinding) => {
    if (isTransactionBinding(binding)) {
      txEngine.execute(binding.transaction).catch((err) => {
        console.error('Transaction failed:', err);
      });
      return;
    }

    const bindings = Array.isArray(binding) ? binding : [binding];
    (async () => {
      for (const b of bindings) {
        try {
          const promise = dispatcher.dispatch(b, (expr) => svc.resolver.resolve(expr));
          if (!b.fireAndForget) {
            await promise;
          }
        } catch (err) {
          const authActions = ['login', 'logout', 'refreshSession'];
          if (!authActions.includes(b.action) || (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production')) {
            console.error(`Action "${b.action}" failed:`, err);
          }
        }
      }
    })();
  }, [dispatcher, svc, txEngine]);

  // Re-render on state changes (batched via requestAnimationFrame)
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
    });
    return () => runtime.unmount();
  }, [spec, dispatcher, svc, fetcher]);

  // Execute initial actions on mount
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

  // Render tree with changed paths for incremental render
  const changedPaths = changedPathsRef.current.size > 0 ? changedPathsRef.current : undefined;
  const tree = svc.engine.render(spec, changedPaths);
  changedPathsRef.current = new Set();

  // Auto-skeleton detection
  const isLoading = svc.store.get('/ui/loading') === true;
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

  // Collect render errors to /ui/renderErrors (dev mode, deduped)
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
      for (const child of node.children) collectErrors(child);
    }
    collectErrors(tree);
    const errorKey = errors.map(e => `${e.elementId}:${e.message}`).join('|');
    if (errorKey === prevErrorKeyRef.current) return;
    prevErrorKeyRef.current = errorKey;
    if (errors.length > 0) {
      svc.store.set('/ui/renderErrors', errors);
    } else {
      const existing = svc.store.get('/ui/renderErrors');
      if (existing) svc.store.set('/ui/renderErrors', undefined);
    }
  });

  const rendered = renderNode(tree, svc, dispatchAction, 0, skeletonMode, spec);

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

  // Plan 3 Task 20 — RN parity for root BackgroundStack mount. Detect v2
  // LayerBackground on spec.tokens.identity.background, thread palette from
  // spec.tokens.colors, and wrap the rendered tree in a positioned container
  // with the stack as a sibling. Specs without v2 background (empty, malformed,
  // or absent) take the unchanged `<View flex:1>` branch.
  const specTokens = spec.tokens;
  const specIdentity = specTokens?.identity as Record<string, unknown> | undefined;
  const backgroundRaw = specIdentity?.background;
  const specColors = specTokens?.colors as Record<string, string> | undefined;
  const layerBackground = isLayerBackground(backgroundRaw) ? backgroundRaw : undefined;
  let palette: { primary: string; accent: string } | undefined;
  if (layerBackground) {
    if (specColors && typeof specColors.primary === 'string' && typeof specColors.accent === 'string') {
      palette = { primary: specColors.primary, accent: specColors.accent };
    } else if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(
        'MythikRenderer (RN): identity.background is a LayerBackground but tokens.colors.{primary,accent} are missing or non-string — blob layers will fall back to the stub.',
      );
    }
  }

  if (layerBackground) {
    return (
      <View testID="sv-renderer-root-v2" style={{ flex: 1, position: 'relative' }}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }} pointerEvents="none">
          <BackgroundStack background={layerBackground} palette={palette} />
        </View>
        <View style={{ flex: 1, zIndex: 1 }}>
          {rendered}
          {toastElement}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {rendered}
      {toastElement}
    </View>
  );
}
