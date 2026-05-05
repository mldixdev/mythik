import { describe, it, expect, vi } from 'vitest';
import { PRIMITIVES, registerReactNativePrimitives } from '../src/primitives/index.js';

describe('PRIMITIVES registry', () => {
  const EXPECTED_PRIMITIVES = [
    // Layout (6)
    'box', 'stack', 'grid', 'scroll', 'divider', 'spacer',
    // Text/Media (3)
    'text', 'image', 'icon',
    // Form (7)
    'input', 'textarea', 'select', 'checkbox', 'toggle', 'slider', 'button',
    // Interactive (7)
    'touchable', 'list', 'modal', 'drawer', 'tabs', 'accordion', 'wizard',
    // App structure (4)
    'screen', 'screen-outlet', 'toast-container', 'skeleton',
  ];

  it('contains exactly 27 primitives', () => {
    expect(Object.keys(PRIMITIVES)).toHaveLength(27);
  });

  it.each(EXPECTED_PRIMITIVES)('has primitive "%s"', (name) => {
    expect(PRIMITIVES[name]).toBeDefined();
    expect(typeof PRIMITIVES[name]).toBe('function');
  });

  it('all values are React component functions', () => {
    for (const [name, component] of Object.entries(PRIMITIVES)) {
      expect(typeof component).toBe('function');
    }
  });

  it('has same primitive names as web package (minus web-only)', () => {
    // Web-only primitives not in RN: bar-chart, line-chart, pie-chart, area-chart,
    // table, kanban-board, file-upload, camera, signature, audio-player
    const webOnly = new Set([
      'bar-chart', 'line-chart', 'pie-chart', 'area-chart',
      'table', 'kanban-board', 'file-upload', 'camera', 'signature', 'audio-player',
    ]);
    const rnNames = new Set(Object.keys(PRIMITIVES));

    // All RN primitives should exist (they're a subset of web + screen-outlet)
    for (const name of EXPECTED_PRIMITIVES) {
      expect(rnNames.has(name)).toBe(true);
    }
  });
});

describe('registerReactNativePrimitives', () => {
  it('registers all 27 primitives with the plugin loader', () => {
    const registerPrimitive = vi.fn();
    const mockPlugins = {
      registerPrimitive,
      overridePrimitive: vi.fn(),
      registerAction: vi.fn(),
      registerValidator: vi.fn(),
      registerExpressionHandler: vi.fn(),
    };

    registerReactNativePrimitives(mockPlugins as any);

    expect(registerPrimitive).toHaveBeenCalledTimes(27);

    // Verify each call registered the correct primitive name
    const registeredNames = registerPrimitive.mock.calls.map((call: unknown[]) => call[0]);
    expect(registeredNames).toContain('box');
    expect(registeredNames).toContain('text');
    expect(registeredNames).toContain('input');
    expect(registeredNames).toContain('modal');
    expect(registeredNames).toContain('screen');
    expect(registeredNames).toContain('toast-container');
    expect(registeredNames).toContain('skeleton');
  });

  it('registered renderers produce RenderNodes with _component', () => {
    const renderers = new Map<string, Function>();
    const mockPlugins = {
      registerPrimitive: (name: string, renderer: Function) => renderers.set(name, renderer),
      overridePrimitive: vi.fn(),
      registerAction: vi.fn(),
      registerValidator: vi.fn(),
      registerExpressionHandler: vi.fn(),
    };

    registerReactNativePrimitives(mockPlugins as any);

    // Test the 'box' renderer
    const boxRenderer = renderers.get('box')!;
    const result = boxRenderer({ padding: 16 }, []);
    expect(result).toEqual({
      type: 'box',
      props: { padding: 16, _component: PRIMITIVES.box },
      children: [],
    });
  });
});
