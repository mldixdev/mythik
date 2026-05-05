import { describe, it, expect, vi } from 'vitest';
import { createRenderEngine } from '../../src/renderer/engine.js';
import { createResolver } from '../../src/expressions/resolver.js';
import { createPrimitiveRegistry } from '../../src/renderer/registry.js';
import { createStateStore } from '../../src/state/store.js';
import type { Spec } from '../../src/types.js';

function setupEngine(tokens?: Record<string, unknown>) {
  const store = createStateStore();
  const resolver = createResolver({ store, tokens });
  const primitiveRegistry = createPrimitiveRegistry();
  primitiveRegistry.register('button', (props, children) => ({ type: 'button', props, children }));
  primitiveRegistry.register('box', (props, children) => ({ type: 'box', props, children }));
  primitiveRegistry.register('text', (props, children) => ({ type: 'text', props, children }));
  primitiveRegistry.register('stack', (props, children) => ({ type: 'stack', props, children }));
  const engine = createRenderEngine({ resolver, primitiveRegistry, tokens });
  return { store, engine };
}

describe('engine variant resolution', () => {
  const tokens = {
    colors: { primary: '#0D9488', surface: '#FFF', text: '#0F172A' },
    radius: { md: 12 },
    components: {
      button: {
        primary: {
          style: { backgroundColor: '$colors.primary', color: '#FFF', borderRadius: '$radius.md' },
          hover: { scale: 1.05 },
          active: { scale: 0.95 },
          transition: { duration: 0.15 },
        },
      },
      box: {
        card: {
          style: { backgroundColor: '$colors.surface', borderRadius: 16 },
        },
      },
    },
  };

  it('applies variant style from tokens.components', () => {
    const { engine } = setupEngine(tokens);
    const spec: Spec = {
      root: 'btn',
      elements: { btn: { type: 'button', props: { label: 'Click', variant: 'primary' } } },
    };
    const tree = engine.render(spec);
    expect(tree.props.style?.backgroundColor).toBe('#0D9488');
    expect(tree.props.style?.borderRadius).toBe(12);
  });

  it('applies variant hover/active/transition', () => {
    const { engine } = setupEngine(tokens);
    const spec: Spec = {
      root: 'btn',
      elements: { btn: { type: 'button', props: { variant: 'primary' } } },
    };
    const tree = engine.render(spec);
    expect(tree.props._hover).toEqual({ scale: 1.05 });
    expect(tree.props._active).toEqual({ scale: 0.95 });
    expect(tree.props._transition).toEqual({ duration: 0.15 });
  });

  it('element style overrides variant style', () => {
    const { engine } = setupEngine(tokens);
    const spec: Spec = {
      root: 'btn',
      elements: {
        btn: {
          type: 'button',
          props: { variant: 'primary' },
          style: { borderRadius: 20 },
        },
      },
    };
    const tree = engine.render(spec);
    expect(tree.props.style?.borderRadius).toBe(20);
    expect(tree.props.style?.backgroundColor).toBe('#0D9488');
  });

  it('element hover merges with variant hover', () => {
    const { engine } = setupEngine(tokens);
    const spec: Spec = {
      root: 'btn',
      elements: {
        btn: {
          type: 'button',
          props: { variant: 'primary' },
          hover: { rotate: 5 },
        },
      },
    };
    const tree = engine.render(spec);
    expect(tree.props._hover).toEqual({ scale: 1.05, rotate: 5 });
  });

  it('works for non-button types (box card)', () => {
    const { engine } = setupEngine(tokens);
    const spec: Spec = {
      root: 'c',
      elements: { c: { type: 'box', props: { variant: 'card' } } },
    };
    const tree = engine.render(spec);
    expect(tree.props.style?.backgroundColor).toBe('#FFF');
    expect(tree.props.style?.borderRadius).toBe(16);
  });

  it('renders normally without variant (backward compat)', () => {
    const { engine } = setupEngine(tokens);
    const spec: Spec = {
      root: 'btn',
      elements: { btn: { type: 'button', props: { label: 'Click' } } },
    };
    const tree = engine.render(spec);
    expect(tree.props._hover).toBeUndefined();
  });

  it('renders normally when tokens has no components', () => {
    const { engine } = setupEngine({ colors: { primary: '#000' } });
    const spec: Spec = {
      root: 'btn',
      elements: { btn: { type: 'button', props: { variant: 'primary' } } },
    };
    const tree = engine.render(spec);
    expect(tree.type).toBe('button');
  });

  it('warns on missing variant in dev mode', () => {
    const { engine } = setupEngine(tokens);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const spec: Spec = {
      root: 'btn',
      elements: { btn: { type: 'button', props: { variant: 'nonexistent' } } },
    };
    engine.render(spec);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('nonexistent'));
    warnSpy.mockRestore();
  });

  it('resolves $path against dark mode tokens', () => {
    const darkTokens = {
      ...tokens,
      modes: { dark: { colors: { primary: '#14B8A6', surface: '#1E293B' } } },
    };
    const { store, engine } = setupEngine(darkTokens);
    store.set('/preferences/theme', 'dark');
    const spec: Spec = {
      root: 'btn',
      elements: { btn: { type: 'button', props: { variant: 'primary' } } },
    };
    const tree = engine.render(spec);
    expect(tree.props.style?.backgroundColor).toBe('#14B8A6');
  });
});
