import { describe, it, expect } from 'vitest';
import { validateSpec } from '../../src/security/index.js';
import type { Spec } from '../../src/types.js';

describe('variant spec validator', () => {
  it('warns when variant references non-existent component type', () => {
    const spec: Spec = {
      root: 'btn',
      elements: { btn: { type: 'button', props: { variant: 'primary' } } },
    };
    const tokens = { components: { box: { card: { style: {} } } } };
    const result = validateSpec(spec, { variantTokens: tokens });
    expect(result.errors.some(e => e.message.includes('variant') && e.message.includes('primary'))).toBe(true);
  });

  it('passes when variant exists in tokens.components', () => {
    const spec: Spec = {
      root: 'btn',
      elements: { btn: { type: 'button', props: { variant: 'primary' } } },
    };
    const tokens = { components: { button: { primary: { style: { color: '#FFF' } } } } };
    const result = validateSpec(spec, { variantTokens: tokens });
    expect(result.valid).toBe(true);
  });

  it('passes when no variantTokens in context (cannot validate)', () => {
    const spec: Spec = {
      root: 'btn',
      elements: { btn: { type: 'button', props: { variant: 'primary' } } },
    };
    const result = validateSpec(spec);
    expect(result.valid).toBe(true);
  });
});
