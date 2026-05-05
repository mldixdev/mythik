import type {
  Spec,
  Element,
  RenderNode,
  ResolverContext,
  Expression,
  TransitionConfig,
  MotionAnimationConfig,
} from '../types.js';
import type { ElementAnimations } from '../design/animation/types.js';

/**
 * An Element Definition describes a reusable custom element
 * composed from primitives. This is Layer 3 of Mythik.
 */
export interface ElementDefinition {
  type: string;
  props: Record<string, PropDefinition>;
  /**
   * Optional variants declared by the author. Consumer's `props.variant`
   * resolves against (a) this field first, (b) `tokens.components[type].variants`
   * as theme-level fallback.
   * Dispatch-time lookup: plan custom-element-cascade Task 11 (variant dispatch).
   */
  variants?: Record<string, ElementVariantSpec>;
  render: ElementRenderNode;
}

/**
 * Variant spec shape on an ElementDefinition — parallel to the variant spec
 * the renderer consumes from `tokens.components[type].variants[name]`.
 *
 * Fields mirror Element's declarative surface: style/hover/active/focus/
 * transition participate in the interaction cascade; animations participate
 * in the animation cascade's variant slot; props merge into the consumer's
 * props before expansion (variant underlays consumer — consumer wins last).
 *
 * Type-precision note: `transition` uses strict `TransitionConfig` and
 * `animations` uses strict `ElementAnimations | null` here (Element parity),
 * whereas the runtime-side `ResolvedVariant` (from tokens.components) uses
 * looser `Record<string, unknown>` shapes because it post-processes $path
 * token references. Dispatch-time fallback (plan custom-element-cascade
 * Task 11) must normalize both shapes before feeding the cascade.
 */
export interface ElementVariantSpec {
  props?: Record<string, unknown>;
  style?: Record<string, unknown>;
  hover?: Record<string, unknown>;
  active?: Record<string, unknown>;
  focus?: Record<string, unknown>;
  transition?: TransitionConfig;
  animations?: ElementAnimations | null;
}

export interface PropDefinition {
  type: 'string' | 'number' | 'boolean' | 'enum' | 'object' | 'array';
  default?: unknown;
  values?: string[]; // For enum type
  bindable?: boolean;
}

/**
 * A render node within an element definition.
 * Similar to Element but uses $prop references and can be nested (not flat tree).
 *
 * Field parity with Element (plan custom-element-cascade Task 1): authors can
 * declare the full set of fields a primitive supports. Consumers reach the
 * OUTER primitive only (see spec §Black box); internal primitives are the
 * author's domain and receive identity cascade + their own declarations here.
 */
export interface ElementRenderNode {
  type: string;
  props?: Record<string, unknown>;
  style?: Record<string, unknown>;
  children?: Array<ElementRenderNode | '$children'>;
  // Behavior:
  visible?: Expression | boolean;
  repeat?: { count?: unknown; statePath?: string; key?: string };
  on?: Record<string, unknown>;
  // Interaction:
  hover?: Record<string, unknown>;
  active?: Record<string, unknown>;
  focus?: Record<string, unknown>;
  transition?: TransitionConfig;
  // Motion + Animation:
  motion?: MotionAnimationConfig;
  animations?: ElementAnimations | null;
  // Meta:
  key?: unknown;
}

export interface ElementRegistry {
  register: (definition: ElementDefinition) => void;
  has: (type: string) => boolean;
  get: (type: string) => ElementDefinition;
  getAll: () => Map<string, ElementDefinition>;
}

/**
 * Create a registry for custom element definitions.
 */
export function createElementRegistry(): ElementRegistry {
  const elements = new Map<string, ElementDefinition>();

  return {
    register(definition: ElementDefinition): void {
      elements.set(definition.type, definition);
    },
    has(type: string): boolean {
      return elements.has(type);
    },
    get(type: string): ElementDefinition {
      const def = elements.get(type);
      if (!def) throw new Error(`Element "${type}" is not registered`);
      return def;
    },
    getAll(): Map<string, ElementDefinition> {
      return new Map(elements);
    },
  };
}

/**
 * Resolve default props — merge consumer-provided props with defaults from the definition.
 */
export function resolveElementProps(
  definition: ElementDefinition,
  consumerProps: Record<string, unknown>,
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};

  for (const [name, propDef] of Object.entries(definition.props)) {
    if (name in consumerProps) {
      resolved[name] = consumerProps[name];
    } else if (propDef.default !== undefined) {
      resolved[name] = propDef.default;
    }
  }

  // Also pass through any extra props not in the definition
  for (const [name, value] of Object.entries(consumerProps)) {
    if (!(name in resolved)) {
      resolved[name] = value;
    }
  }

  return resolved;
}

/**
 * Expand an element definition's render tree into a flat Spec.
 *
 * `consumerChildrenIds` is a list of already-expanded consumer child element
 * IDs (from the parent spec). When the render tree contains the `$children`
 * marker, these IDs are spliced in at that position. When the marker is
 * absent, the consumer children are not injected (they're ignored — matches
 * template semantics where no `$children` = template replaces the rendered
 * content entirely).
 *
 * Multiple `$children` markers in a single children array are supported —
 * each is replaced with the consumer children in order.
 *
 * The marker is recognized at every nesting level of the render tree.
 */
export function expandElementToSpec(
  definition: ElementDefinition,
  consumerProps: Record<string, unknown>,
  idPrefix: string = 'el',
  consumerChildrenIds: string[] = [],
): Spec {
  const elements: Record<string, Element> = {};
  let idCounter = 0;

  function nextId(): string {
    return `${idPrefix}_${idCounter++}`;
  }

  function expandNode(node: ElementRenderNode): string {
    const id = nextId();
    const element: Element = {
      type: node.type,
      props: { ...node.props },
      style: node.style,
      on: node.on as Element['on'],
    };

    if (node.repeat) {
      element.repeat = node.repeat as Element['repeat'];
    }

    // Feature-parity fields (plan custom-element-cascade Task 4).
    // Each field copied exactly when present — `undefined` vs absent is
    // preserved by not-assigning so downstream cascade semantics remain
    // correct (undefined = inheritance-neutral).
    //
    // Copy semantics: by-reference (consistent with style/on/repeat above).
    // `props` above is the sole field that's shallow-cloned. Unifying copy
    // semantics across all fields is a separate refactor — do NOT mutate
    // these objects on the registered definition after registration.
    // Behavior
    if (node.visible !== undefined) element.visible = node.visible;
    // Interaction
    if (node.hover !== undefined) element.hover = node.hover;
    if (node.active !== undefined) element.active = node.active;
    if (node.focus !== undefined) element.focus = node.focus;
    if (node.transition !== undefined) element.transition = node.transition;
    // Motion + Animation
    if (node.motion !== undefined) element.motion = node.motion;
    if (node.animations !== undefined) element.animations = node.animations;
    // Meta
    if (node.key !== undefined) element.key = node.key;

    if (node.children && node.children.length > 0) {
      // '$children' markers in the render tree splice the consumer's
      // already-expanded child IDs at that position. Multiple markers
      // splice once each. Absent markers drop the consumer children.
      // See plan custom-element-cascade Task 5.
      const expanded: string[] = [];
      for (const child of node.children) {
        if (child === '$children') {
          expanded.push(...consumerChildrenIds);
        } else {
          expanded.push(expandNode(child));
        }
      }
      if (expanded.length > 0) element.children = expanded;
    }

    elements[id] = element;
    return id;
  }

  const rootId = expandNode(definition.render);

  return { root: rootId, elements };
}
