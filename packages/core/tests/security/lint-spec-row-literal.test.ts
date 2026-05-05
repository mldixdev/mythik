import { describe, it, expect } from 'vitest';
import { validateSpec } from '../../src/security/spec-validator.js';

describe('spec-row-literal lint rule', () => {
  it('warns on $row literal in element prop value', () => {
    const spec = {
      root: 'r',
      elements: {
        r: {
          type: 'box',
          props: { value: { $row: 'id' } },
        },
      },
    };
    const result = validateSpec(spec);
    const lintWarnings = result.warnings?.filter(w => w.ruleId === 'spec-row-literal') ?? [];
    expect(lintWarnings).toHaveLength(1);
    expect(lintWarnings[0].message).toContain('$row');
    expect(lintWarnings[0].path).toBeDefined();
    expect(lintWarnings[0].suggestedFixes).toBeDefined();
    expect(lintWarnings[0].suggestedFixes![0].patch).toMatchObject({
      op: 'replace',
      value: { $state: '/ui/selectedRow/id' },
    });
  });

  it('warns on $row literal deeply nested', () => {
    const spec = {
      root: 'r',
      elements: {
        r: {
          type: 'box',
          props: { onPress: [{ action: 'setState', params: { value: { $row: 'name' } } }] },
        },
      },
    };
    const result = validateSpec(spec);
    const lintWarnings = result.warnings?.filter(w => w.ruleId === 'spec-row-literal') ?? [];
    expect(lintWarnings).toHaveLength(1);
    expect(lintWarnings[0].path).toContain('onPress');
  });

  it('does not warn when no $row present', () => {
    const spec = {
      root: 'r',
      elements: { r: { type: 'box', props: { value: 'plain' } } },
    };
    const result = validateSpec(spec);
    const lintWarnings = result.warnings?.filter(w => w.ruleId === 'spec-row-literal') ?? [];
    expect(lintWarnings).toHaveLength(0);
  });

  it('does not warn on correct $state /ui/selectedRow pattern', () => {
    const spec = {
      root: 'r',
      elements: {
        r: { type: 'box', props: { value: { $state: '/ui/selectedRow/id' } } },
      },
    };
    const result = validateSpec(spec);
    const lintWarnings = result.warnings?.filter(w => w.ruleId === 'spec-row-literal') ?? [];
    expect(lintWarnings).toHaveLength(0);
  });

  it('emits one warning per $row occurrence with unique paths', () => {
    const spec = {
      root: 'r',
      elements: {
        r: {
          type: 'box',
          props: {
            a: { $row: 'one' },
            b: { $row: 'two' },
          },
        },
      },
    };
    const result = validateSpec(spec);
    const lintWarnings = result.warnings?.filter(w => w.ruleId === 'spec-row-literal') ?? [];
    expect(lintWarnings).toHaveLength(2);
    const paths = lintWarnings.map(w => w.path);
    expect(new Set(paths).size).toBe(2);
  });
});
