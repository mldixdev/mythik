import { describe, it, expect } from 'vitest';
import {
  createElementRegistry,
  resolveElementProps,
  expandElementToSpec,
  type ElementDefinition,
} from '../../src/elements/composer.js';
import { createMythik } from '../../src/factory.js';
import type { Spec } from '../../src/types.js';

describe('Element Composition (Layer 3)', () => {
  const ratingStars: ElementDefinition = {
    type: 'rating-stars',
    props: {
      max: { type: 'number', default: 5 },
      value: { type: 'number', bindable: true },
      label: { type: 'string' },
      size: { type: 'enum', values: ['sm', 'md', 'lg'], default: 'md' },
    },
    render: {
      type: 'stack',
      props: { direction: 'vertical', gap: 8 },
      children: [
        { type: 'text', props: { content: { $prop: 'label' } } },
        {
          type: 'stack',
          props: { direction: 'horizontal', gap: 4 },
          children: [
            { type: 'icon', props: { name: 'star', size: 24 } },
          ],
        },
      ],
    },
  };

  const statusBadge: ElementDefinition = {
    type: 'status-badge',
    props: {
      status: { type: 'enum', values: ['active', 'inactive', 'pending'], default: 'active' },
      label: { type: 'string' },
    },
    render: {
      type: 'box',
      props: {
        style: {
          padding: '4px 12px',
          borderRadius: 12,
          display: 'inline-flex',
        },
      },
      children: [
        { type: 'text', props: { content: { $prop: 'label' } } },
      ],
    },
  };

  describe('ElementRegistry', () => {
    it('registers and retrieves element definitions', () => {
      const registry = createElementRegistry();
      registry.register(ratingStars);
      expect(registry.has('rating-stars')).toBe(true);
      expect(registry.get('rating-stars').type).toBe('rating-stars');
    });

    it('throws for unregistered element', () => {
      const registry = createElementRegistry();
      expect(() => registry.get('unknown')).toThrow('Element "unknown" is not registered');
    });

    it('lists all registered elements', () => {
      const registry = createElementRegistry();
      registry.register(ratingStars);
      registry.register(statusBadge);
      expect(registry.getAll().size).toBe(2);
    });
  });

  describe('resolveElementProps', () => {
    it('applies defaults for missing props', () => {
      const resolved = resolveElementProps(ratingStars, { label: 'Rate this' });
      expect(resolved.max).toBe(5);
      expect(resolved.size).toBe('md');
      expect(resolved.label).toBe('Rate this');
    });

    it('consumer props override defaults', () => {
      const resolved = resolveElementProps(ratingStars, { max: 10, size: 'lg', label: 'Score' });
      expect(resolved.max).toBe(10);
      expect(resolved.size).toBe('lg');
    });

    it('passes through extra props not in definition', () => {
      const resolved = resolveElementProps(ratingStars, { label: 'Test', extraProp: 'hello' });
      expect(resolved.extraProp).toBe('hello');
    });
  });

  describe('expandElementToSpec', () => {
    it('expands nested render tree to flat spec', () => {
      const spec = expandElementToSpec(ratingStars, { label: 'Rate' });
      expect(spec.root).toBeDefined();
      expect(Object.keys(spec.elements).length).toBe(4); // stack > text + stack > icon
    });

    it('root element has correct type', () => {
      const spec = expandElementToSpec(ratingStars, {});
      const root = spec.elements[spec.root];
      expect(root.type).toBe('stack');
    });

    it('preserves $prop references in expanded spec', () => {
      const spec = expandElementToSpec(ratingStars, {});
      // Find the text element with $prop reference
      const textEl = Object.values(spec.elements).find(
        (el) => el.type === 'text' && el.props?.content && typeof el.props.content === 'object',
      );
      expect(textEl).toBeDefined();
      expect((textEl!.props!.content as Record<string, unknown>).$prop).toBe('label');
    });

    it('children are properly linked by IDs', () => {
      const spec = expandElementToSpec(statusBadge, { label: 'Active' });
      const root = spec.elements[spec.root];
      expect(root.children).toHaveLength(1);
      const childId = root.children![0];
      expect(spec.elements[childId]).toBeDefined();
      expect(spec.elements[childId].type).toBe('text');
    });
  });

  describe('$prop integration with resolver', () => {
    it('resolves $prop when props context is provided to resolver', () => {
      const svc = createMythik({ initialState: {} });

      // $prop resolves when context has props
      const result = svc.resolver.resolve(
        { $prop: 'label' },
        { props: { label: 'Patient Rating', max: 5 } },
      );
      expect(result).toBe('Patient Rating');
    });

    it('expanded spec structure is valid for rendering', () => {
      const spec = expandElementToSpec(ratingStars, { label: 'Patient Rating', max: 5 });

      // Verify the spec is structurally valid
      expect(spec.root).toBeDefined();
      expect(spec.elements[spec.root]).toBeDefined();
      expect(spec.elements[spec.root].type).toBe('stack');

      // All child IDs reference existing elements
      const allIds = Object.keys(spec.elements);
      for (const el of Object.values(spec.elements)) {
        if (el.children) {
          for (const childId of el.children) {
            expect(allIds).toContain(childId);
          }
        }
      }
    });
  });

  describe('element used in a screen spec', () => {
    it('expanded element can be merged into a larger spec', () => {
      const elementSpec = expandElementToSpec(statusBadge, { label: 'Active' }, 'badge');

      // Create a screen spec that includes the expanded element
      const screenSpec: Spec = {
        root: 'page',
        elements: {
          page: {
            type: 'stack',
            props: { direction: 'vertical' },
            children: ['title', elementSpec.root],
          },
          title: {
            type: 'text',
            props: { content: 'User Profile' },
          },
          // Merge expanded element's elements into the screen
          ...elementSpec.elements,
        },
      };

      expect(screenSpec.elements.page.children).toContain(elementSpec.root);
      expect(screenSpec.elements[elementSpec.root].type).toBe('box');
    });
  });

  describe('ElementRenderNode field parity', () => {
    it('accepts animations/hover/active/focus/transition/motion/visible/key on a render tree node', () => {
      const def: ElementDefinition = {
        type: 'full-parity-card',
        props: { title: { type: 'string' } },
        render: {
          type: 'box',
          props: { testId: 'outer' },
          style: { padding: 16 },
          visible: true,
          key: 'outer-key',
          animations: { mount: { recipe: 'fade-up' } },
          hover: { scale: 1.02 },
          active: { scale: 0.98 },
          focus: { outline: '2px solid' },
          transition: { duration: 200 },
          motion: { initial: { opacity: 0 }, animate: { opacity: 1 } },
          children: [
            { type: 'text', props: { content: { $prop: 'title' } } },
          ],
        },
      };
      const registry = createElementRegistry();
      registry.register(def);
      expect(registry.has('full-parity-card')).toBe(true);
      const retrieved = registry.get('full-parity-card');
      expect(retrieved.render.animations).toEqual({ mount: { recipe: 'fade-up' } });
      expect(retrieved.render.hover).toEqual({ scale: 1.02 });
      expect(retrieved.render.active).toEqual({ scale: 0.98 });
      expect(retrieved.render.focus).toEqual({ outline: '2px solid' });
      expect(retrieved.render.transition).toEqual({ duration: 200 });
      expect(retrieved.render.motion?.initial).toEqual({ opacity: 0 });
      expect(retrieved.render.motion?.animate).toEqual({ opacity: 1 });
      expect(retrieved.render.visible).toBe(true);
      expect(retrieved.render.key).toBe('outer-key');
    });

    it('expandElementToSpec drops $children markers when no consumer children are provided', () => {
      const def: ElementDefinition = {
        type: 'slot-placeholder',
        props: {},
        render: {
          type: 'box',
          children: [
            { type: 'text', props: { content: 'before' } },
            '$children',
            { type: 'text', props: { content: 'after' } },
          ],
        },
      };
      const spec = expandElementToSpec(def, {});
      const root = spec.elements[spec.root];
      // '$children' markers splice consumer children when provided (Task 5),
      // or drop silently when consumerChildrenIds is empty (the default).
      expect(root.children).toHaveLength(2);
      for (const childId of root.children!) {
        expect(typeof childId).toBe('string');
        expect(childId).not.toBe('$children');
      }
    });
  });

  describe('$children marker slotting', () => {
    it('slots consumer-provided child IDs at the $children marker position', () => {
      const def: ElementDefinition = {
        type: 'themed-card',
        props: { tone: { type: 'string', default: 'default' } },
        render: {
          type: 'box',
          props: { testId: 'wrapper' },
          children: [
            { type: 'text', props: { content: 'header' } },
            '$children',
            { type: 'text', props: { content: 'footer' } },
          ],
        },
      };

      const spec = expandElementToSpec(def, {}, 'tc', ['consumer-child-1', 'consumer-child-2']);
      const root = spec.elements[spec.root];
      expect(root.children).toHaveLength(4);
      // Position 0: header (newly expanded), position 1-2: consumer IDs (slotted), position 3: footer.
      expect(root.children?.[1]).toBe('consumer-child-1');
      expect(root.children?.[2]).toBe('consumer-child-2');
      // Positions 0 and 3 are freshly-generated IDs for header and footer.
      expect(typeof root.children?.[0]).toBe('string');
      expect(root.children?.[0]).not.toBe('$children');
      expect(typeof root.children?.[3]).toBe('string');
    });

    it('when no $children marker present, consumer children are NOT injected', () => {
      const def: ElementDefinition = {
        type: 'no-slot',
        props: {},
        render: {
          type: 'box',
          children: [{ type: 'text', props: { content: 'only me' } }],
        },
      };
      const spec = expandElementToSpec(def, {}, 'ns', ['consumer-ignored']);
      const root = spec.elements[spec.root];
      expect(root.children).toHaveLength(1);
      expect(root.children?.[0]).not.toBe('consumer-ignored');
    });

    it('supports multiple $children markers (splices consumer children at each)', () => {
      // Edge case: if the author writes '$children' twice, we slot twice.
      // Defensible behavior — matches template semantics.
      const def: ElementDefinition = {
        type: 'multi-slot',
        props: {},
        render: {
          type: 'box',
          children: [
            '$children',
            { type: 'text', props: { content: 'divider' } },
            '$children',
          ],
        },
      };
      const spec = expandElementToSpec(def, {}, 'ms', ['cc-a', 'cc-b']);
      const root = spec.elements[spec.root];
      // Expected: cc-a, cc-b, divider-id, cc-a, cc-b → 5 children total.
      expect(root.children).toHaveLength(5);
      expect(root.children?.[0]).toBe('cc-a');
      expect(root.children?.[1]).toBe('cc-b');
      expect(root.children?.[3]).toBe('cc-a');
      expect(root.children?.[4]).toBe('cc-b');
    });

    it('supports zero consumer children with $children marker (marker slots nothing)', () => {
      const def: ElementDefinition = {
        type: 'maybe-slot',
        props: {},
        render: {
          type: 'box',
          children: [
            { type: 'text', props: { content: 'a' } },
            '$children',
            { type: 'text', props: { content: 'b' } },
          ],
        },
      };
      const spec = expandElementToSpec(def, {}, 'mm', []);
      const root = spec.elements[spec.root];
      // No consumer children → marker splices nothing → only 'a' and 'b' remain.
      expect(root.children).toHaveLength(2);
      for (const childId of root.children!) {
        expect(typeof childId).toBe('string');
        expect(childId).not.toBe('$children');
      }
    });

    it('supports nested $children in deeper render tree levels', () => {
      const def: ElementDefinition = {
        type: 'nested-slot',
        props: {},
        render: {
          type: 'box',
          children: [
            {
              type: 'stack',
              children: [
                '$children',
              ],
            },
          ],
        },
      };
      const spec = expandElementToSpec(def, {}, 'ns', ['ccx']);
      const root = spec.elements[spec.root];
      const innerStackId = root.children?.[0] as string;
      const innerStack = spec.elements[innerStackId];
      expect(innerStack.children).toHaveLength(1);
      expect(innerStack.children?.[0]).toBe('ccx');
    });

    it('preserves parity fields on a node that also contains $children markers', () => {
      const def: ElementDefinition = {
        type: 'slot-with-fields',
        props: {},
        render: {
          type: 'box',
          hover: { scale: 1.05 },
          animations: { mount: { recipe: 'fade' } },
          children: [
            { type: 'text', props: { content: 'before' } },
            '$children',
          ],
        },
      };
      const spec = expandElementToSpec(def, {}, 'sf', ['cc']);
      const root = spec.elements[spec.root];
      // Parity fields survive.
      expect(root.hover).toEqual({ scale: 1.05 });
      expect(root.animations).toEqual({ mount: { recipe: 'fade' } });
      // Children include the expanded 'before' text followed by the slotted 'cc'.
      expect(root.children).toHaveLength(2);
      expect(root.children?.[1]).toBe('cc');
    });
  });

  describe('ElementDefinition.variants', () => {
    it('accepts variants on the definition and preserves them on retrieval', () => {
      const def: ElementDefinition = {
        type: 'rating-stars',
        props: {
          max: { type: 'number', default: 5 },
        },
        variants: {
          compact: { props: { max: 3 }, style: { gap: 2 } },
          verbose: { props: { max: 10 }, style: { gap: 8 } },
        },
        render: {
          type: 'stack',
          props: { direction: 'horizontal' },
        },
      };
      const registry = createElementRegistry();
      registry.register(def);
      const retrieved = registry.get('rating-stars');
      expect(retrieved.variants?.compact).toBeDefined();
      expect(retrieved.variants?.compact.props?.max).toBe(3);
      expect(retrieved.variants?.compact.style).toEqual({ gap: 2 });
      expect(retrieved.variants?.verbose.props?.max).toBe(10);
      expect(retrieved.variants?.verbose.style).toEqual({ gap: 8 });
    });

    it('preserves all cascade-participating fields on retrieval (animations + hover/active/focus/transition)', () => {
      const def: ElementDefinition = {
        type: 'fancy-btn',
        props: { label: { type: 'string' } },
        variants: {
          primary: {
            style: { backgroundColor: 'blue' },
            animations: { hover: { recipe: 'pulse' } },
            hover: { scale: 1.05 },
            active: { scale: 0.98 },
            focus: { outline: '2px' },
            transition: { duration: 150 },
          },
        },
        render: { type: 'text', props: { content: { $prop: 'label' } } },
      };
      const registry = createElementRegistry();
      registry.register(def);
      const retrieved = registry.get('fancy-btn');
      expect(retrieved.variants?.primary.animations).toEqual({ hover: { recipe: 'pulse' } });
      expect(retrieved.variants?.primary.hover).toEqual({ scale: 1.05 });
      expect(retrieved.variants?.primary.active).toEqual({ scale: 0.98 });
      expect(retrieved.variants?.primary.focus).toEqual({ outline: '2px' });
      expect(retrieved.variants?.primary.transition).toEqual({ duration: 150 });
    });

    it('accepts expression values inside variant props (forward compat with later $prop resolution)', () => {
      const def: ElementDefinition = {
        type: 'expr-variant',
        props: { label: { type: 'string' } },
        variants: {
          dynamic: {
            props: {
              label: { $prop: 'externalLabel' },
              shown: { $state: '/ui/visible' },
            },
          },
        },
        render: { type: 'text', props: { content: { $prop: 'label' } } },
      };
      const registry = createElementRegistry();
      registry.register(def);
      const retrieved = registry.get('expr-variant');
      expect(retrieved.variants?.dynamic.props?.label).toEqual({ $prop: 'externalLabel' });
      expect(retrieved.variants?.dynamic.props?.shown).toEqual({ $state: '/ui/visible' });
    });
  });

  describe('expandElementToSpec preserves parity fields', () => {
    it('copies animations/hover/active/focus/transition/motion/visible/key from ElementRenderNode to Element', () => {
      const def: ElementDefinition = {
        type: 'preserved-card',
        props: {},
        render: {
          type: 'box',
          props: { a: 1 },
          style: { padding: 8 },
          visible: { $state: '/flag' },
          key: 'k1',
          animations: { mount: { recipe: 'fade' } },
          hover: { scale: 1.05 },
          active: { scale: 0.95 },
          focus: { outline: '2px' },
          transition: { duration: 150 },
          motion: { initial: { opacity: 0 }, animate: { opacity: 1 } },
        },
      };
      const spec = expandElementToSpec(def, {}, 'test');
      const root = spec.elements[spec.root];
      expect(root.animations).toEqual({ mount: { recipe: 'fade' } });
      expect(root.hover).toEqual({ scale: 1.05 });
      expect(root.active).toEqual({ scale: 0.95 });
      expect(root.focus).toEqual({ outline: '2px' });
      expect(root.transition).toEqual({ duration: 150 });
      expect(root.motion).toEqual({ initial: { opacity: 0 }, animate: { opacity: 1 } });
      expect(root.visible).toEqual({ $state: '/flag' });
      expect(root.key).toBe('k1');
      expect(root.style).toEqual({ padding: 8 });
    });

    it('copies parity fields on nested inner elements, not just the root', () => {
      const def: ElementDefinition = {
        type: 'nested-parity',
        props: {},
        render: {
          type: 'stack',
          children: [
            {
              type: 'text',
              props: { content: 'inner' },
              animations: { hover: { recipe: 'pulse' } },
              hover: { opacity: 0.8 },
            },
          ],
        },
      };
      const spec = expandElementToSpec(def, {}, 'n');
      const rootId = spec.root;
      const root = spec.elements[rootId];
      expect(root.children).toHaveLength(1);
      const innerId = root.children![0];
      const inner = spec.elements[innerId];
      expect(inner.animations).toEqual({ hover: { recipe: 'pulse' } });
      expect(inner.hover).toEqual({ opacity: 0.8 });
    });

    it('omits parity fields when the render node does not declare them', () => {
      const def: ElementDefinition = {
        type: 'minimal',
        props: {},
        render: { type: 'box', props: { a: 1 } },
      };
      const spec = expandElementToSpec(def, {}, 'm');
      const root = spec.elements[spec.root];
      expect(root.animations).toBeUndefined();
      expect(root.hover).toBeUndefined();
      expect(root.active).toBeUndefined();
      expect(root.focus).toBeUndefined();
      expect(root.transition).toBeUndefined();
      expect(root.motion).toBeUndefined();
      expect(root.visible).toBeUndefined();
      expect(root.key).toBeUndefined();
      // Sanity: type + props still preserved even when no parity fields declared.
      expect(root.type).toBe('box');
      expect(root.props).toEqual({ a: 1 });
    });
  });
});
