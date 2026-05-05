import { describe, it, expect } from 'vitest';
import { createMythik } from '../../src/factory.js';
import type { Spec } from '../../src/types.js';

describe('Dynamic Styles (engine integration)', () => {
  function mockPrimitive(type: string) {
    return (props: Record<string, unknown>, children: unknown[]) => ({ type, props, children });
  }

  function setup(state: Record<string, unknown> = {}, tokens: Record<string, unknown> = {}) {
    const svc = createMythik({ initialState: state, tokens });
    svc.plugins.registerPrimitive('box', mockPrimitive('box'));
    svc.plugins.registerPrimitive('text', mockPrimitive('text'));
    svc.applyPlugins();
    return svc;
  }

  it('resolves $token inside style props', () => {
    const svc = setup({}, { colors: { primary: '#E63946' }, radius: { lg: 16 } });
    const spec: Spec = {
      root: 'card',
      elements: {
        card: {
          type: 'box',
          props: {
            style: {
              backgroundColor: { $token: 'colors.primary' },
              borderRadius: { $token: 'radius.lg' },
            },
          },
        },
      },
    };
    const tree = svc.engine.render(spec);
    expect(tree.props.style).toEqual({ backgroundColor: '#E63946', borderRadius: 16 });
  });

  it('resolves $cond inside style props', () => {
    const svc = setup({ form: { isValid: true } }, { colors: { success: '#2A9D8F', muted: '#6B7280' } });
    const spec: Spec = {
      root: 'btn',
      elements: {
        btn: {
          type: 'box',
          props: {
            style: {
              backgroundColor: {
                $cond: { $state: '/form/isValid' },
                $then: { $token: 'colors.success' },
                $else: { $token: 'colors.muted' },
              },
            },
          },
        },
      },
    };
    const tree = svc.engine.render(spec);
    expect(tree.props.style).toEqual({ backgroundColor: '#2A9D8F' });
  });

  it('resolves $breakpoint inside style props', () => {
    const svc = setup({ ui: { viewportWidth: 800 } });
    const spec: Spec = {
      root: 'grid',
      elements: {
        grid: {
          type: 'box',
          props: {
            style: {
              gridTemplateColumns: { $breakpoint: { sm: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr' } },
            },
          },
        },
      },
    };
    const tree = svc.engine.render(spec);
    expect(tree.props.style).toEqual({ gridTemplateColumns: '1fr 1fr' });
  });

  it('resolves $token with multiply inside style', () => {
    const svc = setup({}, { spacing: { unit: 8 } });
    const spec: Spec = {
      root: 'padded',
      elements: {
        padded: {
          type: 'box',
          props: {
            style: {
              padding: { $token: 'spacing.unit', multiply: 2 },
              margin: { $token: 'spacing.unit', multiply: 4 },
            },
          },
        },
      },
    };
    const tree = svc.engine.render(spec);
    expect(tree.props.style).toEqual({ padding: 16, margin: 32 });
  });

  it('resolves nested $cond with $token in both branches', () => {
    const svc = setup(
      { user: { role: 'admin' } },
      { colors: { admin: '#E63946', user: '#457B9D' } },
    );
    const spec: Spec = {
      root: 'badge',
      elements: {
        badge: {
          type: 'box',
          props: {
            style: {
              color: {
                $cond: { $state: '/user/role', eq: 'admin' },
                $then: { $token: 'colors.admin' },
                $else: { $token: 'colors.user' },
              },
            },
          },
        },
      },
    };
    const tree = svc.engine.render(spec);
    expect(tree.props.style).toEqual({ color: '#E63946' });
  });

  it('handles mixed static and dynamic style values', () => {
    const svc = setup({}, { colors: { bg: '#1d1d2b' } });
    const spec: Spec = {
      root: 'mix',
      elements: {
        mix: {
          type: 'box',
          props: {
            style: {
              backgroundColor: { $token: 'colors.bg' },
              display: 'flex',
              width: '100%',
              gap: 16,
            },
          },
        },
      },
    };
    const tree = svc.engine.render(spec);
    expect(tree.props.style).toEqual({
      backgroundColor: '#1d1d2b',
      display: 'flex',
      width: '100%',
      gap: 16,
    });
  });
});
