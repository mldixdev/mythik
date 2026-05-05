import { describe, it, expect } from 'vitest';
import { createRenderEngine } from '../../src/renderer/engine.js';
import { createPrimitiveRegistry } from '../../src/renderer/registry.js';
import { createStateStore } from '../../src/state/store.js';
import { createResolver } from '../../src/expressions/resolver.js';
import { createElementRegistry } from '../../src/elements/composer.js';
import type { Spec } from '../../src/types.js';

function setup(tokens?: Record<string, unknown>) {
  const store = createStateStore({});
  const resolver = createResolver({ store, tokens });
  const primitiveRegistry = createPrimitiveRegistry();
  for (const type of ['stack', 'text', 'box', 'button']) {
    primitiveRegistry.register(type, (props, children) => ({ type, props, children }));
  }
  const elementRegistry = createElementRegistry();
  const engine = createRenderEngine({ resolver, primitiveRegistry, tokens, elementRegistry });
  return { engine, elementRegistry };
}

describe('Custom element inside repeat', () => {
  it('renders N instances with static props under repeat.count', () => {
    const { engine, elementRegistry } = setup();

    elementRegistry.register({
      type: 'item-row',
      props: { name: { type: 'string', default: '' } },
      render: {
        type: 'text',
        props: { content: { $prop: 'name' } },
      },
    });

    const spec: Spec = {
      root: 'r',
      elements: {
        r: { type: 'stack', children: ['row'] },
        row: {
          type: 'item-row',
          props: { name: 'Row' },
          repeat: { count: 3 },
        },
      },
    };
    const rendered = engine.render(spec);
    // The stack wrapper from repeat contains 3 rendered rows.
    // Each row is expanded via the unified dispatch → inner text primitive.
    // repeat-wraps-in-stack pattern: rendered.children is the repeat's stack, each child is an expanded instance.
    const repeatWrapper = rendered.children[0] ?? rendered;
    expect(repeatWrapper.children.length).toBe(3);
    for (const row of repeatWrapper.children) {
      // Each row is a text primitive (item-row's render tree root) with content='Row'.
      expect(row.type).toBe('text');
      expect(row.props.content).toBe('Row');
    }
  });

  it('renders custom element with $index threaded via consumer props', () => {
    const { engine, elementRegistry } = setup();

    elementRegistry.register({
      type: 'indexed-row',
      props: { idx: { type: 'number', default: 0 } },
      render: {
        type: 'text',
        props: { content: { $prop: 'idx' } },
      },
    });

    const spec: Spec = {
      root: 'r',
      elements: {
        r: { type: 'stack', children: ['row'] },
        row: {
          type: 'indexed-row',
          props: { idx: { $index: true } },
          repeat: { count: 3 },
        },
      },
    };
    const rendered = engine.render(spec);
    const repeatWrapper = rendered.children[0] ?? rendered;
    expect(repeatWrapper.children.length).toBe(3);
    // Each row's content should be the index 0, 1, 2 — IF $index threading works through the custom-element
    // dispatch. If the test fails due to unresolved $index: it's a documented gap to follow up.
    expect(repeatWrapper.children[0].props.content).toBe(0);
    expect(repeatWrapper.children[1].props.content).toBe(1);
    expect(repeatWrapper.children[2].props.content).toBe(2);
  });
});
