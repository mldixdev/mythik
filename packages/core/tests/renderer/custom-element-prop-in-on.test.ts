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
  for (const type of ['touchable', 'text', 'button']) {
    primitiveRegistry.register(type, (props, children) => ({ type, props, children }));
  }
  const elementRegistry = createElementRegistry();
  const engine = createRenderEngine({ resolver, primitiveRegistry, elementRegistry });
  return { engine, elementRegistry };
}

describe('Custom element — $prop resolution inside on (event bindings)', () => {
  it('resolves $prop pointing to an action array in on.press', () => {
    const { engine, elementRegistry } = setup();

    elementRegistry.register({
      type: 'action-button',
      props: {
        label: { type: 'string' },
        onSelect: { type: 'array' },
      },
      render: {
        type: 'touchable',
        props: {},
        on: {
          press: { $prop: 'onSelect' },
        },
        children: [
          { type: 'text', props: { content: { $prop: 'label' } } },
        ],
      },
    });

    const actionChain = [
      { action: 'setState', params: { statePath: '/filter/recordType', value: '3' } },
      { action: 'setState', params: { statePath: '/pagination/page', value: 0 } },
    ];

    const spec: Spec = {
      root: 'r',
      elements: {
        r: {
          type: 'action-button',
          props: {
            label: 'Click me',
            onSelect: actionChain,
          },
        },
      },
    };

    const rendered = engine.render(spec);
    // The outer primitive should have _eventBindings with the RESOLVED action array, not the raw { $prop } expression.
    const bindings = rendered.props._eventBindings as Record<string, unknown>;
    expect(bindings).toBeDefined();
    expect(bindings.press).toBeDefined();
    // press should equal the resolved action array (or an array of action objects), NOT a { $prop } expression.
    const press = bindings.press;
    expect(Array.isArray(press) ? press : [press]).toMatchObject([
      { action: 'setState', params: { statePath: '/filter/recordType', value: '3' } },
      { action: 'setState', params: { statePath: '/pagination/page', value: 0 } },
    ]);
  });

  // ───────────────────────────────────────────────────────────────────
  // v49 Item D regression — element.on lazy behavior must remain intact
  // (currentPath threading in resolveDeep should NOT affect element.on
  //  resolution; that path is handled separately at engine.ts:996-1049)
  // ───────────────────────────────────────────────────────────────────

  it('v49-D regression: element.on with plain action array outside repeat stays passthrough (v47 ee8b7f9)', () => {
    const { engine } = setup();

    const rawAction = { action: 'setState', params: { value: { $state: '/count' } } };

    const spec: Spec = {
      root: 'btn-1',
      elements: {
        'btn-1': {
          type: 'button',
          props: { label: 'click' },
          on: { click: rawAction },
        },
      },
    };

    const tree = engine.render(spec);
    const node = tree as { props?: { _eventBindings?: Record<string, unknown> } };
    // Outside a repeat, plain bindings are stored verbatim (raw)
    expect(node.props?._eventBindings?.click).toBe(rawAction);
  });

  it('v49-D regression: element.on with $prop binding inside custom-element resolves at render (v47 f771c6f)', () => {
    const { engine, elementRegistry } = setup();

    elementRegistry.register({
      type: 'wrap-button',
      props: {
        label: { type: 'string' },
        onAction: { type: 'array' },
      },
      render: {
        type: 'button',
        props: { label: { $prop: 'label' } },
        on: { click: { $prop: 'onAction' } },
      },
    });

    const consumerActionChain = [{ action: 'navigate', params: { to: '/home' } }];

    const spec: Spec = {
      root: 'r',
      elements: {
        r: {
          type: 'wrap-button',
          props: {
            label: 'go',
            onAction: consumerActionChain,
          },
        },
      },
    };

    const tree = engine.render(spec);
    const node = tree as { props?: { _eventBindings?: Record<string, unknown> } };
    expect(node.props?._eventBindings?.click).toEqual(consumerActionChain);
  });
});
