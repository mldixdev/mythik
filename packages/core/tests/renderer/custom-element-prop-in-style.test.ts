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
  for (const type of ['stack', 'box', 'text', 'icon']) {
    primitiveRegistry.register(type, (props, children) => ({ type, props, children }));
  }
  const elementRegistry = createElementRegistry();
  const engine = createRenderEngine({ resolver, primitiveRegistry, tokens, elementRegistry });
  return { engine, elementRegistry };
}

describe('Custom element — $prop resolution inside style object', () => {
  it('resolves $prop inside nested style property (e.g. style.background)', () => {
    const { engine, elementRegistry } = setup();

    elementRegistry.register({
      type: 'gradient-bar',
      props: { bg: { type: 'string' } },
      render: {
        type: 'box',
        props: {
          style: {
            height: 4,
            background: { $prop: 'bg' },
          },
        },
      },
    });

    const spec: Spec = {
      root: 'r',
      elements: {
        r: { type: 'gradient-bar', props: { bg: 'linear-gradient(90deg, red, blue)' } },
      },
    };
    const rendered = engine.render(spec);
    // The box primitive should receive style.background with the resolved $prop value
    expect(rendered.type).toBe('box');
    expect(rendered.props.style).toMatchObject({
      height: 4,
      background: 'linear-gradient(90deg, red, blue)',
    });
  });

  it('resolves $prop inside nested style when prop value comes from variant (not consumer)', () => {
    const { engine, elementRegistry } = setup();

    elementRegistry.register({
      type: 'gradient-bar',
      props: { bg: { type: 'string' } },
      variants: {
        primary: { props: { bg: 'linear-gradient(90deg, red, blue)' } },
      },
      render: {
        type: 'box',
        props: {
          style: {
            height: 4,
            background: { $prop: 'bg' },
          },
        },
      },
    });

    const spec: Spec = {
      root: 'r',
      elements: {
        // Consumer provides NO bg prop — variant.props.bg should fill in.
        // Convention: `variant` is a PROP, not a top-level element field.
        r: { type: 'gradient-bar', props: { variant: 'primary' } },
      },
    };
    const rendered = engine.render(spec);
    expect(rendered.type).toBe('box');
    expect(rendered.props.style).toMatchObject({
      height: 4,
      background: 'linear-gradient(90deg, red, blue)',
    });
  });

  it('resolves $prop inside deeply-nested render tree style', () => {
    const { engine, elementRegistry } = setup();

    elementRegistry.register({
      type: 'icon-card',
      props: { iconBg: { type: 'string' }, iconName: { type: 'string' } },
      render: {
        type: 'stack',
        props: { direction: 'vertical' },
        children: [
          {
            type: 'box',
            props: {
              style: {
                width: 36,
                background: { $prop: 'iconBg' },
              },
            },
            children: [
              { type: 'icon', props: { name: { $prop: 'iconName' } } },
            ],
          },
        ],
      },
    });

    const spec: Spec = {
      root: 'r',
      elements: {
        r: { type: 'icon-card', props: { iconBg: 'linear-gradient(135deg, teal, cyan)', iconName: 'wallet' } },
      },
    };
    const rendered = engine.render(spec);
    expect(rendered.type).toBe('stack');
    const iconBox = (rendered.children as Array<{ type: string; props: Record<string, unknown>; children: unknown[] }>)[0];
    expect(iconBox.type).toBe('box');
    expect(iconBox.props.style).toMatchObject({
      width: 36,
      background: 'linear-gradient(135deg, teal, cyan)',
    });
    const icon = (iconBox.children as Array<{ type: string; props: Record<string, unknown> }>)[0];
    expect(icon.type).toBe('icon');
    expect(icon.props.name).toBe('wallet');
  });
});
