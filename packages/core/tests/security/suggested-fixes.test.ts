import { describe, it, expect } from 'vitest';
import { validateSpec } from '../../src/security/spec-validator.js';
import { createPrimitiveRegistry } from '../../src/renderer/registry.js';
import type { Spec } from '../../src/types.js';

function makeRegistry(): ReturnType<typeof createPrimitiveRegistry> {
  const reg = createPrimitiveRegistry();
  for (const t of [
    'box', 'text', 'button', 'input', 'stack', 'grid', 'modal', 'drawer',
    'select', 'table', 'image', 'icon', 'textarea', 'checkbox', 'toggle',
    'slider', 'divider', 'spacer', 'scroll', 'list', 'touchable', 'screen',
    'tabs', 'accordion', 'wizard', 'toast-container',
  ]) {
    reg.register(t, () => null);
  }
  return reg;
}

describe('ValidationError structure', () => {
  it('includes elementId and path on element errors', () => {
    const spec: Spec = {
      root: 'page',
      elements: {
        page: { type: 'box', props: {}, children: ['title'] },
        title: { type: 'text', props: { content: { $array: 'filter' } as unknown } },
      },
    };
    const result = validateSpec(spec, { primitiveRegistry: makeRegistry() });
    const error = result.errors.find(e => e.elementId === 'title');
    expect(error).toBeDefined();
    expect(error!.elementId).toBe('title');
    expect(error!.path).toBeDefined();
  });

  it('has no elementId for spec-level errors', () => {
    const result = validateSpec({ elements: { a: { type: 'box', props: {} } } } as unknown);
    const error = result.errors.find(e => e.message.includes('root'));
    expect(error).toBeDefined();
    expect(error!.elementId).toBeUndefined();
  });
});

describe('suggested fixes — unknown primitive type', () => {
  it('suggests closest primitive via Levenshtein', () => {
    const spec: Spec = {
      root: 'page',
      elements: { page: { type: 'buton', props: {} } },
    };
    const result = validateSpec(spec, { primitiveRegistry: makeRegistry() });
    const error = result.errors.find(e => e.message.includes('unknown primitive'));
    expect(error).toBeDefined();
    expect(error!.suggestedFixes).toHaveLength(1);
    expect(error!.suggestedFixes![0].patch).toEqual({
      op: 'replace', path: '/elements/page/type', value: 'button',
    });
    expect(error!.suggestedFixes![0].confidence).toBe('high');
  });

  it('no suggestion when no close match', () => {
    const spec: Spec = {
      root: 'page',
      elements: { page: { type: 'zzzzzzzzz', props: {} } },
    };
    const result = validateSpec(spec, { primitiveRegistry: makeRegistry() });
    const error = result.errors.find(e => e.message.includes('unknown primitive'));
    expect(error).toBeDefined();
    expect(error!.suggestedFixes).toBeUndefined();
  });
});

describe('suggested fixes — orphan child', () => {
  it('suggests remove patch at correct index', () => {
    const spec: Spec = {
      root: 'page',
      elements: {
        page: { type: 'box', props: {}, children: ['real', 'ghost'] },
        real: { type: 'text', props: {} },
      },
    };
    const result = validateSpec(spec);
    const error = result.errors.find(e => e.message.includes('ghost'));
    expect(error).toBeDefined();
    expect(error!.suggestedFixes).toHaveLength(1);
    expect(error!.suggestedFixes![0].patch).toEqual({
      op: 'remove', path: '/elements/page/children/1',
    });
  });

  it('generates descending indices for multiple orphans', () => {
    const spec: Spec = {
      root: 'page',
      elements: {
        page: { type: 'box', props: {}, children: ['real', 'ghost1', 'real2', 'ghost2'] },
        real: { type: 'text', props: {} },
        real2: { type: 'text', props: {} },
      },
    };
    const result = validateSpec(spec);
    const orphanErrors = result.errors.filter(e => e.message.includes('not found in elements'));
    const fixes = orphanErrors.flatMap(e => e.suggestedFixes ?? []);
    const indices = fixes.map(f => parseInt(f.patch.path.split('/').pop()!, 10));
    expect(indices).toEqual([3, 1]);
  });
});

describe('suggested fixes — invalid toast position', () => {
  it('suggests closest valid position', () => {
    const spec: Spec = {
      root: 'page',
      elements: {
        page: { type: 'toast-container', props: { position: 'top-righ' } },
      },
    };
    const result = validateSpec(spec);
    const error = result.errors.find(e => e.message.includes('position'));
    expect(error).toBeDefined();
    expect(error!.suggestedFixes).toHaveLength(1);
    expect(error!.suggestedFixes![0].patch).toEqual({
      op: 'replace', path: '/elements/page/props/position', value: 'top-right',
    });
  });
});

describe('suggested fixes — unknown validator type', () => {
  it('suggests closest known validator', () => {
    const spec = {
      root: 'page',
      elements: { page: { type: 'box', props: {} } },
      forms: {
        'my-form': {
          fields: {
            name: { statePath: '/form/name', rules: [{ type: 'requird', message: 'Required' }] },
          },
        },
      },
    } as unknown as Spec;
    const result = validateSpec(spec);
    const error = result.errors.find(e => e.message.includes('requird'));
    expect(error).toBeDefined();
    expect(error!.suggestedFixes).toHaveLength(1);
    expect(error!.suggestedFixes![0].patch).toEqual({
      op: 'replace', path: '/forms/my-form/fields/name/rules/0/type', value: 'required',
    });
  });
});

describe('generateFixes: false', () => {
  it('skips suggested fixes when disabled', () => {
    const spec: Spec = {
      root: 'page',
      elements: { page: { type: 'buton', props: {} } },
    };
    const result = validateSpec(spec, { primitiveRegistry: makeRegistry(), generateFixes: false });
    const error = result.errors.find(e => e.message.includes('unknown primitive'));
    expect(error).toBeDefined();
    expect(error!.suggestedFixes).toBeUndefined();
  });
});
