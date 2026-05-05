import { describe, it, expect } from 'vitest';
import { createRenderEngine } from '../../src/renderer/engine.js';
import { createPrimitiveRegistry } from '../../src/renderer/registry.js';
import { createStateStore } from '../../src/state/store.js';
import { createResolver } from '../../src/expressions/resolver.js';
import type { Spec } from '../../src/types.js';

describe('Motion & Interaction Resolution', () => {
  const defaultTokens = {
    colors: { primary: '#0D9488', primaryHover: '#0F766E' },
    motion: { duration: { fast: 150 } },
  };

  function setup(initialState: Record<string, unknown> = {}) {
    const store = createStateStore(initialState);
    const resolver = createResolver({ store, tokens: defaultTokens });
    const primitiveRegistry = createPrimitiveRegistry();
    for (const type of ['stack', 'text', 'box', 'button', 'modal', 'drawer']) {
      primitiveRegistry.register(type, (props, children) => ({ type, props, children }));
    }
    const engine = createRenderEngine({
      resolver,
      primitiveRegistry,
      tokens: defaultTokens,
    });
    return { engine, store };
  }

  it('passes hover as _hover in resolved props', () => {
    const spec: Spec = {
      root: 'btn',
      elements: {
        btn: {
          type: 'button',
          props: { label: 'Click' },
          hover: { scale: 1.03 },
        },
      },
    };
    const { engine } = setup();
    const tree = engine.render(spec);
    expect(tree.props._hover).toEqual({ scale: 1.03 });
  });

  it('resolves $token expressions inside hover', () => {
    const spec: Spec = {
      root: 'btn',
      elements: {
        btn: {
          type: 'button',
          props: { label: 'Click' },
          hover: { backgroundColor: { $token: 'colors.primaryHover' } },
        },
      },
    };
    const { engine } = setup();
    const tree = engine.render(spec);
    expect(tree.props._hover).toEqual({ backgroundColor: '#0F766E' });
  });

  it('passes active as _active', () => {
    const spec: Spec = {
      root: 'btn',
      elements: {
        btn: {
          type: 'button',
          props: { label: 'Click' },
          active: { scale: 0.97 },
        },
      },
    };
    const { engine } = setup();
    const tree = engine.render(spec);
    expect(tree.props._active).toEqual({ scale: 0.97 });
  });

  it('passes focus as _focus', () => {
    const spec: Spec = {
      root: 'inp',
      elements: {
        inp: {
          type: 'box',
          props: {},
          focus: { boxShadow: '0 0 0 3px rgba(13,148,136,0.3)' },
        },
      },
    };
    const { engine } = setup();
    const tree = engine.render(spec);
    expect(tree.props._focus).toEqual({ boxShadow: '0 0 0 3px rgba(13,148,136,0.3)' });
  });

  it('resolves $token in transition', () => {
    const spec: Spec = {
      root: 'btn',
      elements: {
        btn: {
          type: 'button',
          props: { label: 'Click' },
          hover: { scale: 1.03 },
          transition: { duration: { $token: 'motion.duration.fast' } as unknown, ease: 'easeOut' },
        },
      },
    };
    const { engine } = setup();
    const tree = engine.render(spec);
    expect(tree.props._transition).toEqual({ duration: 150, ease: 'easeOut' });
  });

  it('passes motion.initial and motion.animate as _motion', () => {
    const spec: Spec = {
      root: 'card',
      elements: {
        card: {
          type: 'box',
          props: {},
          motion: {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.3 },
          },
        },
      },
    };
    const { engine } = setup();
    const tree = engine.render(spec);
    expect(tree.props._motion).toEqual({
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.3 },
    });
  });

  it('does NOT add _hover/_active/_focus when not specified', () => {
    const spec: Spec = {
      root: 'txt',
      elements: {
        txt: { type: 'text', props: { content: 'Hello' } },
      },
    };
    const { engine } = setup();
    const tree = engine.render(spec);
    expect(tree.props._hover).toBeUndefined();
    expect(tree.props._active).toBeUndefined();
    expect(tree.props._focus).toBeUndefined();
    expect(tree.props._transition).toBeUndefined();
    expect(tree.props._motion).toBeUndefined();
  });

  it('resolves $state expressions inside hover', () => {
    const spec: Spec = {
      root: 'btn',
      elements: {
        btn: {
          type: 'button',
          props: { label: 'Click' },
          hover: { backgroundColor: { $state: '/theme/hoverColor' } as unknown },
        },
      },
    };
    const { engine } = setup({ theme: { hoverColor: '#FF0000' } });
    const tree = engine.render(spec);
    expect(tree.props._hover).toEqual({ backgroundColor: '#FF0000' });
  });

  it('passes motion.exit as part of _motion', () => {
    const spec: Spec = {
      root: 'card',
      elements: {
        card: {
          type: 'box',
          props: {},
          motion: {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0, y: -10 },
          },
        },
      },
    };
    const { engine } = setup();
    const tree = engine.render(spec);
    expect(tree.props._motion).toEqual({
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0, y: -10 },
    });
  });

  it('resolves $token inside motion.initial', () => {
    const spec: Spec = {
      root: 'card',
      elements: {
        card: {
          type: 'box',
          props: {},
          motion: {
            initial: { opacity: 0, backgroundColor: { $token: 'colors.primary' } as unknown },
            animate: { opacity: 1 },
          },
        },
      },
    };
    const { engine } = setup();
    const tree = engine.render(spec);
    const motion = tree.props._motion as Record<string, unknown>;
    expect((motion.initial as Record<string, unknown>).backgroundColor).toBe('#0D9488');
  });
});
