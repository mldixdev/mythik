import { describe, it, expect } from 'vitest';
import { createResolver } from '../../src/expressions/resolver.js';
import { createStateStore } from '../../src/state/store.js';

describe('$format handler', () => {
  const store = createStateStore({ price: 1234.56, phone: '5551234567', name: 'hello world' });
  const resolver = createResolver({ store });

  it('formats currency', () => {
    const result = resolver.resolve({ $format: 'currency', value: { $state: '/price' }, currency: 'USD' }) as string;
    expect(result).toContain('1,234.56');
    expect(result).toContain('$');
  });

  it('formats number with decimals', () => {
    const result = resolver.resolve({ $format: 'number', value: 1234.5, decimals: 2 }) as string;
    expect(result).toContain('1,234.50');
  });

  it('formats percent', () => {
    const result = resolver.resolve({ $format: 'percent', value: 0.756 }) as string;
    expect(result).toContain('75');
    expect(result).toContain('%');
  });

  it('formats phone', () => {
    expect(resolver.resolve({ $format: 'phone', value: { $state: '/phone' } })).toBe('(555) 123-4567');
  });

  it('formats 7-digit phone', () => {
    expect(resolver.resolve({ $format: 'phone', value: '1234567' })).toBe('123-4567');
  });

  it('uppercase', () => {
    expect(resolver.resolve({ $format: 'uppercase', value: { $state: '/name' } })).toBe('HELLO WORLD');
  });

  it('lowercase', () => {
    expect(resolver.resolve({ $format: 'lowercase', value: 'HELLO' })).toBe('hello');
  });

  it('capitalize', () => {
    expect(resolver.resolve({ $format: 'capitalize', value: { $state: '/name' } })).toBe('Hello World');
  });

  it('truncate', () => {
    expect(resolver.resolve({ $format: 'truncate', value: 'This is a very long text', length: 10 })).toBe('This is a ...');
  });

  it('truncate does not cut short text', () => {
    expect(resolver.resolve({ $format: 'truncate', value: 'Short', length: 10 })).toBe('Short');
  });
});
