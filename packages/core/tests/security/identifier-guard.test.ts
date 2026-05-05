import { describe, it, expect } from 'vitest';
import { isValidIdentifier, assertValidIdentifier } from '../../src/security/identifier-guard.js';

describe('isValidIdentifier', () => {
  it('accepts valid SQL identifiers', () => {
    expect(isValidIdentifier('Organizations')).toBe(true);
    expect(isValidIdentifier('CatalogEntries')).toBe(true);
    expect(isValidIdentifier('id')).toBe(true);
    expect(isValidIdentifier('schema.table')).toBe(true);
    expect(isValidIdentifier('nombre_completo')).toBe(true);
  });

  it('rejects SQL injection patterns', () => {
    expect(isValidIdentifier('table; DROP TABLE--')).toBe(false);
    expect(isValidIdentifier("' OR 1=1")).toBe(false);
    expect(isValidIdentifier('name; DELETE FROM')).toBe(false);
    expect(isValidIdentifier('')).toBe(false);
    expect(isValidIdentifier('123start')).toBe(false);
  });

  it('rejects identifiers exceeding 128 characters', () => {
    const longName = 'a'.repeat(129);
    expect(isValidIdentifier(longName)).toBe(false);
    expect(isValidIdentifier('a'.repeat(128))).toBe(true);
  });

  it('assertValidIdentifier throws on invalid', () => {
    expect(() => assertValidIdentifier('valid_name', 'test')).not.toThrow();
    expect(() => assertValidIdentifier('DROP TABLE--', 'test')).toThrow(/Invalid SQL identifier/);
  });

  it('assertValidIdentifier throws on too-long identifiers', () => {
    expect(() => assertValidIdentifier('a'.repeat(129), 'test')).toThrow(/Invalid SQL identifier/);
  });
});
