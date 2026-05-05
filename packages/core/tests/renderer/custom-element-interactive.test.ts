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

describe('Custom element — consumer instance interactive states', () => {
  it('applies hover to outer primitive only', () => {
    const { engine, elementRegistry } = setup();

    elementRegistry.register({
      type: 'card',
      props: {},
      render: {
        type: 'box',
        children: [{ type: 'text', props: { content: 'inside' } }],
      },
    });

    const spec: Spec = {
      root: 'r',
      elements: { r: { type: 'card', props: {}, hover: { scale: 1.05 } } },
    };
    const rendered = engine.render(spec);
    expect(rendered.props._hover).toEqual({ scale: 1.05 });
    // Inner primitive does not receive the consumer's hover.
    expect(rendered.children[0].props._hover).toBeUndefined();
  });

  it('applies active to outer primitive only', () => {
    const { engine, elementRegistry } = setup();

    elementRegistry.register({
      type: 'card',
      props: {},
      render: {
        type: 'box',
        children: [{ type: 'text', props: { content: 'inside' } }],
      },
    });

    const spec: Spec = {
      root: 'r',
      elements: { r: { type: 'card', props: {}, active: { scale: 0.95 } } },
    };
    const rendered = engine.render(spec);
    expect(rendered.props._active).toEqual({ scale: 0.95 });
    expect(rendered.children[0].props._active).toBeUndefined();
  });

  it('applies focus to outer primitive only', () => {
    const { engine, elementRegistry } = setup();

    elementRegistry.register({
      type: 'card',
      props: {},
      render: {
        type: 'box',
        children: [{ type: 'text', props: { content: 'inside' } }],
      },
    });

    const spec: Spec = {
      root: 'r',
      elements: { r: { type: 'card', props: {}, focus: { outline: '2px' } } },
    };
    const rendered = engine.render(spec);
    expect(rendered.props._focus).toEqual({ outline: '2px' });
    expect(rendered.children[0].props._focus).toBeUndefined();
  });

  it('applies transition to outer primitive only', () => {
    const { engine, elementRegistry } = setup();

    elementRegistry.register({
      type: 'card',
      props: {},
      render: {
        type: 'box',
        children: [{ type: 'text', props: { content: 'inside' } }],
      },
    });

    const spec: Spec = {
      root: 'r',
      elements: { r: { type: 'card', props: {}, transition: { duration: 300 } } },
    };
    const rendered = engine.render(spec);
    expect(rendered.props._transition).toEqual({ duration: 300 });
    expect(rendered.children[0].props._transition).toBeUndefined();
  });

  it('applies motion to outer primitive only', () => {
    const { engine, elementRegistry } = setup();

    elementRegistry.register({
      type: 'card',
      props: {},
      render: {
        type: 'box',
        children: [{ type: 'text', props: { content: 'inside' } }],
      },
    });

    const spec: Spec = {
      root: 'r',
      elements: {
        r: {
          type: 'card',
          props: {},
          motion: { initial: { opacity: 0 }, animate: { opacity: 1 } },
        },
      },
    };
    const rendered = engine.render(spec);
    expect(rendered.props._motion?.initial).toEqual({ opacity: 0 });
    expect(rendered.props._motion?.animate).toEqual({ opacity: 1 });
    expect(rendered.children[0].props._motion).toBeUndefined();
  });

  it('applies style override to outer primitive (merges with render-tree style)', () => {
    const { engine, elementRegistry } = setup();

    elementRegistry.register({
      type: 'styled-card',
      props: {},
      render: {
        type: 'box',
        style: { padding: 8 }, // author's render-tree style
      },
    });

    const spec: Spec = {
      root: 'r',
      elements: {
        r: {
          type: 'styled-card',
          props: {},
          style: { border: '1px solid red' }, // consumer instance style
        },
      },
    };
    const rendered = engine.render(spec);
    // Both author's padding and consumer's border should be on the outer primitive.
    expect(rendered.props.style).toMatchObject({ padding: 8, border: '1px solid red' });
  });

  it('applies visible override: false hides the instance entirely', () => {
    const { engine, elementRegistry } = setup();

    elementRegistry.register({
      type: 'card',
      props: {},
      render: {
        type: 'box',
        children: [{ type: 'text', props: { content: 'inside' } }],
      },
    });

    const spec: Spec = {
      root: 'root',
      elements: {
        root: { type: 'box', children: ['r'] },
        r: { type: 'card', props: {}, visible: false },
      },
    };
    const rendered = engine.render(spec);
    // Hidden instance drops out of the parent's children.
    expect(rendered.children.length).toBe(0);
  });

  it('applies key override to the rendered node', () => {
    const { engine, elementRegistry } = setup();

    elementRegistry.register({
      type: 'card',
      props: {},
      render: {
        type: 'box',
        children: [{ type: 'text', props: { content: 'inside' } }],
      },
    });

    const spec: Spec = {
      root: 'r',
      elements: { r: { type: 'card', props: {}, key: 'custom-key-abc' } },
    };
    const rendered = engine.render(spec);
    expect(rendered.key).toBe('custom-key-abc');
  });
});
