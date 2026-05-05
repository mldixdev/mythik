import { describe, it, expect } from 'vitest';
import { createRenderEngine } from '../../src/renderer/engine.js';
import { createPrimitiveRegistry } from '../../src/renderer/registry.js';
import { createStateStore } from '../../src/state/store.js';
import { createResolver } from '../../src/expressions/resolver.js';
import type { Spec } from '../../src/types.js';

/**
 * Element Templates — spec-level reusable element definitions.
 *
 * Design spec: Task C.1
 * Templates use $prop for parameterization, same handler as Layer 3 custom elements.
 */

describe('Element Templates', () => {
  function setup(spec: Spec, initialState: Record<string, unknown> = {}) {
    const store = createStateStore(initialState);
    const resolver = createResolver({ store });
    const primitiveRegistry = createPrimitiveRegistry();

    for (const type of ['stack', 'text', 'box', 'button']) {
      primitiveRegistry.register(type, (props, children) => ({ type, props, children }));
    }

    const engine = createRenderEngine({ resolver, primitiveRegistry });
    return { engine, store };
  }

  // ─── Basic template expansion with $prop ───

  it('expands a template with $prop references', () => {
    const spec: Spec = {
      root: 'root',
      templates: {
        'labeled-text': {
          type: 'text',
          props: {
            content: { $prop: 'label' },
          },
        },
      },
      elements: {
        root: {
          type: 'stack',
          children: ['greeting'],
        },
        greeting: {
          type: 'labeled-text',
          props: { label: 'Hello World' },
        },
      },
    };

    const { engine } = setup(spec);
    const tree = engine.render(spec);

    expect(tree.children[0].type).toBe('text');
    expect(tree.children[0].props.content).toBe('Hello World');
  });

  // ─── Defaults applied when prop not provided ───

  it('applies template defaults when element does not provide a prop', () => {
    const spec: Spec = {
      root: 'root',
      templates: {
        'styled-text': {
          type: 'text',
          defaults: { color: '#0F172A', fontSize: 14 },
          props: {
            content: { $prop: 'content' },
          },
          style: {
            color: { $prop: 'color' },
            fontSize: { $prop: 'fontSize' },
          },
        },
      },
      elements: {
        root: {
          type: 'stack',
          children: ['label'],
        },
        label: {
          type: 'styled-text',
          props: { content: 'Default colors' },
        },
      },
    };

    const { engine } = setup(spec);
    const tree = engine.render(spec);

    expect(tree.children[0].props.content).toBe('Default colors');
    expect(tree.children[0].props.style).toEqual({ color: '#0F172A', fontSize: 14 });
  });

  // ─── Element props override defaults ───

  it('element-provided props override template defaults', () => {
    const spec: Spec = {
      root: 'root',
      templates: {
        'styled-text': {
          type: 'text',
          defaults: { color: '#0F172A', fontSize: 14 },
          props: {
            content: { $prop: 'content' },
          },
          style: {
            color: { $prop: 'color' },
            fontSize: { $prop: 'fontSize' },
          },
        },
      },
      elements: {
        root: {
          type: 'stack',
          children: ['custom-label'],
        },
        'custom-label': {
          type: 'styled-text',
          props: { content: 'Custom', color: '#D97706', fontSize: 18 },
        },
      },
    };

    const { engine } = setup(spec);
    const tree = engine.render(spec);

    expect(tree.children[0].props.content).toBe('Custom');
    expect(tree.children[0].props.style).toEqual({ color: '#D97706', fontSize: 18 });
  });

  // ─── Template with children ($children marker) ───

  it('expands $children marker with element actual children', () => {
    const spec: Spec = {
      root: 'root',
      templates: {
        card: {
          type: 'box',
          defaults: { padding: 16 },
          style: {
            padding: { $prop: 'padding' },
            borderRadius: 12,
          },
          children: ['$children'],
        },
      },
      elements: {
        root: {
          type: 'stack',
          children: ['my-card'],
        },
        'my-card': {
          type: 'card',
          children: ['card-title', 'card-body'],
        },
        'card-title': {
          type: 'text',
          props: { content: 'Title' },
        },
        'card-body': {
          type: 'text',
          props: { content: 'Body' },
        },
      },
    };

    const { engine } = setup(spec);
    const tree = engine.render(spec);

    const card = tree.children[0];
    expect(card.type).toBe('box');
    expect(card.props.style).toEqual({ padding: 16, borderRadius: 12 });
    expect(card.children).toHaveLength(2);
    expect(card.children[0].props.content).toBe('Title');
    expect(card.children[1].props.content).toBe('Body');
  });

  // ─── Template with expressions ($state, $token) ───

  it('resolves $state expressions inside template props', () => {
    const spec: Spec = {
      root: 'root',
      templates: {
        'state-text': {
          type: 'text',
          props: {
            content: { $state: '/user/name' },
          },
        },
      },
      elements: {
        root: {
          type: 'stack',
          children: ['greeting'],
        },
        greeting: {
          type: 'state-text',
          props: {},
        },
      },
    };

    const { engine } = setup(spec, { user: { name: 'Alice' } });
    const tree = engine.render(spec);

    expect(tree.children[0].props.content).toBe('Alice');
  });

  // ─── Template in repeat context ($item passes through) ───

  it('resolves $item expressions inside template within repeat', () => {
    const spec: Spec = {
      root: 'list',
      templates: {
        'list-item': {
          type: 'text',
          props: {
            content: { $prop: 'value' },
          },
        },
      },
      elements: {
        list: {
          type: 'stack',
          repeat: { statePath: '/items' },
          children: ['item'],
        },
        item: {
          type: 'list-item',
          props: { value: { $item: 'name' } },
        },
      },
    };

    const { engine } = setup(spec, { items: [{ name: 'A' }, { name: 'B' }] });
    const tree = engine.render(spec);

    // Repeat wraps in a stack; each iteration re-renders 'list' (stack) with its child 'item' (template→text)
    expect(tree.children).toHaveLength(2);
    expect(tree.children[0].children[0].props.content).toBe('A');
    expect(tree.children[1].children[0].props.content).toBe('B');
  });

  // ─── Unknown template type → error node ───

  it('renders error node for unknown element type (not template, not primitive)', () => {
    const spec: Spec = {
      root: 'root',
      elements: {
        root: {
          type: 'stack',
          children: ['broken'],
        },
        broken: {
          type: 'nonexistent-type',
          props: {},
        },
      },
    };

    const { engine } = setup(spec);
    const tree = engine.render(spec);

    expect(tree.children[0].type).toBe('_error');
    expect(tree.children[0].props.error).toContain('No primitive registered');
  });

  // ─── Multiple elements reusing same template ───

  it('multiple elements can reuse the same template with different props', () => {
    const spec: Spec = {
      root: 'root',
      templates: {
        'monetary-col': {
          type: 'text',
          defaults: { color: '#0F172A' },
          props: {
            content: { $prop: 'value' },
          },
          style: {
            textAlign: 'right',
            color: { $prop: 'color' },
          },
        },
      },
      elements: {
        root: {
          type: 'stack',
          children: ['col-votado', 'col-mod'],
        },
        'col-votado': {
          type: 'monetary-col',
          props: { value: '1,000.00' },
        },
        'col-mod': {
          type: 'monetary-col',
          props: { value: '500.00', color: '#D97706' },
        },
      },
    };

    const { engine } = setup(spec);
    const tree = engine.render(spec);

    expect(tree.children[0].props.content).toBe('1,000.00');
    expect(tree.children[0].props.style).toEqual({ textAlign: 'right', color: '#0F172A' });
    expect(tree.children[1].props.content).toBe('500.00');
    expect(tree.children[1].props.style).toEqual({ textAlign: 'right', color: '#D97706' });
  });

  // ─── Template with visibility ───

  it('respects visible condition on element that uses a template', () => {
    const spec: Spec = {
      root: 'root',
      templates: {
        'simple-text': {
          type: 'text',
          props: { content: { $prop: 'text' } },
        },
      },
      elements: {
        root: {
          type: 'stack',
          children: ['maybe-visible'],
        },
        'maybe-visible': {
          type: 'simple-text',
          props: { text: 'Conditional' },
          visible: false,
        },
      },
    };

    const { engine } = setup(spec);
    const tree = engine.render(spec);

    expect(tree.children).toHaveLength(0);
  });

  // ─── Nested templates (template type references another template) ───

  it('supports nested templates (template type references another template)', () => {
    const spec: Spec = {
      root: 'root',
      templates: {
        'inner-text': {
          type: 'text',
          props: { content: { $prop: 'text' } },
        },
        'card-text': {
          type: 'box',
          style: { padding: 8 },
          children: ['$children'],
        },
      },
      elements: {
        root: {
          type: 'stack',
          children: ['my-card'],
        },
        'my-card': {
          type: 'card-text',
          children: ['inner'],
        },
        inner: {
          type: 'inner-text',
          props: { text: 'Nested' },
        },
      },
    };

    const { engine } = setup(spec);
    const tree = engine.render(spec);

    const card = tree.children[0];
    expect(card.type).toBe('box');
    expect(card.children[0].type).toBe('text');
    expect(card.children[0].props.content).toBe('Nested');
  });
});
