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
  for (const type of ['stack', 'text', 'box', 'button', 'section']) {
    primitiveRegistry.register(type, (props, children) => ({ type, props, children }));
  }
  const elementRegistry = createElementRegistry();
  const engine = createRenderEngine({ resolver, primitiveRegistry, tokens, elementRegistry });
  return { engine, elementRegistry };
}

describe('Custom element render tree with spec-level templates — integration gap', () => {
  it('custom element render tree type references a spec-level template — resolves correctly', () => {
    const { engine, elementRegistry } = setup();

    // Register a custom element that renders a template type
    elementRegistry.register({
      type: 'templated-card',
      props: { title: { type: 'string' } },
      render: {
        // The render tree references a template type (defined in the consumer's spec).
        type: 'section-template',
        props: { heading: { $prop: 'title' } },
      },
    });

    const spec: Spec = {
      root: 'r',
      templates: {
        'section-template': {
          type: 'box',
          props: { role: 'section' },
          // children are element IDs resolved from spec.elements
          children: ['section-text'],
        },
      },
      elements: {
        r: { type: 'templated-card', props: { title: 'Hello' } },
        'section-text': { type: 'text', props: { content: { $prop: 'heading' } } },
      },
    };

    const rendered = engine.render(spec);

    // spec.templates is propagated to the expanded sub-spec so the template
    // dispatch can resolve 'section-template'. The prop 'heading' threads from
    // the custom element's mergedProps into the template's propContext.
    expect(rendered.type).toBe('box');
    expect(rendered.children.length).toBeGreaterThan(0);
    expect(rendered.children[0].type).toBe('text');
    expect(rendered.children[0].props.content).toBe('Hello');
  });

  it('custom element with only primitive render types works (baseline)', () => {
    const { engine, elementRegistry } = setup();

    elementRegistry.register({
      type: 'simple-card',
      props: { title: { type: 'string' } },
      render: {
        type: 'box',
        props: { heading: { $prop: 'title' } },
        children: [
          { type: 'text', props: { content: { $prop: 'title' } } },
        ],
      },
    });

    const spec: Spec = {
      root: 'r',
      elements: {
        r: { type: 'simple-card', props: { title: 'Hello' } },
      },
    };

    const rendered = engine.render(spec);

    // When render tree uses only primitives, expansion works correctly.
    expect(rendered.type).toBe('box');
    expect(rendered.props.heading).toBe('Hello');
    expect(rendered.children[0].type).toBe('text');
    expect(rendered.children[0].props.content).toBe('Hello');
  });

  it('spec-level template (standalone) works correctly', () => {
    const { engine } = setup();

    const spec: Spec = {
      root: 'greeting',
      templates: {
        'labeled-text': {
          type: 'text',
          props: {
            content: { $prop: 'label' },
          },
        },
      },
      elements: {
        greeting: {
          type: 'labeled-text',
          props: { label: 'Hello World' },
        },
      },
    };

    const rendered = engine.render(spec);

    // When a template is used directly (not inside a custom element),
    // template dispatch works correctly.
    expect(rendered.type).toBe('text');
    expect(rendered.props.content).toBe('Hello World');
  });
});
