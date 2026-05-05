import { describe, it, expect } from 'vitest';
import { createMythik } from '../../src/factory.js';

function mockPrimitive(type: string) {
  return (props: Record<string, unknown>, children: unknown[]) => ({ type, props, children });
}

function createSvcWithPrimitive(tokens?: Record<string, unknown>) {
  const svc = createMythik({ tokens });
  svc.plugins.registerPrimitive('box', mockPrimitive('box'));
  svc.applyPlugins();
  return svc;
}

describe('createMythik with deep tokens', () => {
  it('resolves DNA tokens at initialization', () => {
    const svc = createSvcWithPrimitive({ dna: { primary: '#0D9488', roundness: 0.8 } });
    const spec = {
      root: 'el',
      elements: { el: { type: 'box', props: {} } },
    };
    const tree = svc.engine.render(spec);
    const tokens = tree.props._tokens as Record<string, unknown>;
    expect(tokens).toBeDefined();
    const shape = tokens.shape as { radius: Record<string, number> };
    expect(shape.radius.md).toBeGreaterThan(10); // roundness 0.8 → radius.md ~14
  });

  it('works without tokens (uses defaults)', () => {
    const svc = createSvcWithPrimitive();
    const spec = {
      root: 'el',
      elements: { el: { type: 'box', props: {} } },
    };
    const tree = svc.engine.render(spec);
    const tokens = tree.props._tokens as Record<string, unknown>;
    expect(tokens).toBeDefined();
    const shape = tokens.shape as { radius: Record<string, number> };
    expect(shape.radius.md).toBe(8); // default
  });

  it('manual color override wins over DNA', () => {
    const svc = createSvcWithPrimitive({
      dna: { primary: '#0D9488' },
      colors: { primary: '#FF0000' },
    });
    const spec = {
      root: 'el',
      elements: { el: { type: 'box', props: {} } },
    };
    const tree = svc.engine.render(spec);
    const tokens = tree.props._tokens as Record<string, unknown>;
    const colors = tokens.colors as Record<string, string>;
    expect(colors.primary).toBe('#FF0000');
  });
});
