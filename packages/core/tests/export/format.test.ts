import { describe, it, expect } from 'vitest';
import { formatExportValue } from '../../src/export/format.js';

describe('formatExportValue', () => {
  it('formats currency with USD', () => {
    expect(formatExportValue(1234.5, { field: 'price', label: 'Price', format: 'currency', formatOptions: { currency: 'USD' } }))
      .toMatch(/1.*234\.50/);
  });

  it('formats currency with locale', () => {
    const result = formatExportValue(1234, { field: 'x', label: 'X', format: 'currency', formatOptions: { currency: 'HNL', locale: 'es-HN' } });
    expect(result).toContain('1');
  });

  it('formats number with decimals', () => {
    expect(formatExportValue(3.14159, { field: 'x', label: 'X', format: 'number', formatOptions: { decimals: 2 } }))
      .toBe('3.14');
  });

  it('formats percent', () => {
    expect(formatExportValue(0.75, { field: 'x', label: 'X', format: 'percent' }))
      .toMatch(/75/);
  });

  it('formats date', () => {
    const result = formatExportValue('2026-04-05', { field: 'x', label: 'X', format: 'date' });
    expect(result).toContain('2026');
  });

  it('returns string for unformatted values', () => {
    expect(formatExportValue('hello', { field: 'x', label: 'X' })).toBe('hello');
  });

  it('returns empty string for null/undefined', () => {
    expect(formatExportValue(null, { field: 'x', label: 'X' })).toBe('');
    expect(formatExportValue(undefined, { field: 'x', label: 'X' })).toBe('');
  });
});
