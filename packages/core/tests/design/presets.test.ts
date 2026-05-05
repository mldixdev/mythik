import { describe, it, expect } from 'vitest';
import { createMythik } from '../../src/factory.js';
import type { PresetDefinition } from '../../src/design/presets.js';

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

const TEST_PRESET: PresetDefinition = {
  id: 'test-saas',
  name: 'Test SaaS',
  description: 'Test preset',
  tokens: {
    dna: { primary: '#6366f1', harmony: 'complementary', roundness: 0.3 },
    identity: { surface: 'outlined', colorWeight: 'monochrome', borderWidth: 1 },
  },
};

const TEST_PRESET_2: PresetDefinition = {
  id: 'test-comic',
  name: 'Test Comic',
  description: 'Another test',
  tokens: {
    dna: { primary: '#ef4444', harmony: 'triadic', roundness: 0.1 },
    identity: { surface: 'bold', colorWeight: 'ambient', borderWidth: 3 },
  },
};

describe('PresetDefinition', () => {
  it('accepts a valid preset definition', () => {
    const preset: PresetDefinition = {
      id: 'test-preset',
      name: 'Test Preset',
      description: 'A test preset',
      tokens: {
        dna: { primary: '#6366f1' },
        identity: { surface: 'outlined' },
      },
    };
    expect(preset.id).toBe('test-preset');
    expect(preset.tokens.dna.primary).toBe('#6366f1');
    expect(preset.tokens.identity.surface).toBe('outlined');
  });

  it('accepts optional tags', () => {
    const preset: PresetDefinition = {
      id: 'tagged',
      name: 'Tagged',
      description: 'Has tags',
      tags: ['professional', 'minimal'],
      tokens: {
        dna: { primary: '#000000' },
        identity: {},
      },
    };
    expect(preset.tags).toEqual(['professional', 'minimal']);
  });
});

describe('registerPresets', () => {
  it('registers presets and exposes them via getPresets()', () => {
    const svc = createSvc();
    svc.plugins.registerPresets([TEST_PRESET, TEST_PRESET_2]);
    const presets = svc.plugins.getPresets();
    expect(presets).toHaveLength(2);
    expect(presets[0].id).toBe('test-saas');
    expect(presets[1].id).toBe('test-comic');
  });

  it('writes preset options to /presets/available state', () => {
    const svc = createSvc();
    svc.plugins.registerPresets([TEST_PRESET]);
    const options = svc.store.get('/presets/available') as Array<{ value: string; label: string }>;
    expect(options).toEqual([
      { value: 'custom', label: 'Custom' },
      { value: 'test-saas', label: 'Test SaaS' },
    ]);
  });

  it('throws on duplicate preset IDs', () => {
    const svc = createSvc();
    const dup: PresetDefinition = { ...TEST_PRESET_2, id: 'test-saas' };
    expect(() => svc.plugins.registerPresets([TEST_PRESET, dup]))
      .toThrow('Preset "test-saas" is already registered');
  });

  it('allows calling registerPresets multiple times (additive)', () => {
    const svc = createSvc();
    svc.plugins.registerPresets([TEST_PRESET]);
    svc.plugins.registerPresets([TEST_PRESET_2]);
    expect(svc.plugins.getPresets()).toHaveLength(2);
    const options = svc.store.get('/presets/available') as Array<{ value: string; label: string }>;
    expect(options).toHaveLength(3); // custom + 2 presets
  });

  it('auto-registers applyPreset action', () => {
    const svc = createSvc();
    svc.plugins.registerPresets([TEST_PRESET]);
    expect(svc.plugins.getActions().has('applyPreset')).toBe(true);
  });

  it('getPreset returns undefined for unknown ID', () => {
    const svc = createSvc();
    svc.plugins.registerPresets([TEST_PRESET]);
    expect(svc.plugins.getPreset('nonexistent')).toBeUndefined();
  });
});

