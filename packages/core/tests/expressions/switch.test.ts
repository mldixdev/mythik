import { describe, it, expect } from 'vitest';
import { createResolver } from '../../src/expressions/resolver.js';
import { createStateStore } from '../../src/state/store.js';

describe('$switch handler', () => {
  const store = createStateStore({
    filter: { tipo: '2' },
    status: 'active',
    count: 42,
  });
  const resolver = createResolver({ store });

  it('matches a string case', () => {
    const result = resolver.resolve({
      $switch: { $state: '/filter/tipo' },
      cases: {
        '1': 'Gastos Corrientes',
        '2': 'Gastos de Capital',
        '3': 'Aplicaciones Financieras',
      },
      default: 'Otro',
    });
    expect(result).toBe('Gastos de Capital');
  });

  it('returns default when no case matches', () => {
    const result = resolver.resolve({
      $switch: 'unknown',
      cases: { a: 'A', b: 'B' },
      default: 'fallback',
    });
    expect(result).toBe('fallback');
  });

  it('matches numeric value converted to string key', () => {
    const store2 = createStateStore({ value: 3 });
    const resolver2 = createResolver({ store: store2 });
    const result = resolver2.resolve({
      $switch: { $state: '/value' },
      cases: { '1': 'one', '2': 'two', '3': 'three' },
      default: 'other',
    });
    expect(result).toBe('three');
  });

  it('resolves expression values in matching case', () => {
    const result = resolver.resolve({
      $switch: { $state: '/status' },
      cases: {
        active: { $template: 'Count: ${/count}' },
        inactive: 'N/A',
      },
      default: 'unknown',
    });
    expect(result).toBe('Count: 42');
  });

  it('resolves nested expressions inside the selected object case', () => {
    const result = resolver.resolve({
      $switch: { $state: '/status' },
      cases: {
        active: {
          kind: 'summary',
          label: { $template: 'Count: ${/count}' },
          values: [{ count: { $state: '/count' } }],
        },
      },
      default: null,
    });
    expect(result).toEqual({
      kind: 'summary',
      label: 'Count: 42',
      values: [{ count: 42 }],
    });
  });

  it('does NOT resolve non-matching case values (lazy)', () => {
    const result = resolver.resolve({
      $switch: 'a',
      cases: {
        a: 'matched',
        b: { $computed: 'nonexistentFn' },
      },
      default: 'nope',
    });
    expect(result).toBe('matched');
  });

  it('handles nested $switch', () => {
    const result = resolver.resolve({
      $switch: { $state: '/filter/tipo' },
      cases: {
        '1': 'one',
        '2': {
          $switch: { $state: '/status' },
          cases: { active: 'Capital (Active)', inactive: 'Capital (Inactive)' },
          default: 'Capital',
        },
      },
      default: 'other',
    });
    expect(result).toBe('Capital (Active)');
  });

  it('works with boolean value', () => {
    const store3 = createStateStore({ flag: true });
    const resolver3 = createResolver({ store: store3 });
    const result = resolver3.resolve({
      $switch: { $state: '/flag' },
      cases: { true: 'yes', false: 'no' },
      default: 'unknown',
    });
    expect(result).toBe('yes');
  });

  it('returns resolved default when default is an expression', () => {
    const result = resolver.resolve({
      $switch: 'nomatch',
      cases: { a: 'A' },
      default: { $template: 'Default: ${/count}' },
    });
    expect(result).toBe('Default: 42');
  });
});
