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

describe('Custom elements nested — $prop shadowing', () => {
  it('outer threads its own prop to inner, both render correctly', () => {
    const { engine, elementRegistry } = setup();

    elementRegistry.register({
      type: 'inner',
      props: { tag: { type: 'string' } },
      render: { type: 'text', props: { content: { $prop: 'tag' } } },
    });
    elementRegistry.register({
      type: 'outer',
      props: { label: { type: 'string' } },
      render: {
        type: 'stack',
        children: [
          { type: 'text', props: { content: { $prop: 'label' } } },
          // Thread outer's label through inner's tag prop.
          { type: 'inner', props: { tag: { $prop: 'label' } } },
        ],
      },
    });

    const spec: Spec = {
      root: 'r',
      elements: { r: { type: 'outer', props: { label: 'OUTER-LABEL' } } },
    };
    const rendered = engine.render(spec);
    expect(rendered.type).toBe('stack');
    // First child: text with outer's label.
    expect(rendered.children[0].props.content).toBe('OUTER-LABEL');
    // Second child: expanded inner — root is text with content = inner's tag = threaded outer label.
    expect(rendered.children[1].props.content).toBe('OUTER-LABEL');
  });

  it('inner $prop refers to inner props, not outer props with same name (shadowing)', () => {
    const { engine, elementRegistry } = setup();

    elementRegistry.register({
      type: 'inner',
      props: { label: { type: 'string' } },
      render: { type: 'text', props: { content: { $prop: 'label' } } },
    });
    elementRegistry.register({
      type: 'outer',
      props: { label: { type: 'string' } },
      render: {
        // outer's render directly uses inner with literal label="FIXED".
        // If $prop shadowing works, the rendered text should be 'FIXED' (inner's own props),
        // NOT 'OUTER' (outer's props).
        type: 'inner',
        props: { label: 'FIXED' },
      },
    });

    const spec: Spec = {
      root: 'r',
      elements: { r: { type: 'outer', props: { label: 'OUTER' } } },
    };
    const rendered = engine.render(spec);
    // Outer's render is directly 'inner' → inner's render is text → content='FIXED'.
    expect(rendered.type).toBe('text');
    expect(rendered.props.content).toBe('FIXED');
  });
});
