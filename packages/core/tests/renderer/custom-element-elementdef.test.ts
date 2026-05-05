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

describe('Custom element — author render-tree declarations (elementDef cascade slot)', () => {
  it('author-declared animations on inner primitives merge with identity cascade', () => {
    const tokens = {
      identity: {
        animations: { mount: { recipe: 'fade' } },
      },
    };
    const { engine, elementRegistry } = setup(tokens);

    elementRegistry.register({
      type: 'styled-card',
      props: {},
      render: {
        type: 'box',
        children: [
          {
            type: 'text',
            props: { content: 'inner' },
            animations: { hover: { recipe: 'pulse' } },
          },
        ],
      },
    });

    const spec: Spec = {
      root: 'r',
      elements: { r: { type: 'styled-card', props: {} } },
    };
    const rendered = engine.render(spec);
    // Outer box receives identity.mount
    expect(rendered.props.animations).toEqual({ mount: { recipe: 'fade' } });
    // Inner text receives identity.mount (via elementDef cascade) AND author's elementDef.hover (merged).
    const innerText = rendered.children[0];
    expect(innerText.props.animations).toEqual({
      mount: { recipe: 'fade' },
      hover: { recipe: 'pulse' },
    });
  });

  it('author-declared hover on inner primitives is preserved on the inner primitive\'s _hover', () => {
    const { engine, elementRegistry } = setup();

    elementRegistry.register({
      type: 'hover-card',
      props: {},
      render: {
        type: 'box',
        children: [
          {
            type: 'text',
            props: { content: 'x' },
            hover: { opacity: 0.8 },
          },
        ],
      },
    });

    const spec: Spec = {
      root: 'r',
      elements: { r: { type: 'hover-card', props: {} } },
    };
    const rendered = engine.render(spec);
    // Outer box does not have hover defined by author
    expect(rendered.props._hover).toBeUndefined();
    // Inner text preserves author's hover declaration
    const innerText = rendered.children[0];
    expect(innerText.props._hover).toEqual({ opacity: 0.8 });
  });

  it('consumer instance animations do NOT reach inner elementDef declarations (outer wins consumer; inner keeps author\'s)', () => {
    const { engine, elementRegistry } = setup();

    elementRegistry.register({
      type: 'combo',
      props: {},
      render: {
        type: 'box',
        children: [
          {
            type: 'text',
            props: { content: 'inner' },
            animations: { mount: { recipe: 'author-slide' } },
          },
        ],
      },
    });

    const spec: Spec = {
      root: 'r',
      elements: {
        r: {
          type: 'combo',
          props: {},
          animations: { mount: { recipe: 'consumer-pop' } },
        },
      },
    };
    const rendered = engine.render(spec);
    // Outer: consumer's animations wins (element cascade slot).
    expect(rendered.props.animations).toEqual({ mount: { recipe: 'consumer-pop' } });
    // Inner: author's elementDef wins (consumer cannot reach inside).
    const innerText = rendered.children[0];
    expect(innerText.props.animations).toEqual({ mount: { recipe: 'author-slide' } });
  });
});
