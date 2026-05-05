import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MythikRenderer } from '../src/MythikRenderer.js';
import { createMythik, resolveTokens } from 'mythik';
import { registerReactPrimitives } from '../src/primitives/index.js';
import type { Spec, DesignTokens } from 'mythik';

describe('Design System Integration', () => {
  const baseTokens: DesignTokens = {
    colors: { primary: '#E63946', background: '#ffffff', text: '#1a1a1a' },
    spacing: { unit: 8, scale: [0, 4, 8, 16, 24, 32] },
    radius: { sm: 4, md: 8, lg: 16 },
    typography: { heading: { family: 'Playfair Display', weight: 700 }, body: { family: 'Inter', weight: 400 } },
    modes: {
      dark: { colors: { background: '#1d1d2b', text: '#f1faee' } },
    },
  };

  it('renders with $token resolved to actual values', () => {
    const svc = createMythik({
      initialState: {},
      tokens: resolveTokens(baseTokens),
    });
    registerReactPrimitives(svc.plugins);
    svc.applyPlugins();

    const spec: Spec = {
      root: 'card',
      elements: {
        card: {
          type: 'box',
          props: { style: { backgroundColor: { $token: 'colors.primary' } } },
          children: ['title'],
        },
        title: {
          type: 'text',
          props: { content: 'Token Test' },
        },
      },
    };

    // The resolver should resolve $token in style props
    const tree = svc.engine.render(spec);
    // style prop should have $token resolved
    expect(tree.props.style).toEqual({ backgroundColor: '#E63946' });
  });

  it('resolves dark mode tokens', () => {
    const darkTokens = resolveTokens(baseTokens, 'dark');
    const svc = createMythik({
      initialState: {},
      tokens: darkTokens,
    });
    registerReactPrimitives(svc.plugins);
    svc.applyPlugins();

    const spec: Spec = {
      root: 'page',
      elements: {
        page: {
          type: 'box',
          props: { style: { backgroundColor: { $token: 'colors.background' } } },
          children: ['text'],
        },
        text: {
          type: 'text',
          props: { content: 'Dark Mode' },
        },
      },
    };

    const tree = svc.engine.render(spec);
    expect(tree.props.style).toEqual({ backgroundColor: '#1d1d2b' });
  });

  it('resolves $token with multiply for spacing', () => {
    const svc = createMythik({
      initialState: {},
      tokens: resolveTokens(baseTokens),
    });
    registerReactPrimitives(svc.plugins);
    svc.applyPlugins();

    const spec: Spec = {
      root: 'padded',
      elements: {
        padded: {
          type: 'box',
          props: { style: { padding: { $token: 'spacing.unit', multiply: 3 } } },
          children: ['inner'],
        },
        inner: { type: 'text', props: { content: 'Padded' } },
      },
    };

    const tree = svc.engine.render(spec);
    expect(tree.props.style).toEqual({ padding: 24 }); // 8 * 3
  });

  it('resolves $breakpoint for responsive values', () => {
    const svc = createMythik({
      initialState: { ui: { viewportWidth: 1200 } },
      tokens: resolveTokens(baseTokens),
    });
    registerReactPrimitives(svc.plugins);
    svc.applyPlugins();

    const spec: Spec = {
      root: 'grid',
      elements: {
        grid: {
          type: 'grid',
          props: { columns: { $breakpoint: { sm: 1, md: 2, lg: 3 } } },
        },
      },
    };

    const tree = svc.engine.render(spec);
    expect(tree.props.columns).toBe(3);
  });

  it('renders full styled card end-to-end', () => {
    const svc = createMythik({
      initialState: { user: { name: 'Alice' } },
      tokens: resolveTokens(baseTokens),
    });
    registerReactPrimitives(svc.plugins);
    svc.applyPlugins();

    const spec: Spec = {
      root: 'card',
      elements: {
        card: {
          type: 'stack',
          props: {
            direction: 'vertical',
            gap: { $token: 'spacing.scale.3' },
            style: {
              backgroundColor: { $token: 'colors.background' },
              borderRadius: { $token: 'radius.lg' },
              padding: { $token: 'spacing.unit', multiply: 3 },
            },
          },
          children: ['name', 'btn'],
        },
        name: {
          type: 'text',
          props: { content: { $template: 'Hello, ${/user/name}!' }, variant: 'heading' },
        },
        btn: {
          type: 'button',
          props: {
            label: 'Continue',
            style: { backgroundColor: { $token: 'colors.primary' } },
          },
        },
      },
    };

    render(<MythikRenderer spec={spec} instance={svc} />);
    expect(screen.getByText('Hello, Alice!')).toBeTruthy();
    expect(screen.getByText('Continue')).toBeTruthy();
  });
});
