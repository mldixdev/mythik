import { describe, it, expect } from 'vitest';
import { createRenderEngine } from '../../src/renderer/engine.js';
import { createPrimitiveRegistry } from '../../src/renderer/registry.js';
import { createStateStore } from '../../src/state/store.js';
import { createResolver } from '../../src/expressions/resolver.js';
import { createElementRegistry } from '../../src/elements/composer.js';
import type { Spec } from '../../src/types.js';

function setup(initialState: Record<string, unknown> = {}) {
  const store = createStateStore(initialState);
  const resolver = createResolver({ store });
  const primitiveRegistry = createPrimitiveRegistry();
  for (const type of ['stack', 'text', 'box']) {
    primitiveRegistry.register(type, (props, children) => ({ type, props, children }));
  }
  const elementRegistry = createElementRegistry();
  const engine = createRenderEngine({ resolver, primitiveRegistry, elementRegistry });
  return { store, engine, elementRegistry };
}

describe('Custom element cache invalidates on consumer prop changes', () => {
  it('re-renders inner primitives when consumer props change via $state', () => {
    const { store, engine, elementRegistry } = setup({ label: 'initial' });

    elementRegistry.register({
      type: 'dyn',
      props: { label: { type: 'string' } },
      render: {
        type: 'text',
        props: { content: { $prop: 'label' } },
      },
    });

    const spec: Spec = {
      root: 'r',
      elements: {
        r: { type: 'dyn', props: { label: { $state: '/label' } } },
      },
    };

    const r1 = engine.render(spec);
    expect(r1.props.content).toBe('initial');

    store.set('/label', 'updated');
    const r2 = engine.render(spec, new Set(['/label']));
    expect(r2.props.content).toBe('updated');
  });

  it('does not invalidate unrelated cached inner primitives when one prop changes', () => {
    const { store, engine, elementRegistry } = setup({ title: 'hello', subtitle: 'world' });

    elementRegistry.register({
      type: 'card',
      props: {
        title: { type: 'string' },
        subtitle: { type: 'string' },
      },
      render: {
        type: 'stack',
        children: [
          { type: 'text', props: { content: { $prop: 'title' } } },
          { type: 'text', props: { content: { $prop: 'subtitle' } } },
        ],
      },
    });

    const spec: Spec = {
      root: 'r',
      elements: {
        r: {
          type: 'card',
          props: {
            title: { $state: '/title' },
            subtitle: { $state: '/subtitle' },
          },
        },
      },
    };

    const r1 = engine.render(spec);
    expect(r1.children[0].props.content).toBe('hello');
    expect(r1.children[1].props.content).toBe('world');

    store.set('/title', 'updated-title');
    const r2 = engine.render(spec, new Set(['/title']));
    // title prop changed → inner text with $prop:'title' should re-render
    expect(r2.children[0].props.content).toBe('updated-title');
    // subtitle prop unchanged → should still show 'world'
    expect(r2.children[1].props.content).toBe('world');
  });

  it('caches correctly when consumer props do not change', () => {
    const { store, engine, elementRegistry } = setup({ label: 'stable', counter: 0 });

    elementRegistry.register({
      type: 'dyn',
      props: { label: { type: 'string' } },
      render: {
        type: 'text',
        props: { content: { $prop: 'label' } },
      },
    });

    const spec: Spec = {
      root: 'page',
      elements: {
        page: { type: 'stack', children: ['dynEl', 'counter'] },
        dynEl: { type: 'dyn', props: { label: { $state: '/label' } } },
        counter: { type: 'text', props: { content: { $state: '/counter' } } },
      },
    };

    engine.render(spec);
    store.set('/counter', 1);
    const r2 = engine.render(spec, new Set(['/counter']));

    // counter element updated
    expect(r2.children[1].props.content).toBe(1);
    // label prop on custom element unchanged → inner text still shows 'stable'
    expect(r2.children[0].props.content).toBe('stable');
  });
});
