import { describe, it, expect } from 'vitest';
import { createRenderEngine } from '../../src/renderer/engine.js';
import { createPrimitiveRegistry } from '../../src/renderer/registry.js';
import { createStateStore } from '../../src/state/store.js';
import { createResolver } from '../../src/expressions/resolver.js';
import { createElementRegistry } from '../../src/elements/composer.js';
import type { Spec } from '../../src/types.js';

function setup() {
  const store = createStateStore({});
  const resolver = createResolver({ store });
  const primitiveRegistry = createPrimitiveRegistry();
  for (const type of ['stack', 'text', 'box', 'button']) {
    primitiveRegistry.register(type, (props, children) => ({ type, props, children }));
  }
  const elementRegistry = createElementRegistry();
  const engine = createRenderEngine({ resolver, primitiveRegistry, elementRegistry });
  return { engine, elementRegistry };
}

describe('Custom element $children marker at render time', () => {
  it("slots the consumer's children at the $children marker position", () => {
    const { engine, elementRegistry } = setup();

    elementRegistry.register({
      type: 'themed-card',
      props: {},
      render: {
        type: 'box',
        children: [
          { type: 'text', props: { content: 'header' } },
          '$children',
          { type: 'text', props: { content: 'footer' } },
        ],
      },
    });

    const spec: Spec = {
      root: 'r',
      elements: {
        r: { type: 'themed-card', props: {}, children: ['content'] },
        content: { type: 'text', props: { content: 'dynamic content' } },
      },
    };
    const rendered = engine.render(spec);
    // Outer is box with 3 children: header + content + footer.
    expect(rendered.type).toBe('box');
    expect(rendered.children.length).toBe(3);
    expect(rendered.children[0].props.content).toBe('header');
    expect(rendered.children[1].props.content).toBe('dynamic content');
    expect(rendered.children[2].props.content).toBe('footer');
  });

  it('consumer children render correctly even when they have their own nested structure', () => {
    const { engine, elementRegistry } = setup();

    elementRegistry.register({
      type: 'wrap',
      props: {},
      render: {
        type: 'box',
        children: ['$children'],
      },
    });

    const spec: Spec = {
      root: 'r',
      elements: {
        r: { type: 'wrap', props: {}, children: ['nested-stack'] },
        'nested-stack': {
          type: 'stack',
          children: ['n-child-1', 'n-child-2'],
        },
        'n-child-1': { type: 'text', props: { content: 'one' } },
        'n-child-2': { type: 'text', props: { content: 'two' } },
      },
    };
    const rendered = engine.render(spec);
    // Outer box has 1 child: the stack.
    expect(rendered.children.length).toBe(1);
    const stack = rendered.children[0];
    expect(stack.type).toBe('stack');
    expect(stack.children.length).toBe(2);
    expect(stack.children[0].props.content).toBe('one');
    expect(stack.children[1].props.content).toBe('two');
  });

  it('multiple $children markers splice consumer children at each position', () => {
    const { engine, elementRegistry } = setup();

    elementRegistry.register({
      type: 'double-slot',
      props: {},
      render: {
        type: 'box',
        children: [
          '$children',
          { type: 'text', props: { content: 'separator' } },
          '$children',
        ],
      },
    });

    const spec: Spec = {
      root: 'r',
      elements: {
        r: { type: 'double-slot', props: {}, children: ['c'] },
        c: { type: 'text', props: { content: 'item' } },
      },
    };
    const rendered = engine.render(spec);
    // Expected order: item, separator, item — 3 children total.
    expect(rendered.children.length).toBe(3);
    expect(rendered.children[0].props.content).toBe('item');
    expect(rendered.children[1].props.content).toBe('separator');
    expect(rendered.children[2].props.content).toBe('item');
  });
});