describe('applyPreset action', () => {
  const spec = { root: 'el', elements: { el: { type: 'box', props: {} } } };

  it('applies preset tokens via updateTokens with _replace', () => {
    const svc = createSvc({ dna: { primary: '#000000', roundness: 0.9 } });
    svc.plugins.registerPresets([TEST_PRESET]);
    svc.applyPlugins();

    // Before: roundness is 0.9
    const tree1 = svc.engine.render(spec);
    const shape1 = ((tree1.props._tokens as Record<string, unknown>).shape as { radius: Record<string, number> }).radius;

    // Apply preset with roundness 0.3 via updateTokens directly
    svc.updateTokens({ _replace: true, dna: TEST_PRESET.tokens.dna, identity: TEST_PRESET.tokens.identity });

    const tree2 = svc.engine.render(spec);
    const shape2 = ((tree2.props._tokens as Record<string, unknown>).shape as { radius: Record<string, number> }).radius;

    expect(shape2.md).toBeLessThan(shape1.md);
  });

  it('_replace clears stale identity flags between presets', () => {
    const svc = createSvc();
    svc.plugins.registerPresets([TEST_PRESET, TEST_PRESET_2]);
    svc.applyPlugins();

    // Apply first preset (outlined, borderWidth 1)
    svc.updateTokens({ _replace: true, dna: TEST_PRESET.tokens.dna, identity: TEST_PRESET.tokens.identity });

    const tree1 = svc.engine.render(spec);
    const identity1 = (tree1.props._tokens as Record<string, unknown>).identity as Record<string, unknown>;
    expect(identity1.surface).toBe('outlined');

    // Apply second preset (bold, borderWidth 3)
    svc.updateTokens({ _replace: true, dna: TEST_PRESET_2.tokens.dna, identity: TEST_PRESET_2.tokens.identity });

    const tree2 = svc.engine.render(spec);
    const identity2 = (tree2.props._tokens as Record<string, unknown>).identity as Record<string, unknown>;
    expect(identity2.surface).toBe('bold');
    expect(identity2.borderWidth).toBe(3);
  });

  it('applyPreset action is callable via the action handler', () => {
    const svc = createSvc();
    svc.plugins.registerPresets([TEST_PRESET]);
    svc.applyPlugins();

    // Get the applyPreset action handler directly
    const applyAction = svc.plugins.getActions().get('applyPreset')!;
    expect(applyAction).toBeDefined();

    // Call the handler directly (simulates what dispatcher does)
    applyAction.handler(
      { preset: 'test-saas' },
      (path, value) => svc.store.set(path, value),
      (path) => svc.store.get(path),
    );

    const tree = svc.engine.render(spec);
    const identity = (tree.props._tokens as Record<string, unknown>).identity as Record<string, unknown>;
    expect(identity.surface).toBe('outlined');
    expect(identity.colorWeight).toBe('monochrome');
  });

  it('throws for unknown preset id', () => {
    const svc = createSvc();
    svc.plugins.registerPresets([TEST_PRESET]);
    svc.applyPlugins();

    const applyAction = svc.plugins.getActions().get('applyPreset')!;
    expect(() => applyAction.handler(
      { preset: 'nonexistent' },
      (path, value) => svc.store.set(path, value),
      (path) => svc.store.get(path),
    )).toThrow('Unknown preset: "nonexistent"');
  });

  it('throws for missing preset param', () => {
    const svc = createSvc();
    svc.plugins.registerPresets([TEST_PRESET]);
    svc.applyPlugins();

    const applyAction = svc.plugins.getActions().get('applyPreset')!;
    expect(() => applyAction.handler(
      {},
      (path, value) => svc.store.set(path, value),
      (path) => svc.store.get(path),
    )).toThrow('applyPreset requires a "preset" string parameter');
  });

  it('"custom" is a no-op — does not throw or change tokens', () => {
    const svc = createSvc({ dna: { primary: '#0D9488', roundness: 0.7 } });
    svc.plugins.registerPresets([TEST_PRESET]);
    svc.applyPlugins();

    const treeBefore = svc.engine.render(spec);
    const colorsBefore = (treeBefore.props._tokens as Record<string, unknown>).colors as Record<string, string>;

    const applyAction = svc.plugins.getActions().get('applyPreset')!;
    applyAction.handler(
      { preset: 'custom' },
      (path, value) => svc.store.set(path, value),
      (path) => svc.store.get(path),
    );

    const treeAfter = svc.engine.render(spec);
    const colorsAfter = (treeAfter.props._tokens as Record<string, unknown>).colors as Record<string, string>;
    expect(colorsAfter.primary).toBe(colorsBefore.primary);
  });
});
