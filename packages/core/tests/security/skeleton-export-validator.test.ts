import { describe, it, expect } from 'vitest';
import { validateSpec } from '../../src/security/index.js';
import type { Spec } from '../../src/types.js';

describe('skeleton + export validator', () => {
  it('validates skeleton variant must be text/circle/rect', () => {
    const spec: Spec = {
      root: 'sk',
      elements: { sk: { type: 'skeleton', props: { variant: 'invalid' } } },
    };
    const result = validateSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain('variant');
  });

  it('validates skeleton height must be positive', () => {
    const spec: Spec = {
      root: 'sk',
      elements: { sk: { type: 'skeleton', props: { height: -1 } } },
    };
    const result = validateSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain('height');
  });

  it('validates skeleton count must be positive integer', () => {
    const spec: Spec = {
      root: 'sk',
      elements: { sk: { type: 'skeleton', props: { count: 0 } } },
    };
    const result = validateSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain('count');
  });

  it('passes valid skeleton', () => {
    const spec: Spec = {
      root: 'sk',
      elements: { sk: { type: 'skeleton', props: { variant: 'text', height: 16, count: 3 } } },
    };
    const result = validateSpec(spec);
    expect(result.valid).toBe(true);
  });

  it('validates export action requires source, columns, filename', () => {
    const spec: Spec = {
      root: 'btn',
      elements: {
        btn: {
          type: 'button',
          props: { label: 'Export' },
          on: { press: { action: 'export', params: {} } },
        },
      },
    };
    const result = validateSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('source'))).toBe(true);
  });

  it('passes valid export action', () => {
    const spec: Spec = {
      root: 'btn',
      elements: {
        btn: {
          type: 'button',
          props: { label: 'Export' },
          on: {
            press: {
              action: 'export',
              params: {
                source: '/tasks',
                columns: [{ field: 'name', label: 'Name' }],
                filename: 'report',
              },
            },
          },
        },
      },
    };
    const result = validateSpec(spec);
    expect(result.valid).toBe(true);
  });
});
