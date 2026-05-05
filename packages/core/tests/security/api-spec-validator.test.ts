import { describe, it, expect } from 'vitest';
import { validateApiSpec } from '../../src/security/api-spec-validator.js';

function makeSpec(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { type: 'api', ...overrides };
}

describe('validateApiSpec — basic', () => {
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
    expect(result.errors.some((e: string) => e.includes('value'))).toBe(true);
  });

  it('catalog with from but missing label → error', () => {
    const result = validateApiSpec(makeSpec({
      catalogs: { test: { from: 'MyTable', value: 'id' } },
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes('label'))).toBe(true);
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
    expect(result.errors.some((e: string) => e.includes('identifier'))).toBe(true);
  });

  it('static catalog is valid without from/value/label', () => {
    const result = validateApiSpec(makeSpec({
      catalogs: { months: { static: [{ label: 'Jan', value: '1' }] } },
    }));
    expect(result.valid).toBe(true);
  });

  it('endpoint without query or handler → error', () => {
    const result = validateApiSpec(makeSpec({
      endpoints: { test: { path: '/api/test' } },
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes('query') && e.includes('handler'))).toBe(true);
  });

  it('endpoint with both query and handler → error', () => {
    const result = validateApiSpec(makeSpec({
      endpoints: { test: { path: '/api/test', query: 'SELECT 1', handler: 'my-handler' } },
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes('mutually exclusive'))).toBe(true);
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

  it('crud with valid config passes', () => {
    const result = validateApiSpec(makeSpec({
      endpoints: { test: { path: '/api/test', crud: { table: 'Items', primaryKey: 'id', insertable: ['name'], updatable: ['name'] } } },
    }));
    expect(result.valid).toBe(true);
  });

  it('catalog where with semicolons → error', () => {
    const result = validateApiSpec(makeSpec({
      catalogs: { test: { from: 'MyTable', value: 'id', label: 'name', where: 'status = 1; DROP TABLE MyTable' } },
    }));
    expect(result.errors.some((e: string) => e.includes('where') && e.includes('semicolon'))).toBe(true);
  });

  it('catalog where with dangerous SQL keywords → error', () => {
    const result = validateApiSpec(makeSpec({
      catalogs: { test: { from: 'MyTable', value: 'id', label: 'name', where: '1=1) UNION SELECT password FROM users WHERE (1=1' } },
    }));
    expect(result.errors.some((e: string) => e.includes('where') && e.includes('dangerous'))).toBe(true);
  });

  it('catalog where with valid condition passes', () => {
    const result = validateApiSpec(makeSpec({
      catalogs: { test: { from: 'MyTable', value: 'id', label: 'name', where: 'status = 1 AND active = 1' } },
    }));
    expect(result.valid).toBe(true);
  });

  it('catalog orderBy with semicolons → error', () => {
    const result = validateApiSpec(makeSpec({
      catalogs: { test: { from: 'MyTable', value: 'id', label: 'name', orderBy: 'name; DROP TABLE--' } },
    }));
    expect(result.errors.some((e: string) => e.includes('orderBy') && e.includes('semicolon'))).toBe(true);
  });

  it('crud with invalid table name → error', () => {
    const result = validateApiSpec(makeSpec({
      endpoints: { test: { path: '/api/test', crud: { table: 'DROP TABLE--', primaryKey: 'id', insertable: ['name'], updatable: ['name'] } } },
    }));
    expect(result.valid).toBe(false);
  });

  it('audit without crud → error', () => {
    const result = validateApiSpec(makeSpec({
      endpoints: { test: { path: '/api/test', query: 'SELECT 1', audit: { createdBy: 'user' } } },
    }));
    expect(result.errors.some((e: string) => e.includes('audit') && e.includes('crud'))).toBe(true);
  });
});

describe('validateApiSpec — auth (no jwt.secret required)', () => {
  function makeAuthSpec(auth: Record<string, unknown>): Record<string, unknown> {
    return makeSpec({ auth });
  }

  it('valid auth config without jwt.secret passes', () => {
    const result = validateApiSpec(makeAuthSpec({
      strategy: 'jwt',
      policies: { admin: { roles: ['ADMIN'] } },
    }));
    expect(result.valid).toBe(true);
  });

  it('unsupported strategy → error', () => {
    const result = validateApiSpec(makeAuthSpec({ strategy: 'oauth2' }));
    expect(result.errors.some((e: string) => e.includes('strategy'))).toBe(true);
  });

  it('provider with valid config passes', () => {
    const result = validateApiSpec(makeAuthSpec({
      strategy: 'jwt',
      provider: {
        usersTable: 'Users', usernameColumn: 'user', passwordColumn: 'pass',
        rolesQuery: 'SELECT @username', scopeQuery: 'SELECT @username',
      },
    }));
    expect(result.valid).toBe(true);
  });

  it('provider without usersTable → error', () => {
    const result = validateApiSpec(makeAuthSpec({
      strategy: 'jwt',
      provider: { usernameColumn: 'user', passwordColumn: 'pass', rolesQuery: 'SELECT @username', scopeQuery: 'SELECT @username' },
    }));
    expect(result.errors.some((e: string) => e.includes('usersTable'))).toBe(true);
  });

  it('provider with invalid table name → error', () => {
    const result = validateApiSpec(makeAuthSpec({
      strategy: 'jwt',
      provider: { usersTable: 'DROP TABLE--', usernameColumn: 'user', passwordColumn: 'pass', rolesQuery: 'SELECT @username', scopeQuery: 'SELECT @username' },
    }));
    expect(result.errors.some((e: string) => e.includes('identifier'))).toBe(true);
  });

  it('provider rolesQuery without @username → error', () => {
    const result = validateApiSpec(makeAuthSpec({
      strategy: 'jwt',
      provider: { usersTable: 'Users', usernameColumn: 'user', passwordColumn: 'pass', rolesQuery: 'SELECT * FROM roles', scopeQuery: 'SELECT @username' },
    }));
    expect(result.errors.some((e: string) => e.includes('@username'))).toBe(true);
  });

  it('policy with empty roles → error', () => {
    const result = validateApiSpec(makeAuthSpec({
      strategy: 'jwt',
      policies: { admin: { roles: [] } },
    }));
    expect(result.errors.some((e: string) => e.includes('roles'))).toBe(true);
  });

  it('scopeFilter without column → error', () => {
    const result = validateApiSpec(makeAuthSpec({
      strategy: 'jwt',
      scopeFilter: { claim: 'inst', type: 'int' },
    }));
    expect(result.errors.some((e: string) => e.includes('column'))).toBe(true);
  });

  it('scopeFilter select mode without header → error', () => {
    const result = validateApiSpec(makeAuthSpec({
      strategy: 'jwt',
      scopeFilter: { claim: 'inst', column: 'idInst', mode: 'select' },
    }));
    expect(result.errors.some((e: string) => e.includes('header'))).toBe(true);
  });

  it('scopeFilter with invalid column → error', () => {
    const result = validateApiSpec(makeAuthSpec({
      strategy: 'jwt',
      scopeFilter: { claim: 'inst', column: 'DROP TABLE--' },
    }));
    expect(result.errors.some((e: string) => e.includes('identifier'))).toBe(true);
  });

  it('endpoint policy referencing unknown policy → error', () => {
    const result = validateApiSpec(makeSpec({
      auth: { strategy: 'jwt', policies: { admin: { roles: ['ADMIN'] } } },
      endpoints: { test: { path: '/test', query: 'SELECT 1', policy: 'nonexistent' } },
    }));
    expect(result.errors.some((e: string) => e.includes('nonexistent'))).toBe(true);
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
});

describe('validateApiSpec — hardening', () => {
  function makeProviderSpec(providerOverrides: Record<string, unknown>): Record<string, unknown> {
    return makeSpec({
      auth: {
        strategy: 'jwt',
        provider: {
          usersTable: 'Users', usernameColumn: 'user', passwordColumn: 'pass',
          rolesQuery: 'SELECT @username', scopeQuery: 'SELECT @username',
          ...providerOverrides,
        },
      },
    });
  }

  it('activeCondition with semicolons → error', () => {
    const result = validateApiSpec(makeProviderSpec({ activeCondition: 'IsActive = 1; DROP TABLE Users' }));
    expect(result.errors.some((e: string) => e.includes('activeCondition'))).toBe(true);
  });

  it('activeCondition with SQL comment markers → error', () => {
    const result = validateApiSpec(makeProviderSpec({ activeCondition: 'IsActive = 1 -- comment' }));
    expect(result.errors.some((e: string) => e.includes('activeCondition'))).toBe(true);
  });

  it('activeCondition with dangerous keywords → error', () => {
    const result = validateApiSpec(makeProviderSpec({ activeCondition: '1=1) UNION SELECT password FROM users WHERE (1=1' }));
    expect(result.errors.some((e: string) => e.includes('activeCondition'))).toBe(true);
  });

  it('valid activeCondition passes', () => {
    const result = validateApiSpec(makeProviderSpec({ activeCondition: 'IsActive = 1' }));
    expect(result.valid).toBe(true);
  });

  it('emailColumn with invalid identifier → error', () => {
    const result = validateApiSpec(makeProviderSpec({ emailColumn: 'DROP TABLE--' }));
    expect(result.errors.some((e: string) => e.includes('emailColumn'))).toBe(true);
  });

  it('valid emailColumn passes', () => {
    const result = validateApiSpec(makeProviderSpec({ emailColumn: 'Email' }));
    expect(result.valid).toBe(true);
  });

  it('displayNameQuery without @username → error', () => {
    const result = validateApiSpec(makeProviderSpec({ displayNameQuery: 'SELECT name FROM Users' }));
    expect(result.errors.some((e: string) => e.includes('displayNameQuery') && e.includes('@username'))).toBe(true);
  });

  it('displayNameQuery with semicolons → error', () => {
    const result = validateApiSpec(makeProviderSpec({ displayNameQuery: 'SELECT name FROM Users WHERE user = @username; DROP TABLE Users' }));
    expect(result.errors.some((e: string) => e.includes('displayNameQuery') && e.includes('semicolon'))).toBe(true);
  });

  it('valid displayNameQuery passes', () => {
    const result = validateApiSpec(makeProviderSpec({ displayNameQuery: 'SELECT FirstName + LastName AS val FROM Users WHERE Username = @username' }));
    expect(result.valid).toBe(true);
  });

  it('defaultScopeQuery without @username → error', () => {
    const result = validateApiSpec(makeProviderSpec({ defaultScopeQuery: 'SELECT scope FROM Users' }));
    expect(result.errors.some((e: string) => e.includes('defaultScopeQuery') && e.includes('@username'))).toBe(true);
  });

  it('defaultScopeQuery with semicolons → error', () => {
    const result = validateApiSpec(makeProviderSpec({ defaultScopeQuery: 'SELECT scope FROM Users WHERE u = @username; DROP TABLE x' }));
    expect(result.errors.some((e: string) => e.includes('defaultScopeQuery') && e.includes('semicolon'))).toBe(true);
  });

  it('rolesQuery with semicolons → error', () => {
    const result = validateApiSpec(makeProviderSpec({ rolesQuery: 'SELECT role FROM Roles WHERE u = @username; DROP TABLE x' }));
    expect(result.errors.some((e: string) => e.includes('rolesQuery') && e.includes('semicolon'))).toBe(true);
  });

  it('scopeQuery with semicolons → error', () => {
    const result = validateApiSpec(makeProviderSpec({ scopeQuery: 'SELECT scope FROM Scopes WHERE u = @username; DROP TABLE x' }));
    expect(result.errors.some((e: string) => e.includes('scopeQuery') && e.includes('semicolon'))).toBe(true);
  });

  it('endpoint scopeFilter column override validated', () => {
    const result = validateApiSpec(makeSpec({
      auth: {
        strategy: 'jwt',
        scopeFilter: { claim: 'inst', column: 'idInst' },
      },
      endpoints: {
        test: {
          path: '/api/test', query: 'SELECT 1',
          scopeFilter: { column: 'DROP TABLE--' },
        },
      },
    }));
    expect(result.errors.some((e: string) => e.includes('scopeFilter') && e.includes('identifier'))).toBe(true);
  });
});
