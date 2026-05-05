import { describe, it, expect } from 'vitest';
import { validateApiSpec } from '../src/validation/spec-validator.js';
import { isValidIdentifier } from '../src/validation/identifier-guard.js';

// Note: validateApiSpec now lives in core and validates the DECLARATIVE api-spec
// (no connection, no jwt.secret — those moved to MythikServerConfig).
// Comprehensive tests are in packages/core/tests/security/api-spec-validator.test.ts.
// These server-side tests verify the re-export works and cover key scenarios.

function makeSpec(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { type: 'api', ...overrides };
}

describe('isValidIdentifier', () => {
  it('accepts valid SQL identifiers', () => {
    expect(isValidIdentifier('Organizations')).toBe(true);
    expect(isValidIdentifier('CatalogEntries')).toBe(true);
    expect(isValidIdentifier('id')).toBe(true);
    expect(isValidIdentifier('organizationId')).toBe(true);
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
    expect(isValidIdentifier('a'.repeat(129))).toBe(false);
    expect(isValidIdentifier('a'.repeat(128))).toBe(true);
  });
});

describe('validateApiSpec', () => {
  it('valid minimal spec passes', () => {
    const result = validateApiSpec(makeSpec());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('catalog with from but missing value → error', () => {
    const result = validateApiSpec(makeSpec({
      catalogs: { test: { from: 'MyTable', label: 'nombre' } },
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('value'))).toBe(true);
  });

  it('catalog with from but missing label → error', () => {
    const result = validateApiSpec(makeSpec({
      catalogs: { test: { from: 'MyTable', value: 'id' } },
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('label'))).toBe(true);
  });

  it('catalog with distinct does not require value/label', () => {
    const result = validateApiSpec(makeSpec({
      catalogs: { years: { from: 'Records', distinct: 'year' } },
    }));
    expect(result.valid).toBe(true);
  });

  it('catalog with invalid table name → error', () => {
    const result = validateApiSpec(makeSpec({
      catalogs: { bad: { from: 'table; DROP--', value: 'id', label: 'name' } },
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('identifier'))).toBe(true);
  });

  it('endpoint without query or handler → error', () => {
    const result = validateApiSpec(makeSpec({
      endpoints: { test: { path: '/api/test' } },
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('query') && e.includes('handler'))).toBe(true);
  });

  it('endpoint with both query and handler → error', () => {
    const result = validateApiSpec(makeSpec({
      endpoints: { test: { path: '/api/test', query: 'SELECT 1', handler: 'my-handler' } },
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('mutually exclusive'))).toBe(true);
  });

  it('endpoint with query is valid', () => {
    const result = validateApiSpec(makeSpec({
      endpoints: { test: { path: '/api/test', query: 'SELECT * FROM items' } },
    }));
    expect(result.valid).toBe(true);
  });

  it('endpoint with handler is valid', () => {
    const result = validateApiSpec(makeSpec({
      endpoints: { test: { path: '/api/test', handler: 'my-handler' } },
    }));
    expect(result.valid).toBe(true);
  });

  it('static catalog is valid without from/value/label', () => {
    const result = validateApiSpec(makeSpec({
      catalogs: { months: { static: [{ label: 'Jan', value: '1' }] } },
    }));
    expect(result.valid).toBe(true);
  });

  it('crud with invalid table name → error', () => {
    const result = validateApiSpec(makeSpec({
      endpoints: { test: { path: '/api/test', crud: { table: 'DROP TABLE--', primaryKey: 'id', insertable: ['name'], updatable: ['name'] } } },
    }));
    expect(result.valid).toBe(false);
  });
});

describe('auth validation', () => {
  function makeAuthSpec(auth: Record<string, unknown>): Record<string, unknown> {
    return makeSpec({ auth });
  }

  it('valid auth config passes (no jwt.secret needed in spec)', () => {
    const result = validateApiSpec(makeAuthSpec({
      strategy: 'jwt',
      policies: { admin: { roles: ['ADMIN'] } },
    }));
    expect(result.valid).toBe(true);
  });

  it('auth without explicit strategy passes (defaults to jwt)', () => {
    const result = validateApiSpec(makeAuthSpec({}));
    expect(result.valid).toBe(true);
  });

  it('unsupported strategy → error', () => {
    const result = validateApiSpec(makeAuthSpec({ strategy: 'oauth2' }));
    expect(result.errors.some(e => e.includes('strategy'))).toBe(true);
  });

  it('provider without usersTable → error', () => {
    const result = validateApiSpec(makeAuthSpec({
      strategy: 'jwt',
      provider: { usernameColumn: 'user', passwordColumn: 'pass', rolesQuery: 'SELECT @username', scopeQuery: 'SELECT @username' },
    }));
    expect(result.errors.some(e => e.includes('usersTable'))).toBe(true);
  });

  it('provider with invalid table name → error', () => {
    const result = validateApiSpec(makeAuthSpec({
      strategy: 'jwt',
      provider: { usersTable: 'DROP TABLE--', usernameColumn: 'user', passwordColumn: 'pass', rolesQuery: 'SELECT @username', scopeQuery: 'SELECT @username' },
    }));
    expect(result.errors.some(e => e.includes('identifier'))).toBe(true);
  });

  it('provider rolesQuery without @username → error', () => {
    const result = validateApiSpec(makeAuthSpec({
      strategy: 'jwt',
      provider: { usersTable: 'Users', usernameColumn: 'user', passwordColumn: 'pass', rolesQuery: 'SELECT * FROM roles', scopeQuery: 'SELECT @username' },
    }));
    expect(result.errors.some(e => e.includes('@username'))).toBe(true);
  });

  it('policy with empty roles → error', () => {
    const result = validateApiSpec(makeAuthSpec({
      strategy: 'jwt',
      policies: { admin: { roles: [] } },
    }));
    expect(result.errors.some(e => e.includes('roles'))).toBe(true);
  });

  it('scopeFilter without column → error', () => {
    const result = validateApiSpec(makeAuthSpec({
      strategy: 'jwt',
      scopeFilter: { claim: 'inst', type: 'int' },
    }));
    expect(result.errors.some(e => e.includes('column'))).toBe(true);
  });

  it('scopeFilter select mode without header → error', () => {
    const result = validateApiSpec(makeAuthSpec({
      strategy: 'jwt',
      scopeFilter: { claim: 'inst', column: 'idInst', mode: 'select' },
    }));
    expect(result.errors.some(e => e.includes('header'))).toBe(true);
  });

  it('scopeFilter with invalid column → error', () => {
    const result = validateApiSpec(makeAuthSpec({
      strategy: 'jwt',
      scopeFilter: { claim: 'inst', column: 'DROP TABLE--' },
    }));
    expect(result.errors.some(e => e.includes('identifier'))).toBe(true);
  });

  it('endpoint policy referencing unknown policy → error', () => {
    const result = validateApiSpec(makeSpec({
      auth: { strategy: 'jwt', policies: { admin: { roles: ['ADMIN'] } } },
      endpoints: { test: { path: '/test', query: 'SELECT 1', policy: 'nonexistent' } },
    }));
    expect(result.errors.some(e => e.includes('nonexistent'))).toBe(true);
  });

  it('endpoint policy "public" and "authenticated" are valid without being in policies', () => {
    const result = validateApiSpec(makeSpec({
      auth: { strategy: 'jwt' },
      endpoints: {
        pub: { path: '/pub', query: 'SELECT 1', policy: 'public' },
        auth: { path: '/auth', query: 'SELECT 1', policy: 'authenticated' },
      },
    }));
    expect(result.valid).toBe(true);
  });

  it('activeCondition with semicolons → error', () => {
    const result = validateApiSpec(makeAuthSpec({
      strategy: 'jwt',
      provider: { usersTable: 'Users', usernameColumn: 'user', passwordColumn: 'pass', activeCondition: 'IsActive = 1; DROP TABLE Users', rolesQuery: 'SELECT @username', scopeQuery: 'SELECT @username' },
    }));
    expect(result.errors.some(e => e.includes('activeCondition'))).toBe(true);
  });
});
