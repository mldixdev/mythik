import { describe, it, expect } from 'vitest';
import { createRenderEngine } from '../../src/renderer/engine.js';
import { createPrimitiveRegistry } from '../../src/renderer/registry.js';
import { createStateStore } from '../../src/state/store.js';
import { createResolver } from '../../src/expressions/resolver.js';
import { createElementRegistry } from '../../src/elements/composer.js';
import type { Spec } from '../../src/types.js';

describe('propContext threading baseline (Task 6 refactor pins current behavior)', () => {
  function setup() {
    const store = createStateStore({});
    const resolver = createResolver({ store });
    const primitiveRegistry = createPrimitiveRegistry();
    const elementRegistry = createElementRegistry();

    for (const type of ['stack', 'text', 'box', 'button']) {
      primitiveRegistry.register(type, (props, children) => ({ type, props, children }));
    }

    const engine = createRenderEngine({ resolver, primitiveRegistry, elementRegistry });
    return { engine, elementRegistry };
  }

  it('$prop resolves inside props when propContext is active (custom element branch)', () => {
    const { engine, elementRegistry } = setup();

    elementRegistry.register({
      type: 'rating',
      props: { label: { type: 'string', default: 'rate' } },
      render: {
        type: 'text',
        props: { content: { $prop: 'label' } },
      },
    });

    const spec: Spec = {
      root: 'r',
      elements: {
        r: { type: 'rating', props: { label: 'Rate me' } },
      },
    };
    const rendered = engine.render(spec);
    expect(rendered.type).toBe('text');
    expect(rendered.props.content).toBe('Rate me');
  });

  it('$prop resolves inside props.style when propContext is active', () => {
    const { engine, elementRegistry } = setup();

    elementRegistry.register({
      type: 'box-with-pad',
      props: { pad: { type: 'number', default: 8 } },
      render: {
        type: 'box',
        // style passed through props (not top-level style field) so it
        // flows through the renderWithProps props resolution path.
        props: { style: { padding: { $prop: 'pad' } } },
      },
    });

    const spec: Spec = {
      root: 'r',
      elements: {
        r: { type: 'box-with-pad', props: { pad: 24 } },
      },
    };
    const rendered = engine.render(spec);
    // props.style.padding should resolve to 24 via $prop context.
    const style = (rendered.props.style as Record<string, unknown> | undefined) ?? {};
    expect(style.padding).toBe(24);
  });

  it('$prop combined with $state resolves both when propContext is active', () => {
    const store = createStateStore({ feature: { enabled: true } });
    const resolver = createResolver({ store });
    const primitiveRegistry = createPrimitiveRegistry();
    const elementRegistry = createElementRegistry();

    for (const type of ['stack', 'text', 'box', 'button']) {
      primitiveRegistry.register(type, (props, children) => ({ type, props, children }));
    }

    const engine = createRenderEngine({ resolver, primitiveRegistry, elementRegistry });

    elementRegistry.register({
      type: 'mixed',
      props: {
        label: { type: 'string', default: '' },
        showBorder: { type: 'boolean', default: false },
      },
      render: {
        type: 'box',
        props: {
          // $cond reads $state; the $then branch comes from $prop
          testId: {
            $cond: { $state: '/feature/enabled' },
            $then: { $prop: 'label' },
            $else: 'fallback',
          },
        },
      },
    });

    const spec: Spec = {
      root: 'r',
      elements: { r: { type: 'mixed', props: { label: 'hello' } } },
    };

    // State is true → $then branch → $prop resolves to 'hello'
    const r1 = engine.render(spec);
    expect(r1.props.testId).toBe('hello');

    // Flip state → $else branch → literal 'fallback'
    store.set('/feature/enabled', false);
    const r2 = engine.render(spec, new Set(['/feature/enabled']));
    expect(r2.props.testId).toBe('fallback');
  });
});
