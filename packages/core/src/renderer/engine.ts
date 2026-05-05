import type { Spec, Element, RenderNode } from '../types.js';
import type { Resolver } from '../expressions/resolver.js';
import type { PrimitiveRegistry } from './registry.js';
import { evaluateVisibility } from '../visibility/evaluator.js';
import type { ElementRegistry } from '../elements/composer.js';
import { expandElementToSpec, resolveElementProps } from '../elements/composer.js';
import { resolveTokens, type DesignTokens } from '../design/tokens.js';
import { scanDeps, createRenderCache } from './deps.js';
import { isOnLazyPath, getParsedLazyPaths, type ParsedLazyPath } from './lazy-paths.js';
import { PRIMITIVE_PROP_SCHEMAS } from './prop-schemas.js';
import { resolveVariant } from './variants.js';
import { mergeElementAnimations } from '../design/animation/cascade.js';
import type { ElementAnimations } from '../design/animation/types.js';

export interface RenderEngineConfig {
  resolver: Resolver;
  primitiveRegistry: PrimitiveRegistry;
  tokens?: Record<string, unknown>;
  elementRegistry?: ElementRegistry;
}

export interface RenderEngine {
  render: (spec: Spec, changedPaths?: Set<string>) => RenderNode;
}

export function createRenderEngine(config: RenderEngineConfig): RenderEngine {
  const { resolver, primitiveRegistry, tokens, elementRegistry } = config;

  // Selective re-render: dependency-tracked prop cache
  const renderCache = createRenderCache();
  let activeChangedPaths: Set<string> | undefined;

  // Task 19: Cache of previous mergedProps per custom-element instance (by elementId).
  // On each dispatch, diff with current mergedProps; for each changed key, add
  // /__prop/<name> to the active changed-paths set so inner-primitive caches
  // (which track $prop refs via scanDeps sentinels) invalidate.
  //
  // Diff uses SHALLOW reference equality — `prev[k] !== curr[k]`. This is
  // correct for scalar props (string/number/boolean). For object/array props
  // sourced from $state that produce new references each render, the diff
  // will over-invalidate (invalidate every render even when contents are
  // equal). A future deep-equality pass could narrow this, but the cost of
  // running structural comparisons on every dispatch may outweigh the benefit;
  // leave as shallow for now and revisit if profiling shows regressions.
  //
  // Eviction: cleared when handleInvisible fires for the elementId (the
  // element becomes hidden). Entry is rebuilt on the next visible render.
  const instancePropsCache = new Map<string, Record<string, unknown>>();
  // Track elements that returned null (hidden) in the previous render.
  // When they become visible again, their cache must be invalidated
  // because state may have changed while they were hidden.
  const hiddenElements = new Set<string>();

  // Selection context propagated from repeat.selection to child elements.
  // Set when entering a repeat with selection config, available to $selection expressions.
  let activeSelectionContext: { state: string; key: string; mode: 'single' | 'multiple' } | undefined;

  /** Resolve tokens with active theme mode (reads /preferences/theme from state) */
  function getActiveTokens(): Record<string, unknown> | undefined {
    if (!tokens) return undefined;
    const theme = resolver.resolve({ $state: '/preferences/theme' }) as string | undefined;
    if (theme && (tokens as DesignTokens).modes?.[theme]) {
      return resolveTokens(tokens as DesignTokens, theme);
    }
    return tokens;
  }

  /**
   * Resolve the identity-level animations for the cascade's top tier (plan
   * 3 Task 15). Reads `tokens.identity.animations` from the theme-active
   * token tree. Returns `undefined` when tokens are absent, identity is
   * absent, or the animations field is absent — all of which are
   * inheritance-neutral to the cascade (pass-through).
   *
   * Whole-field `null` coercion (M1 review fix): when
   * `tokens.identity.animations === null`, we coerce to `undefined` so the
   * cascade treats identity as not-participating (matches the decision
   * table's "whole-field null = inheritance-neutral" contract). Per-trigger
   * null inside a non-null object is preserved — those DO disable.
   */
  function getIdentityAnimations(): ElementAnimations | undefined {
    const activeTokens = getActiveTokens();
    if (!activeTokens) return undefined;
    const identity = (activeTokens as { identity?: { animations?: ElementAnimations | null } }).identity;
    if (!identity) return undefined;
    if (identity.animations === null) return undefined;
    return identity.animations;
  }

  /** Track $bindState paths found during prop resolution */
  const bindings = new Map<string, string>(); // propName → statePath
  let activeLazyPaths: ParsedLazyPath[] = [];

  /**
   * Deep resolver for expression trees. Single unified resolver that
   * collapsed what used to be three variants (resolveDeep +
   * resolveDeepWithContext + resolveDeepWithProps).
   *
   * Signature: `(value, propName?, propContext?, item?, index?)`.
   *
   * - `propName`: set only at top-level prop keys (drives $bindState
   *   tracking). Undefined for recursive/array positions.
   * - `propContext`: the mergedProps of the nearest enclosing custom
   *   element expansion, threaded so $prop expressions inside inner
   *   primitives resolve against the correct scope. Undefined outside
   *   any custom-element expansion.
   * - `item` / `index`: repeat context forwarded to $item / $index
   *   expressions.
   *
   * Param order is legacy from the pre-unification resolveDeep signature
   * (propName came first). A frequency-first reorder has been considered
   * but deferred — the current callers are stable and the noise is bounded.
   */
  function resolveDeep(
    value: unknown,
    propName?: string,
    propContext?: Record<string, unknown>,
    item?: unknown,
    index?: number,
    currentPath: (string | number)[] = [],
  ): unknown {
    if (value === null || value === undefined) return value;
    if (typeof value !== 'object') return value;
    if (Array.isArray(value)) {
      return value.map((v, i) => {
        const nextPath: (string | number)[] = [...currentPath, i];
        if (isOnLazyPath(nextPath, activeLazyPaths)) return v;
        return resolveDeep(v, undefined, propContext, item, index, nextPath);
      });
    }

    const obj = value as Record<string, unknown>;

    // Detect $bindState and track the binding path
    if ('$bindState' in obj && propName) {
      bindings.set(propName, obj.$bindState as string);
    }

    // If it has a $-key, it's an expression — resolve it with full context.
    const hasExprKey = Object.keys(obj).some((k) => k.startsWith('$'));
    if (hasExprKey) {
      return resolver.resolve(value, {
        item,
        index,
        props: propContext,
        selection: activeSelectionContext,
      });
    }

    // Otherwise, recurse
    const resolved: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      const nextPath: (string | number)[] = [...currentPath, k];
      if (isOnLazyPath(nextPath, activeLazyPaths)) {
        resolved[k] = v; // raw passthrough — dispatcher resolves at press time
        continue;
      }
      resolved[k] = resolveDeep(v, undefined, propContext, item, index, nextPath);
    }
    return resolved;
  }

  function isVisible(
    element: Element,
    item?: unknown,
    index?: number,
    propContext?: Record<string, unknown>,
  ): boolean {
    if (item !== undefined || propContext !== undefined) {
      return evaluateVisibility(element.visible, (expr) =>
        resolver.resolve(expr, {
          item,
          index,
          props: propContext,
          selection: activeSelectionContext,
        }),
      );
    }
    return evaluateVisibility(element.visible, (expr) => resolver.resolve(expr));
  }

  function resolvePropsWithContext(
    props: Record<string, unknown> | undefined,
    item?: unknown,
    index?: number,
    propContext?: Record<string, unknown>,
    lazyPaths: ParsedLazyPath[] = [],
  ): Record<string, unknown> {
    if (!props) return {};
    bindings.clear();
    activeLazyPaths = lazyPaths;
    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      if (value && typeof value === 'object' && '$bindState' in (value as Record<string, unknown>)) {
        bindings.set(key, (value as Record<string, unknown>).$bindState as string);
      }
      const nextPath: (string | number)[] = [key];
      if (isOnLazyPath(nextPath, activeLazyPaths)) {
        resolved[key] = value;
      } else {
        resolved[key] = resolveDeep(value, key, propContext, item, index, nextPath);
      }
    }
    activeLazyPaths = [];
    if (bindings.size > 0) resolved._bindings = Object.fromEntries(bindings);
    const activeTokens = getActiveTokens();
    if (activeTokens) resolved._tokens = activeTokens;
    return resolved;
  }

  /**
   * Handle invisible elements. If the element has motion.exit or motion.layoutId,
   * return an _exiting RenderNode so the renderer can use AnimatePresence.
   * Otherwise return null (instant unmount, current behavior).
   */
  function handleInvisible(
    elementId: string,
    element: Element,
    _spec: Spec,
    itemContext?: unknown,
    _indexContext?: number,
  ): RenderNode | null {
    hiddenElements.add(elementId);
    // Task 19: clear instancePropsCache entry so next render re-diffs from scratch
    // when the element becomes visible again.
    instancePropsCache.delete(elementId);

    const hasExitMotion = element.motion?.exit || element.motion?.layoutId;
    if (!hasExitMotion) return null;
    if (!primitiveRegistry.has(element.type)) return null;

    // Minimal props for exiting node — just enough for the exit animation
    const resolvedProps: Record<string, unknown> = {
      _exiting: true,
    };

    // Copy motion config directly (exit values are literals, not expressions)
    if (element.motion) {
      const motionResolved: Record<string, unknown> = {};
      if (element.motion.initial) motionResolved.initial = element.motion.initial;
      if (element.motion.animate) motionResolved.animate = element.motion.animate;
      if (element.motion.exit) motionResolved.exit = element.motion.exit;
      if (element.motion.transition) motionResolved.transition = element.motion.transition;
      if (element.motion.layoutId) motionResolved.layoutId = element.motion.layoutId;
      resolvedProps._motion = motionResolved;
    }

    const primitiveRenderer = primitiveRegistry.get(element.type);
    return primitiveRenderer(resolvedProps, []);
  }

  /**
   * Bundle carrying a consumer's instance-level declarations when rendering
   * the ROOT of a custom element expansion (Task 10). Applied once at the
   * root call — recursive calls to children do NOT receive outerOverride.
   */
  interface OuterInstanceOverride {
    animations?: ElementAnimations | null;
    variantAnimations?: ElementAnimations | null;
    hover?: Record<string, unknown>;
    active?: Record<string, unknown>;
    focus?: Record<string, unknown>;
    transition?: Record<string, unknown>;
    motion?: Element['motion'];
    style?: Record<string, unknown>;
    visible?: unknown; // Expression | boolean
    key?: unknown;
  }

  function renderElement(
    elementId: string,
    spec: Spec,
    itemContext?: unknown,
    indexContext?: number,
    propContext?: Record<string, unknown>,
    outerOverride?: OuterInstanceOverride,
  ): RenderNode | null {
    const element = spec.elements[elementId];
    if (!element) return null; // Missing element — skip silently

    try {
    return renderElementInner(elementId, element, spec, itemContext, indexContext, propContext, outerOverride);
    } catch (err) {
      return {
        type: '_error',
        props: {
          elementId,
          error: err instanceof Error ? err.message : String(err),
          originalType: element.type,
        },
        children: [],
      };
    }
  }

  function renderElementInner(
    elementId: string,
    element: Element,
    spec: Spec,
    itemContext?: unknown,
    indexContext?: number,
    propContext?: Record<string, unknown>,
    outerOverride?: OuterInstanceOverride,
  ): RenderNode | null {

    // Auto-visibility for modals/drawers: if no explicit visible condition,
    // bind to /ui/modals/{id} or /ui/drawers/{id} automatically.
    // Skip for root elements (test cases may use modal/drawer as root).
    if (element.visible === undefined && elementId !== spec.root) {
      if (element.type === 'modal') {
        const modalState = resolver.resolve({ $state: `/ui/modals/${elementId}` });
        if (!modalState) return handleInvisible(elementId, element, spec, itemContext, indexContext);
      } else if (element.type === 'drawer') {
        const drawerState = resolver.resolve({ $state: `/ui/drawers/${elementId}` });
        if (!drawerState) return handleInvisible(elementId, element, spec, itemContext, indexContext);
      }
    }

    // Apply outerOverride.visible: consumer's instance-level visibility gates the entire instance.
    // When outerOverride has visible defined, it wins over element.visible for this root call.
    const effectiveVisibleSource: Element = outerOverride?.visible !== undefined
      ? { ...element, visible: outerOverride.visible as Element['visible'] }
      : element;
    if (!isVisible(effectiveVisibleSource, itemContext, indexContext, propContext)) {
      return handleInvisible(elementId, effectiveVisibleSource, spec, itemContext, indexContext);
    }

    // Element is visible — if it was previously hidden, invalidate cache
    // so stale props (resolved with old state) are not reused.
    if (hiddenElements.has(elementId)) {
      hiddenElements.delete(elementId);
      renderCache.clear(elementId);
    }

    // --- Handle repeat (applies to all element types: primitives, custom elements, templates) ---
    // When an element has repeat, we render it once per item.
    // Returns a wrapper node whose children are the repeated items.
    // Each item gets its own render with $item/$index context.
    // Check this BEFORE custom element/template dispatch so repeat works uniformly.
    if (element.repeat && itemContext === undefined) {
      const repeat = element.repeat;
      let items: unknown[] = [];

      if (repeat.source) {
        const data = resolver.resolve(repeat.source as unknown);
        items = Array.isArray(data) ? data : [];
      } else if (repeat.statePath) {
        const data = resolver.resolve({ $state: repeat.statePath });
        items = Array.isArray(data) ? data : [];
      } else if (repeat.count) {
        const count = resolver.resolve(repeat.count) as number;
        items = Array.from({ length: count }, (_, i) => i);
      }

      const isClientGroupBy = typeof repeat.groupBy === 'string' && !repeat.groupKey;
      const isPreGrouped = typeof repeat.groupKey === 'string' && typeof repeat.groupItems === 'string';

      // --- GroupBy modes ---
      if (isClientGroupBy || isPreGrouped) {
        const allNodes: RenderNode[] = [];

        // Build groups
        interface GroupData { key: unknown; items: unknown[]; raw?: unknown }
        const groups: GroupData[] = [];

        if (isClientGroupBy) {
          // Client-side grouping: group flat items by field value
          const groupField = repeat.groupBy!;
          const groupMap = new Map<string, unknown[]>();
          const groupOrder: string[] = [];
          for (const item of items) {
            const keyVal = String((item as Record<string, unknown>)[groupField] ?? '');
            if (!groupMap.has(keyVal)) {
              groupMap.set(keyVal, []);
              groupOrder.push(keyVal);
            }
            groupMap.get(keyVal)!.push(item);
          }
          for (const keyVal of groupOrder) {
            groups.push({ key: keyVal, items: groupMap.get(keyVal)! });
          }
        } else {
          // Pre-grouped: each item in source IS a group object
          const groupKeyField = repeat.groupKey!;
          const groupItemsField = repeat.groupItems!;
          for (const groupObj of items) {
            const rec = groupObj as Record<string, unknown>;
            const key = rec[groupKeyField];
            const groupItems = Array.isArray(rec[groupItemsField]) ? rec[groupItemsField] as unknown[] : [];
            groups.push({ key, items: groupItems, raw: groupObj });
          }
        }

        // Render each group
        for (let gi = 0; gi < groups.length; gi++) {
          const group = groups[gi];
          const groupCtx = { key: group.key, items: group.items, index: gi, raw: group.raw };

          // Group header elements
          if (repeat.groupHeader) {
            for (const headerId of repeat.groupHeader) {
              const headerNode = renderElementWithGroup(headerId, spec, groupCtx);
              if (headerNode) {
                headerNode.key = `group-${gi}-header-${headerId}`;
                allNodes.push(headerNode);
              }
            }
          }

          // Iterate items with $item/$index context
          const children = element.children ?? [];
          for (let ii = 0; ii < group.items.length; ii++) {
            for (const childId of children) {
              const childNode = renderElement(childId, spec, group.items[ii], ii, propContext);
              if (childNode) {
                childNode.key = repeat.key
                  ? `group-${gi}-${String((group.items[ii] as Record<string, unknown>)?.[repeat.key] ?? ii)}`
                  : `group-${gi}-item-${ii}`;
                allNodes.push(childNode);
              }
            }
          }

          // Group footer elements
          if (repeat.groupFooter) {
            for (const footerId of repeat.groupFooter) {
              const footerNode = renderElementWithGroup(footerId, spec, groupCtx);
              if (footerNode) {
                footerNode.key = `group-${gi}-footer-${footerId}`;
                allNodes.push(footerNode);
              }
            }
          }
        }

        // Global footer (after all groups)
        if (repeat.footer) {
          for (const footerId of repeat.footer) {
            const footerNode = renderElement(footerId, spec, undefined, undefined, propContext);
            if (footerNode) {
              footerNode.key = `global-footer-${footerId}`;
              allNodes.push(footerNode);
            }
          }
        }

        const stackRenderer = primitiveRegistry.get('stack');
        const activeTokens4 = getActiveTokens();
        return stackRenderer({ direction: 'vertical', ...(activeTokens4 ? { _tokens: activeTokens4 } : {}) }, allNodes);
      }

      // --- Standard flat repeat (no groupBy) ---
      // Activate selection context for child elements if repeat has selection config
      const prevSelection = activeSelectionContext;
      if (repeat.selection) {
        activeSelectionContext = repeat.selection;
      }

      const repeatedNodes: RenderNode[] = [];
      for (let i = 0; i < items.length; i++) {
        const node = renderElement(elementId, spec, items[i], i, propContext);
        if (node) {
          node.key = repeat.key
            ? String((items[i] as Record<string, unknown>)?.[repeat.key] ?? i)
            : String(i);
          repeatedNodes.push(node);
        }
      }

      // Restore previous selection context
      activeSelectionContext = prevSelection;

      const stackRenderer = primitiveRegistry.get('stack');
      const activeTokens4 = getActiveTokens();
      return stackRenderer({ direction: 'vertical', ...(activeTokens4 ? { _tokens: activeTokens4 } : {}) }, repeatedNodes);
    }

    // --- Handle custom elements (Layer 3) ---
    // Dispatch a custom element type to the main render path via delegation
    // (plan custom-element-cascade Task 11).
    //
    // Pipeline:
    // 1. Resolve consumer props against the enclosing propContext (so nested
    //    custom elements can thread $prop references through).
    // 2. Look up variant: ElementDefinition.variants first, tokens.components
    //    as theme-level fallback.
    // 3. Merge variant.props + definition defaults + consumer props →
    //    mergedProps (consumer wins last).
    // 4. Expand the render tree to a flat spec, slotting consumer children
    //    at $children markers. Consumer children's original IDs appear in
    //    the expansion; merge the consumer child elements into the expanded
    //    spec so renderElement can find them during recursion. (Simplification
    //    note: consumer children render with mergedProps as propContext
    //    rather than the enclosing scope. This matters only when a consumer
    //    child uses $prop — uncommon enough to accept for Task 11 MVP.)
    // 5. Construct outerOverride carrying the consumer's instance-level fields
    //    (animations, interaction states, style, visible, key) + the variant's
    //    animations for the cascade's variant slot.
    // 6. Delegate to renderElement with propContext = mergedProps + outerOverride.
    if (!primitiveRegistry.has(element.type) && elementRegistry?.has(element.type)) {
      const definition = elementRegistry.get(element.type);
      const consumerRawProps = element.props ?? {};

      // 1. Resolve consumer props against enclosing propContext.
      const resolvedConsumerProps = resolvePropsWithContext(consumerRawProps, itemContext, indexContext, propContext);
      const { _bindings: _b, _tokens: _t, ...cleanConsumerProps } = resolvedConsumerProps;

      // 2. Variant lookup: ElementDefinition first, tokens.components fallback.
      const variantName = (cleanConsumerProps as Record<string, unknown>).variant as string | undefined;
      type ElementVariantResolved = {
        props?: Record<string, unknown>;
        style?: Record<string, unknown>;
        hover?: Record<string, unknown>;
        active?: Record<string, unknown>;
        focus?: Record<string, unknown>;
        transition?: Record<string, unknown>;
        animations?: ElementAnimations | null;
      };
      let variant: ElementVariantResolved | undefined;
      if (variantName) {
        const defVariant = (definition.variants as Record<string, ElementVariantResolved> | undefined)?.[variantName];
        const activeTokens = getActiveTokens();
        const themeVariant = (activeTokens as { components?: Record<string, { variants?: Record<string, ElementVariantResolved> }> })?.components?.[definition.type]?.variants?.[variantName];
        variant = defVariant ?? themeVariant;
        if (!variant && activeTokens) {
          console.warn(`[Mythik] Variant "${variantName}" not found for custom element "${definition.type}" (neither ElementDefinition.variants nor tokens.components)`);
        }
      }

      // 3. Merge: variant.props → definition defaults → consumer props (later wins).
      const propsWithVariant = {
        ...(variant?.props ?? {}),
        ...cleanConsumerProps,
      };
      const mergedProps = resolveElementProps(definition, propsWithVariant);

      // 4. Expand, slotting consumer children.
      const consumerChildrenIds = element.children ?? [];
      const expandedSpec = expandElementToSpec(definition, mergedProps, `${elementId}_el`, consumerChildrenIds);

      // Propagate spec.templates so template types used INSIDE a custom element's
      // render tree still resolve via the main template dispatch. Templates live at
      // spec scope, not custom-element scope — no shadowing concerns.
      if (spec.templates) {
        expandedSpec.templates = spec.templates;
      }

      // Propagate spec.elements (non-conflicting) so that:
      // - Consumer children IDs ($children marker slotted) resolve via the
      //   unified render path.
      // - Spec-level elements referenced by template children arrays
      //   (e.g. template.children: ['myId']) are findable during recursion.
      // expandedSpec.elements keys take priority — custom-element internals win
      // over any same-named spec element (avoids ID collision regressions).
      for (const [id, el] of Object.entries(spec.elements)) {
        if (!expandedSpec.elements[id]) {
          expandedSpec.elements[id] = el;
        }
      }

      // 5. Construct outerOverride for the expansion's root primitive.
      const outerOverride: OuterInstanceOverride = {
        animations: element.animations,
        variantAnimations: variant?.animations,
        hover: element.hover ?? variant?.hover,
        active: element.active ?? variant?.active,
        focus: element.focus ?? variant?.focus,
        transition: (element.transition ?? variant?.transition) as Record<string, unknown> | undefined,
        motion: element.motion,
        style: element.style ?? variant?.style,
        visible: element.visible as unknown,
        key: element.key,
      };

      // 6. Task 19: diff consumer props and inject /__prop/<name> sentinels
      // into activeChangedPaths so inner primitives with $prop deps invalidate.
      const prevMergedProps = instancePropsCache.get(elementId);
      let expandedChangedPaths: Set<string> | undefined;
      if (prevMergedProps) {
        const propChanged = new Set<string>();
        const allKeys = new Set([...Object.keys(prevMergedProps), ...Object.keys(mergedProps)]);
        for (const k of allKeys) {
          if (prevMergedProps[k] !== mergedProps[k]) {
            propChanged.add(`/__prop/${k}`);
          }
        }
        if (propChanged.size > 0) {
          expandedChangedPaths = new Set([...(activeChangedPaths ?? []), ...propChanged]);
        }
      }
      instancePropsCache.set(elementId, mergedProps);

      // Temporarily swap activeChangedPaths during the expansion render so
      // inner primitives see the augmented set.
      const prevActiveChangedPaths = activeChangedPaths;
      if (expandedChangedPaths) activeChangedPaths = expandedChangedPaths;

      try {
        return renderElement(
          expandedSpec.root,
          expandedSpec,
          itemContext,
          indexContext,
          mergedProps,
          outerOverride,
        );
      } finally {
        activeChangedPaths = prevActiveChangedPaths;
      }
    }

    // --- Handle spec-level templates (C.1) ---
    // If type is not a primitive and not a custom element, check spec.templates.
    // Templates are inline reusable element definitions with $prop parameterization.
    if (!primitiveRegistry.has(element.type) && spec.templates?.[element.type]) {
      const template = spec.templates[element.type];
      const consumerProps = element.props ?? {};

      // Resolve consumer props (they may contain $state, $item, etc.)
      const resolvedConsumerProps = resolvePropsWithContext(consumerProps, itemContext, indexContext, propContext);
      const { _bindings: _b, _tokens: _t, ...cleanConsumerProps } = resolvedConsumerProps;

      // Merge: consumer props override template defaults
      const mergedProps = { ...(template.defaults ?? {}), ...cleanConsumerProps };

      // Resolve template props with $prop context
      const templateProps = template.props ?? {};
      const resolvedTemplateProps: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(templateProps)) {
        resolvedTemplateProps[key] = resolveDeep(value, undefined, mergedProps, itemContext, indexContext);
      }

      // Resolve template style with $prop context
      if (template.style) {
        const resolvedStyle: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(template.style)) {
          resolvedStyle[key] = resolveDeep(value, undefined, mergedProps, itemContext, indexContext);
        }
        resolvedTemplateProps.style = resolvedStyle;
      }

      // Resolve template.animations with $prop context (plan 3 Task 13).
      // Three-branch semantics:
      //   - undefined (field absent): don't emit `animations` on the rendered
      //     props at all — cascade treats `undefined` as inheritance-neutral
      //     (pass-through from prior levels).
      //   - null (whole-field null): forwarded verbatim — cascade treats
      //     whole-field null as "this level contributes nothing", which is
      //     the cascade-neutral result. Preserving null here lets consumers
      //     distinguish "template explicitly null'd it" (for documentation
      //     intent) from "field absent" (inheritance) if they ever need to.
      //   - object: recurse via resolveDeep(propContext=mergedProps) so `$prop.X` inside
      //     recipe/duration/etc. is interpolated against mergedProps before
      //     the cascade merges across levels. Per-trigger `null` values are
      //     preserved through traversal (resolveDeep short-circuits on null).
      if ('animations' in template) {
        const anims = template.animations;
        if (anims === null) {
          resolvedTemplateProps.animations = null;
        } else if (anims !== undefined) {
          resolvedTemplateProps.animations = resolveDeep(
            anims,
            undefined,
            mergedProps,
            itemContext,
            indexContext,
          );
        }
      }

      // Cascade merge for the template branch (plan 3 Task 15): layer
      // identity.animations UNDER template.animations if identity is set.
      // Variant + element levels don't apply here — templates replace the
      // element.type at dispatch so there's no element.animations in-scope,
      // and variants are resolved in the regular (non-template) branch only.
      // A future task can extend this model to support variant+element on
      // template-based elements; for now, identity→template is the MVP.
      const identityAnimationsT = getIdentityAnimations();
      const templateAnimationsT = resolvedTemplateProps.animations as
        | Record<string, unknown>
        | null
        | undefined;
      // I2 review fix: also read element.animations on template-typed
      // elements. The consumer can declare a per-trigger override on the
      // element itself (e.g. `{ type: 'hero-card', animations: { hover:
      // null } }`), and per the cascade's decision table element wins over
      // template. Resolve expressions the same way the regular branch does.
      const rawElementAnimationsT = element.animations;
      const elementAnimationsT = rawElementAnimationsT === null || rawElementAnimationsT === undefined
        ? rawElementAnimationsT
        : resolveDeep(rawElementAnimationsT, undefined, propContext, itemContext, indexContext) as ElementAnimations | null | undefined;
      const cascadeTemplateHasAny =
        identityAnimationsT !== undefined ||
        templateAnimationsT !== undefined ||
        elementAnimationsT !== undefined;
      if (cascadeTemplateHasAny) {
        const mergedT = mergeElementAnimations({
          identity: identityAnimationsT,
          template: templateAnimationsT as ElementAnimations | null | undefined,
          element: elementAnimationsT,
        });
        // Emit merge result (object OR null) whenever at least one cascade
        // level contributed — matches the regular-branch emission rule for
        // cross-branch consistency.
        resolvedTemplateProps.animations = mergedT;
      } else {
        delete resolvedTemplateProps.animations;
      }

      const activeTokensT = getActiveTokens();
      if (activeTokensT) resolvedTemplateProps._tokens = activeTokensT;

      // Resolve children: handle $children marker
      const templateChildren = template.children ?? [];
      const childNodes: RenderNode[] = [];

      for (const childId of templateChildren) {
        if (childId === '$children') {
          // Replace with the consuming element's actual children
          const consumerChildren = element.children ?? [];
          for (const ccId of consumerChildren) {
            const ccNode = renderElement(ccId, spec, itemContext, indexContext, propContext);
            if (ccNode) childNodes.push(ccNode);
          }
        } else {
          // Pass template's mergedProps as propContext so $prop references inside
          // child elements (e.g. { content: { $prop: 'heading' } }) resolve
          // against the template's own prop values rather than the outer scope.
          const childNode = renderElement(childId, spec, itemContext, indexContext, mergedProps);
          if (childNode) childNodes.push(childNode);
        }
      }

      // If template has no children array but consuming element does, render consumer children
      if (templateChildren.length === 0 && element.children) {
        for (const ccId of element.children) {
          const ccNode = renderElement(ccId, spec, itemContext, indexContext, propContext);
          if (ccNode) childNodes.push(ccNode);
        }
      }

      // Render using the template's underlying primitive type
      if (!primitiveRegistry.has(template.type)) {
        return {
          type: '_error',
          props: { elementId, error: `Template "${element.type}" references unknown primitive "${template.type}"`, originalType: element.type },
          children: [],
        };
      }

      const templateRenderer = primitiveRegistry.get(template.type);
      return templateRenderer(resolvedTemplateProps, childNodes);
    }

    if (!primitiveRegistry.has(element.type)) {
      return {
        type: '_error',
        props: { elementId, error: `No primitive registered for type "${element.type}"`, originalType: element.type },
        children: [],
      };
    }

    // --- Standard render (or repeat iteration with item context) ---
    // Skip caching for elements inside repeat — their props depend on item context
    // which changes whenever the repeat source array changes.
    const skipCache = itemContext !== undefined;
    const cacheKey = skipCache ? '' : elementId;
    let resolvedProps: Record<string, unknown>;

    if (!skipCache && activeChangedPaths && renderCache.get(cacheKey)) {
      if (!renderCache.isDirtyForPaths(cacheKey, activeChangedPaths)) {
        // Element is clean — reuse cached props (same object reference)
        resolvedProps = renderCache.get(cacheKey)!;
      } else {
        // Element is dirty — re-resolve and update cache
        const schema = PRIMITIVE_PROP_SCHEMAS[element.type as string];
        const lazyPaths = getParsedLazyPaths(element.type as string, schema?.lazyActionPaths);
        resolvedProps = resolvePropsWithContext(element.props, itemContext, indexContext, propContext, lazyPaths);
        const deps = scanDeps(element.props, lazyPaths);
        if (element.style) for (const d of scanDeps(element.style)) deps.add(d);
        if (element.visible !== undefined && element.visible !== true && element.visible !== false) {
          for (const d of scanDeps({ _vis: element.visible })) deps.add(d);
        }
        // Scan interaction fields for state/token dependencies
        if (element.hover) for (const d of scanDeps(element.hover)) deps.add(d);
        if (element.active) for (const d of scanDeps(element.active)) deps.add(d);
        if (element.focus) for (const d of scanDeps(element.focus)) deps.add(d);
        if (element.transition) for (const d of scanDeps(element.transition)) deps.add(d);
        if (element.motion) for (const d of scanDeps(element.motion)) deps.add(d);
        // I1 review fix: animations field may contain $state/$cond/$token
        // expressions; without this scan, state changes deep inside an
        // animation config wouldn't dirty the render cache and the cascade
        // would re-merge stale resolved values.
        if (element.animations) for (const d of scanDeps(element.animations)) deps.add(d);
        renderCache.set(cacheKey, resolvedProps, deps);
      }
    } else {
      // Full render (first render or no changedPaths) — resolve and cache
      const schema = PRIMITIVE_PROP_SCHEMAS[element.type as string];
      const lazyPaths = getParsedLazyPaths(element.type as string, schema?.lazyActionPaths);
      resolvedProps = resolvePropsWithContext(element.props, itemContext, indexContext, propContext, lazyPaths);
      if (!skipCache) {
        const deps = scanDeps(element.props, lazyPaths);
        if (element.style) for (const d of scanDeps(element.style)) deps.add(d);
        if (element.visible !== undefined && element.visible !== true && element.visible !== false) {
          for (const d of scanDeps({ _vis: element.visible })) deps.add(d);
        }
        // Scan interaction fields for state/token dependencies
        if (element.hover) for (const d of scanDeps(element.hover)) deps.add(d);
        if (element.active) for (const d of scanDeps(element.active)) deps.add(d);
        if (element.focus) for (const d of scanDeps(element.focus)) deps.add(d);
        if (element.transition) for (const d of scanDeps(element.transition)) deps.add(d);
        if (element.motion) for (const d of scanDeps(element.motion)) deps.add(d);
        if (element.animations) for (const d of scanDeps(element.animations)) deps.add(d);
        renderCache.set(cacheKey, resolvedProps, deps);
      }
    }

    // Resolve element-level style (separate from props.style)
    // Element.style may contain $token, $state, $cond expressions that need resolution.
    if (element.style) {
      const resolvedStyle: Record<string, unknown> = {};
      for (const [sk, sv] of Object.entries(element.style)) {
        resolvedStyle[sk] = resolveDeep(sv, undefined, propContext, itemContext, indexContext);
      }
      resolvedProps.style = resolvedStyle;
    }

    // Apply outerOverride.style: merges on top of element.style (consumer wins last).
    if (outerOverride?.style) {
      resolvedProps.style = { ...(resolvedProps.style as Record<string, unknown> ?? {}), ...outerOverride.style };
    }

    // --- Variant resolution ---
    // If element has props.variant, look up variant definition in tokens.components
    // and merge as base (element-level definitions override)
    const variantName = resolvedProps.variant as string | undefined;
    let variantHoverBase: Record<string, unknown> | undefined;
    let variantActiveBase: Record<string, unknown> | undefined;
    let variantFocusBase: Record<string, unknown> | undefined;
    let variantTransitionBase: Record<string, unknown> | undefined;
    // Cascade animation levels (plan 3 Task 15): capture what the variant
    // contributes so the post-variant cascade-merge block can consume it.
    // Distinguished from resolvedProps.* because animation cascade is its
    // own merge strategy (per-trigger null semantics) — NOT the simple
    // base-then-override that style/hover use.
    let variantAnimations: Record<string, unknown> | null | undefined = undefined;
    let variantAnimationsSet = false;
    if (variantName) {
      const activeTokens = getActiveTokens();
      const variant = resolveVariant(element.type, variantName, activeTokens as Record<string, unknown>);
      if (variant) {
        if ('animations' in variant) {
          variantAnimations = variant.animations;
          variantAnimationsSet = true;
        }
        // Style: variant is base, element overrides
        if (variant.style) {
          resolvedProps.style = { ...variant.style, ...(resolvedProps.style as Record<string, unknown> ?? {}) };
        }
        // Store variant interaction bases for merging after element-level resolution
        if (variant.hover) {
          if (element.hover) {
            variantHoverBase = variant.hover;
          } else {
            resolvedProps._hover = variant.hover;
          }
        }
        if (variant.active) {
          if (element.active) {
            variantActiveBase = variant.active;
          } else {
            resolvedProps._active = variant.active;
          }
        }
        if (variant.focus) {
          if (element.focus) {
            variantFocusBase = variant.focus;
          } else {
            resolvedProps._focus = variant.focus;
          }
        }
        if (variant.transition) {
          if (element.transition) {
            variantTransitionBase = variant.transition;
          } else {
            resolvedProps._transition = variant.transition;
          }
        }
      } else if (activeTokens && (activeTokens as Record<string, unknown>).components) {
        console.warn(`[Mythik] Variant "${variantName}" not found for type "${element.type}" in tokens.components`);
      }
    }

    // --- Animation cascade merge (plan 3 Task 15 + custom-element-cascade Task 10) ---
    // Merge identity.animations + variant.animations + elementDef.animations + element.animations
    // (template.animations is handled in the separate template branch above,
    // where this same merge is layered into `resolvedTemplateProps`).
    //
    // Merge semantics are the cascade's per-trigger null-semantics (NOT the
    // simple base-then-override of style/hover). See mergeElementAnimations
    // + cascade test suite for the decision table.
    //
    // Expression resolution (C1/I1 review fix): element.animations is
    // resolved via resolveDeep (unified helper) BEFORE the cascade
    // merge so `$state`/`$cond`/`$token`/`$prop` expressions inside the
    // animation tree resolve to concrete values. Without this the raw
    // expression objects would flow to the animation engine which can't
    // interpret them, silently producing broken specs. Matches Task 13's
    // template-path handling.
    //
    // Emission rule: always set (or clear) resolvedProps.animations. When
    // any cascade level contributed non-undefined, emit the merge result.
    // When NO level contributed, DELETE the key — this is the I4 cache-
    // leak fix: the cached `resolvedProps` could otherwise retain an old
    // render's animations after a theme/spec change that removed every
    // contribution.
    //
    // Task 10 cascade semantics:
    // When rendering INSIDE a custom element expansion (propContext defined):
    //   - element.animations came from the author's render-tree declaration → elementDef slot.
    //   - outerOverride.animations (if set) is the consumer's instance-level override → element slot.
    //   - outerOverride.variantAnimations (if set) is the custom-element's variant → variant slot.
    // When rendering OUTSIDE any custom element expansion (propContext undefined):
    //   - element.animations is the consumer's spec-level declaration → element slot.
    //   - variant slot comes from resolveVariant (variantAnimations variable — existing behavior).
    //   - elementDef slot stays undefined (no custom element expansion active).
    const isExpandedInCustomElement = propContext !== undefined;

    const identityAnimations = getIdentityAnimations();
    const rawElementAnimations = element.animations;
    const resolvedElementAnimations = rawElementAnimations === null || rawElementAnimations === undefined
      ? rawElementAnimations
      : resolveDeep(rawElementAnimations, undefined, propContext, itemContext, indexContext) as ElementAnimations | null | undefined;

    const elementDefLevel = isExpandedInCustomElement ? resolvedElementAnimations : undefined;
    const elementLevel = isExpandedInCustomElement
      ? outerOverride?.animations
      : resolvedElementAnimations;
    const variantLevel = isExpandedInCustomElement && outerOverride?.variantAnimations !== undefined
      ? outerOverride.variantAnimations
      : (variantAnimations as ElementAnimations | null | undefined);

    const cascadeHasAnyLevel =
      identityAnimations !== undefined ||
      variantAnimationsSet ||
      variantLevel !== undefined ||
      elementDefLevel !== undefined ||
      elementLevel !== undefined;

    if (cascadeHasAnyLevel) {
      const merged = mergeElementAnimations({
        identity: identityAnimations,
        variant: variantLevel,
        elementDef: elementDefLevel,
        element: elementLevel,
      });
      resolvedProps.animations = merged;
    } else {
      delete resolvedProps.animations;
    }

    // Resolve interactive states (hover, active, focus, transition, motion)
    // These are passed to the renderer which wraps in Motion components.
    // Use resolveDeep (not resolvePropsWithContext) to avoid injecting _tokens/_bindings metadata.
    function resolveInteractionField(field: Record<string, unknown>): Record<string, unknown> {
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(field)) {
        result[k] = resolveDeep(v, undefined, propContext, itemContext, indexContext);
      }
      return result;
    }

    // Interaction field resolution — consumer outerOverride merges ON TOP (consumer wins last).
    if (element.hover || outerOverride?.hover) {
      const base = element.hover ? resolveInteractionField(element.hover) : {};
      const withVariant = variantHoverBase ? { ...variantHoverBase, ...base } : base;
      resolvedProps._hover = outerOverride?.hover
        ? { ...withVariant, ...outerOverride.hover }
        : withVariant;
    }
    if (element.active || outerOverride?.active) {
      const base = element.active ? resolveInteractionField(element.active) : {};
      const withVariant = variantActiveBase ? { ...variantActiveBase, ...base } : base;
      resolvedProps._active = outerOverride?.active
        ? { ...withVariant, ...outerOverride.active }
        : withVariant;
    }
    if (element.focus || outerOverride?.focus) {
      const base = element.focus ? resolveInteractionField(element.focus) : {};
      const withVariant = variantFocusBase ? { ...variantFocusBase, ...base } : base;
      resolvedProps._focus = outerOverride?.focus
        ? { ...withVariant, ...outerOverride.focus }
        : withVariant;
    }
    if (element.transition || outerOverride?.transition) {
      const base = element.transition ? resolveInteractionField(element.transition as Record<string, unknown>) : {};
      const withVariant = variantTransitionBase ? { ...variantTransitionBase, ...base } : base;
      resolvedProps._transition = outerOverride?.transition
        ? { ...withVariant, ...outerOverride.transition }
        : withVariant;
    }
    if (element.motion || outerOverride?.motion) {
      const motionResolved: Record<string, unknown> = {};
      if (element.motion) {
        if (element.motion.initial) motionResolved.initial = resolveInteractionField(element.motion.initial);
        if (element.motion.animate) motionResolved.animate = resolveInteractionField(element.motion.animate);
        if (element.motion.exit) motionResolved.exit = resolveInteractionField(element.motion.exit);
        if (element.motion.transition) motionResolved.transition = resolveInteractionField(element.motion.transition as Record<string, unknown>);
        if (element.motion.layoutId) motionResolved.layoutId = element.motion.layoutId;
      }
      // Consumer overrides each sub-field if specified — consumer wins last.
      if (outerOverride?.motion) {
        if (outerOverride.motion.initial) motionResolved.initial = outerOverride.motion.initial;
        if (outerOverride.motion.animate) motionResolved.animate = outerOverride.motion.animate;
        if (outerOverride.motion.exit) motionResolved.exit = outerOverride.motion.exit;
        if (outerOverride.motion.transition) motionResolved.transition = outerOverride.motion.transition;
        if (outerOverride.motion.layoutId) motionResolved.layoutId = outerOverride.motion.layoutId;
      }
      resolvedProps._motion = motionResolved;
    }

    // Resolve event bindings. Two concerns:
    //   1. A binding can itself be a `$prop` expression (custom-element render
    //      trees passing consumer-supplied action chains). Resolve ONLY that
    //      outer shape — inner $state/$template stay lazy for press-time.
    //   2. When inside a repeat, inner action params referencing `$item` must
    //      resolve eagerly with the row's item context.
    if (element.on) {
      const needsItemResolution = itemContext !== undefined;
      const resolvedOn: Record<string, unknown> = {};
      for (const [event, rawBinding] of Object.entries(element.on)) {
        // Step 1: if the binding itself is a $prop expression, resolve it now.
        //         Anything else (plain object, array of actions, transaction)
        //         is passed through — the action dispatcher / transaction
        //         engine handle inner $state/$template at press time.
        const isPropBinding =
          rawBinding !== null &&
          typeof rawBinding === 'object' &&
          !Array.isArray(rawBinding) &&
          '$prop' in (rawBinding as unknown as Record<string, unknown>);
        const binding = isPropBinding
          ? resolveDeep(rawBinding, undefined, propContext, itemContext, indexContext)
          : rawBinding;

        // TransactionBinding: pass through as-is (resolved by transaction engine).
        if (binding && typeof binding === 'object' && !Array.isArray(binding) && 'transaction' in (binding as Record<string, unknown>)) {
          resolvedOn[event] = binding;
          continue;
        }

        // Outside a repeat: zero-cost passthrough. The action dispatcher
        // resolves inner expressions at press time.
        if (!needsItemResolution) {
          resolvedOn[event] = binding;
          continue;
        }

        // Inside a repeat: resolve each action's params eagerly so `$item`
        // binds to the row's data. Preserve ALL binding properties
        // (fireAndForget, etc.) — only params are re-resolved.
        const bindings = Array.isArray(binding) ? binding : [binding];
        resolvedOn[event] = bindings.map((b: Record<string, unknown>) => {
          if (!b.params || typeof b.params !== 'object') return b;
          return {
            ...b,
            params: Object.fromEntries(
              Object.entries(b.params as Record<string, unknown>).map(
                ([k, v]) => [k, resolveDeep(v, undefined, propContext, itemContext, indexContext)],
              ),
            ),
          };
        });
      }
      resolvedProps._eventBindings = resolvedOn;
    }

    const children: RenderNode[] = [];
    if (element.children) {
      for (const childId of element.children) {
        const childElement = spec.elements[childId];
        // If child has repeat, let it handle its own iteration
        if (childElement?.repeat) {
          const childNode = renderElement(childId, spec, undefined, undefined, propContext);
          if (childNode) children.push(childNode);
        } else if (itemContext !== undefined) {
          // Pass item context down to children
          const childNode = renderElement(childId, spec, itemContext, indexContext, propContext);
          if (childNode) children.push(childNode);
        } else {
          const childNode = renderElement(childId, spec, undefined, undefined, propContext);
          if (childNode) children.push(childNode);
        }
      }
    }

    // Pass elementId for CSS className generation (unique per element)
    resolvedProps._elementId = elementId;

    const primitiveRenderer = primitiveRegistry.get(element.type);
    const node = primitiveRenderer(resolvedProps, children);

    // Propagate element-level key (supports expressions like $template, $state, $prop)
    if (element.key !== undefined) {
      const resolvedKey = resolveDeep(element.key, undefined, propContext, itemContext, indexContext);
      if (resolvedKey !== undefined && resolvedKey !== null) {
        node.key = String(resolvedKey);
      }
    }

    // Apply outerOverride.key: consumer's instance-level key wins over element.key.
    if (outerOverride?.key !== undefined) {
      const resolvedOverrideKey = resolveDeep(outerOverride.key, undefined, propContext, itemContext, indexContext);
      if (resolvedOverrideKey !== undefined && resolvedOverrideKey !== null) {
        node.key = String(resolvedOverrideKey);
      }
    }

    return node;
  }

  /**
   * Render an element with $group context (for groupBy headers/footers).
   * Resolves all expressions with group context available.
   */
  function renderElementWithGroup(
    elementId: string,
    spec: Spec,
    groupCtx: { key: unknown; items: unknown[]; index: number; raw?: unknown },
  ): RenderNode | null {
    const element = spec.elements[elementId];
    if (!element) return null;
    if (!primitiveRegistry.has(element.type)) return null;

    // Resolve props with group context
    const props = element.props ?? {};
    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      if (value && typeof value === 'object') {
        const hasExprKey = Object.keys(value as Record<string, unknown>).some((k) => k.startsWith('$'));
        if (hasExprKey) {
          resolved[key] = resolver.resolve(value, { group: groupCtx });
        } else {
          // Recurse into nested objects
          const inner: Record<string, unknown> = {};
          for (const [ik, iv] of Object.entries(value as Record<string, unknown>)) {
            if (iv && typeof iv === 'object') {
              const hasInnerExpr = Object.keys(iv as Record<string, unknown>).some((k) => k.startsWith('$'));
              inner[ik] = hasInnerExpr ? resolver.resolve(iv, { group: groupCtx }) : iv;
            } else {
              inner[ik] = iv;
            }
          }
          resolved[key] = inner;
        }
      } else {
        resolved[key] = value;
      }
    }

    // Resolve style with group context
    if (element.style) {
      const resolvedStyle: Record<string, unknown> = {};
      for (const [sk, sv] of Object.entries(element.style)) {
        if (sv && typeof sv === 'object') {
          const hasExprKey = Object.keys(sv as Record<string, unknown>).some((k) => k.startsWith('$'));
          resolvedStyle[sk] = hasExprKey ? resolver.resolve(sv, { group: groupCtx }) : sv;
        } else {
          resolvedStyle[sk] = sv;
        }
      }
      resolved.style = resolvedStyle;
    } else if (element.style === undefined && props.style === undefined) {
      // No style
    }

    const activeTokens5 = getActiveTokens();
    if (activeTokens5) resolved._tokens = activeTokens5;

    // Render children
    const children: RenderNode[] = [];
    if (element.children) {
      for (const childId of element.children) {
        const childNode = renderElementWithGroup(childId, spec, groupCtx);
        if (childNode) children.push(childNode);
      }
    }

    const primitiveRenderer = primitiveRegistry.get(element.type);
    return primitiveRenderer(resolved, children);
  }

  function render(spec: Spec, changedPaths?: Set<string>): RenderNode {
    if (!spec.elements[spec.root]) {
      throw new Error(`Root element "${spec.root}" not found in spec`);
    }

    activeChangedPaths = changedPaths;
    const result = renderElement(spec.root, spec);
    activeChangedPaths = undefined;

    if (result === null) {
      throw new Error(`Root element "${spec.root}" is hidden — cannot render`);
    }
    return result;
  }

  return { render };
}
