import { describe, it, expect } from 'vitest';
import { createMythik } from '../../src/factory.js';
import type { Spec } from '../../src/types.js';

function mockPrimitive(type: string) {
  return (props: Record<string, unknown>, children: unknown[]) => ({ type, props, children });
}

function createSvcWithPrimitives(tokens?: Record<string, unknown>) {
  const svc = createMythik({ tokens });
  svc.plugins.registerPrimitive('text', mockPrimitive('text'));
  svc.applyPlugins();
  return svc;
}

describe('Custom element — variants resolve', () => {
  it('ElementDefinition.variants wins (applies style from variant spec)', () => {
    const svc = createSvcWithPrimitives();

    svc.elements.register({
      type: 'btn',
      props: { label: { type: 'string', default: 'Click' } },
      variants: {
        primary: { style: { backgroundColor: 'blue' } },
      },
      render: {
        type: 'text',
        props: { content: { $prop: 'label' } },
      },
    });

    const spec: Spec = {
      root: 'r',
      elements: { r: { type: 'btn', props: { variant: 'primary', label: 'Go' } } },
    };
    const rendered = svc.engine.render(spec);
    expect(rendered.props.style).toMatchObject({ backgroundColor: 'blue' });
  });

  it('tokens.components fallback works when ElementDefinition.variants has no match', () => {
    const svc = createSvcWithPrimitives({
      components: {
        btn: {
          variants: {
            danger: { style: { backgroundColor: 'red' } },
          },
        },
      },
    });

    svc.elements.register({
      type: 'btn',
      props: { label: { type: 'string', default: 'Click' } },
      // No definition-level variants.
      render: {
        type: 'text',
        props: { content: { $prop: 'label' } },
      },
    });

    const spec: Spec = {
      root: 'r',
      elements: { r: { type: 'btn', props: { variant: 'danger', label: 'Delete' } } },
    };
    const rendered = svc.engine.render(spec);
    expect(rendered.props.style).toMatchObject({ backgroundColor: 'red' });
  });

  it('variant.props override defaults but lose to consumer props', () => {
    const svc = createSvcWithPrimitives();

    svc.elements.register({
      type: 'btn',
      props: { label: { type: 'string', default: 'Default' } },
      variants: {
        shout: { props: { label: 'VARIANT-LABEL' } },
      },
      render: {
        type: 'text',
        props: { content: { $prop: 'label' } },
      },
    });

    // Consumer label wins over variant.
    const spec1: Spec = {
      root: 'r',
      elements: { r: { type: 'btn', props: { variant: 'shout', label: 'consumer wins' } } },
    };
    expect(svc.engine.render(spec1).props.content).toBe('consumer wins');

    // No consumer label → variant label wins over default.
    const spec2: Spec = {
      root: 'r',
      elements: { r: { type: 'btn', props: { variant: 'shout' } } },
    };
    expect(svc.engine.render(spec2).props.content).toBe('VARIANT-LABEL');
  });
});
