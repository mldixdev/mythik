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
  return { engine, elementRegistry, primitiveRegistry };
}

describe('Custom element error boundary at instance', () => {
  it('inner primitive error surfaces as an _error node (at or under the instance)', () => {
    const { engine, elementRegistry } = setup();

    elementRegistry.register({
      type: 'broken',
      props: {},
      render: {
        // Type that's not registered — error surfaces during primitive dispatch.
        type: 'non-existent-primitive',
      },
    });

    const spec: Spec = {
      root: 'r',
      elements: { r: { type: 'broken', props: {} } },
    };
    const rendered = engine.render(spec);
    // Error surfaces as an _error node. The renderElement's try/catch wraps
    // the entire expansion, so errors bubble to the consumer's elementId.
    expect(rendered.type).toBe('_error');
    // Message should include a reference to the bad type so debuggers can find it.
    expect(String(rendered.props.error)).toMatch(/non-existent-primitive/);
  });

  it('custom element with unregistered primitive in render tree surfaces as _error', () => {
    const { engine, elementRegistry } = setup();

    elementRegistry.register({
      type: 'withUnregisteredChild',
      props: {},
      render: {
        type: 'stack',
        children: [
          { type: 'unregistered-primitive', props: { content: 'test' } },
        ],
      },
    });

    const spec: Spec = {
      root: 'r',
      elements: { r: { type: 'withUnregisteredChild', props: {} } },
    };
    const rendered = engine.render(spec);
    // The stack tries to render its child, which fails because 'unregistered-primitive'
    // is not registered. This should propagate and cause an error at the stack level.
    // Actually, since the error occurs inside the child rendering (during expansion),
    // it surfaces as an _error child, not at the root.
    expect(rendered.type).toBe('stack');
    expect(rendered.children.length).toBe(1);
    expect(rendered.children[0].type).toBe('_error');
  });

  it('custom element with thrown error in render logic surfaces as _error', () => {
    const { engine, elementRegistry, primitiveRegistry } = setup();

    // Register a primitive that throws
    primitiveRegistry.register('thrower', (props, children) => {
      throw new Error('Intentional primitive error for testing');
    });

    elementRegistry.register({
      type: 'throwingElement',
      props: {},
      render: {
        type: 'thrower',
      },
    });

    const spec: Spec = {
      root: 'r',
      elements: { r: { type: 'throwingElement', props: {} } },
    };
    const rendered = engine.render(spec);
    // Error is caught and surfaced as _error
    expect(rendered.type).toBe('_error');
    expect(String(rendered.props.error)).toMatch(/Intentional primitive error/);
  });

  it('nested custom element error surfaces as _error child in parent', () => {
    const { engine, elementRegistry } = setup();

    // Inner broken element
    elementRegistry.register({
      type: 'innerBroken',
      props: {},
      render: {
        type: 'missing-type',
      },
    });

    // Outer element that uses the broken one
    const spec: Spec = {
      root: 'r',
      elements: {
        r: {
          type: 'stack',
          children: ['inner'],
        },
        inner: { type: 'innerBroken', props: {} },
      },
    };

    const rendered = engine.render(spec);
    // The error in the nested custom element is caught at its renderElement level
    // and surfaces as an _error node. The parent stack renders normally with the
    // _error node as a child.
    expect(rendered.type).toBe('stack');
    expect(rendered.children.length).toBe(1);
    expect(rendered.children[0].type).toBe('_error');
  });

  it('multiple custom elements: only broken one surfaces error', () => {
    const { engine, elementRegistry } = setup();

    elementRegistry.register({
      type: 'goodElement',
      props: {},
      render: {
        type: 'text',
        props: { content: 'Good' },
      },
    });

    elementRegistry.register({
      type: 'brokenElement',
      props: {},
      render: {
        type: 'unknown-type',
      },
    });

    const spec: Spec = {
      root: 'r',
      elements: {
        r: {
          type: 'stack',
          children: ['g', 'b'],
        },
        g: { type: 'goodElement', props: {} },
        b: { type: 'brokenElement', props: {} },
      },
    };
    const rendered = engine.render(spec);
    // Stack renders with children
    expect(rendered.type).toBe('stack');
    expect(rendered.children.length).toBe(2);
    // First child is good
    expect(rendered.children[0].type).toBe('text');
    // Second child is error
    expect(rendered.children[1].type).toBe('_error');
    expect(String(rendered.children[1].props.error)).toMatch(/unknown-type/);
  });
});
