import { describe, it, expect } from 'vitest';
import { createMythik } from '../../src/factory.js';

function mockPrimitive(type: string) {
  return (props: Record<string, unknown>, children: unknown[]) => ({ type, props, children });
}

function createSvc(tokens?: Record<string, unknown>) {
  const svc = createMythik({ tokens });
  svc.plugins.registerPrimitive('box', mockPrimitive('box'));
  svc.plugins.registerPrimitive('text', mockPrimitive('text'));
  svc.plugins.registerPrimitive('button', mockPrimitive('button'));
  svc.applyPlugins();
  return svc;
}

const spec = {
  root: 'el',
  elements: { el: { type: 'box', props: {} } },
};

describe('updateTokens', () => {
  it('exists on MythikInstance', () => {
    const svc = createSvc();
    expect(typeof svc.updateTokens).toBe('function');
  });

  it('changes tokens at runtime — colors', () => {
    const svc = createSvc({ dna: { primary: '#0D9488' } });

    const tree1 = svc.engine.render(spec);
    const colors1 = (tree1.props._tokens as Record<string, unknown>).colors as Record<string, string>;
    const primary1 = colors1.primary;

    // Update to purple DNA
    svc.updateTokens({ dna: { primary: '#7C3AED' } });

    const tree2 = svc.engine.render(spec);
    const colors2 = (tree2.props._tokens as Record<string, unknown>).colors as Record<string, string>;
    const primary2 = colors2.primary;

    expect(primary1).not.toBe(primary2);
    expect(primary2).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('changes tokens at runtime — shape', () => {
    const svc = createSvc({ dna: { primary: '#000000', roundness: 0.2 } });

    const tree1 = svc.engine.render(spec);
    const shape1 = ((tree1.props._tokens as Record<string, unknown>).shape as { radius: Record<string, number> }).radius;

    svc.updateTokens({ dna: { primary: '#000000', roundness: 0.9 } });

    const tree2 = svc.engine.render(spec);
    const shape2 = ((tree2.props._tokens as Record<string, unknown>).shape as { radius: Record<string, number> }).radius;

    expect(shape2.md).toBeGreaterThan(shape1.md);
  });

  it('normalizes initial 0-100 DNA seeds through createMythik', () => {
    const legacyScale = createSvc({ dna: { primary: '#d4af37', roundness: 79 } });
    const canonicalScale = createSvc({ dna: { primary: '#d4af37', roundness: 0.79 } });

    const legacyTree = legacyScale.engine.render(spec);
    const canonicalTree = canonicalScale.engine.render(spec);
    const legacyRadius = ((legacyTree.props._tokens as Record<string, unknown>).shape as { radius: Record<string, number> }).radius;
    const canonicalRadius = ((canonicalTree.props._tokens as Record<string, unknown>).shape as { radius: Record<string, number> }).radius;

    expect(legacyRadius).toEqual(canonicalRadius);
  });

  it('bumps state counter to trigger React re-render', () => {
    const svc = createSvc();

    const v1 = svc.store.get('/internal/tokenVersion') as number | undefined;
    svc.updateTokens({ dna: { primary: '#FF0000' } });
    const v2 = svc.store.get('/internal/tokenVersion') as number;

    expect(v2).toBeGreaterThan(v1 ?? 0);
  });

  it('preserves existing state after updateTokens', () => {
    const svc = createSvc();
    svc.store.set('/user/name', 'Alice');

    svc.updateTokens({ dna: { primary: '#FF0000' } });

    expect(svc.store.get('/user/name')).toBe('Alice');
  });

  it('works with manual overrides (no DNA)', () => {
    const svc = createSvc();

    svc.updateTokens({ colors: { primary: '#FF0000' }, shape: { radius: { md: 99 } } });

    const tree = svc.engine.render(spec);
    const tokens = tree.props._tokens as Record<string, unknown>;
    expect((tokens.colors as Record<string, string>).primary).toBe('#FF0000');
    expect(((tokens.shape as { radius: Record<string, number> }).radius).md).toBe(99);
  });

  // --- Partial merge (P1: live controls) ---

  it('partial update merges with previous tokens — DNA roundness preserves primary', () => {
    const svc = createSvc();

    // First update: set primary + roundness
    svc.updateTokens({ dna: { primary: '#7C3AED', roundness: 20 } });

    const tree1 = svc.engine.render(spec);
    const colors1 = (tree1.props._tokens as Record<string, unknown>).colors as Record<string, string>;
    const primary1 = colors1.primary;

    // Second update: only change roundness — primary should be preserved
    svc.updateTokens({ dna: { roundness: 90 } });

    const tree2 = svc.engine.render(spec);
    const colors2 = (tree2.props._tokens as Record<string, unknown>).colors as Record<string, string>;
    const shape2 = ((tree2.props._tokens as Record<string, unknown>).shape as { radius: Record<string, number> }).radius;

    expect(colors2.primary).toBe(primary1); // primary preserved from first update
    expect(shape2.md).toBeGreaterThan(0); // roundness 90 applied
  });

  it('partial update merges with previous tokens — identity preserves DNA', () => {
    const svc = createSvc();

    // First: set DNA
    svc.updateTokens({ dna: { primary: '#EF4444' } });
    const tree1 = svc.engine.render(spec);
    const colors1 = (tree1.props._tokens as Record<string, unknown>).colors as Record<string, string>;

    // Second: set identity only — DNA should persist
    svc.updateTokens({ identity: { surface: 'bold' } });
    const tree2 = svc.engine.render(spec);
    const colors2 = (tree2.props._tokens as Record<string, unknown>).colors as Record<string, string>;
    const identity2 = (tree2.props._tokens as Record<string, unknown>).identity as Record<string, unknown>;

    expect(colors2.primary).toBe(colors1.primary); // DNA preserved
    expect(identity2.surface).toBe('bold'); // identity applied
  });

  it('full replacement still works when all values are provided', () => {
    const svc = createSvc();

    svc.updateTokens({ dna: { primary: '#7C3AED', roundness: 50 } });
    svc.updateTokens({ dna: { primary: '#EF4444', roundness: 80 }, identity: { surface: 'flat' } });

    const tree = svc.engine.render(spec);
    const colors = (tree.props._tokens as Record<string, unknown>).colors as Record<string, string>;
    const identity = (tree.props._tokens as Record<string, unknown>).identity as Record<string, unknown>;

    expect(colors.primary).not.toBe('#7C3AED'); // overridden by second call
    expect(identity.surface).toBe('flat');
  });

  it('$token expression resolves new values after update', () => {
    const svc = createSvc({ colors: { primary: '#0D9488' } });

    const tokenSpec = {
      root: 'el',
      elements: {
        el: { type: 'text', props: { content: { $token: 'colors.primary' } } },
      },
    };

    const tree1 = svc.engine.render(tokenSpec);
    expect(tree1.props.content).toBe('#0D9488');

    svc.updateTokens({ colors: { primary: '#FF0000' } });

    const tree2 = svc.engine.render(tokenSpec);
    expect(tree2.props.content).toBe('#FF0000');
  });
});
