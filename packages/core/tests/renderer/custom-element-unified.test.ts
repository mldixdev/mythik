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

describe('Custom element unified dispatch (Task 11)', () => {
  it('identity animations cascade into internal primitives', () => {
    const tokens = {
      identity: {
        animations: { mount: { recipe: 'fade-up' } },
      },
    };
    const { engine, elementRegistry } = setup(tokens);

    elementRegistry.register({
      type: 'rating',
      props: { label: { type: 'string', default: 'rate' } },
      render: {
        type: 'stack',
        props: { direction: 'horizontal' },
        children: [
          { type: 'text', props: { content: { $prop: 'label' } } },
        ],
      },
    });

    const spec: Spec = {
      root: 'r',
      elements: { r: { type: 'rating', props: { label: 'Rate' } } },
    };
    const rendered = engine.render(spec);
    // Outer primitive is stack (rating's render root) — has identity cascade applied.
    expect(rendered.type).toBe('stack');
    expect(rendered.props.animations).toEqual({ mount: { recipe: 'fade-up' } });
    // Inner text primitive also receives identity cascade.
    expect(rendered.children.length).toBe(1);
    const innerText = rendered.children[0];
    expect(innerText.type).toBe('text');
    expect(innerText.props.animations).toEqual({ mount: { recipe: 'fade-up' } });
    expect(innerText.props.content).toBe('Rate');
  });

  it('consumer instance animations apply to outer primitive only (black-box boundary)', () => {
    const tokens = {
      identity: {
        animations: { mount: { recipe: 'fade-up' } },
      },
    };
    const { engine, elementRegistry } = setup(tokens);

    elementRegistry.register({
      type: 'rating',
      props: { label: { type: 'string', default: 'rate' } },
      render: {
        type: 'stack',
        props: { direction: 'horizontal' },
        children: [
          { type: 'text', props: { content: { $prop: 'label' } } },
        ],
      },
    });

    const spec: Spec = {
      root: 'r',
      elements: {
        r: {
          type: 'rating',
          props: { label: 'Rate' },
          animations: { mount: { recipe: 'scale-in' } },
        },
      },
    };
    const rendered = engine.render(spec);
    // Outer: consumer's scale-in wins over identity's fade-up.
    expect(rendered.props.animations).toEqual({ mount: { recipe: 'scale-in' } });
    // Inner: still identity's fade-up (consumer can't reach inside).
    const innerText = rendered.children[0];
    expect(innerText.props.animations).toEqual({ mount: { recipe: 'fade-up' } });
  });
});
