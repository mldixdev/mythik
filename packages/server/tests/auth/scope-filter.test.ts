import { describe, it, expect } from 'vitest';
import { buildScopeWhereClause, validateScopeForInsert, resolveActiveScope, wrapQueryWithScopeFilter } from '../../src/auth/scope-filter.js';
import type { ScopeFilterConfig } from '../../src/auth/types.js';

const allConfig: ScopeFilterConfig = {
  claim: 'organizations',
  type: 'int',
  column: 'organizationId',
  bypassRoles: ['ADMIN'],
  mode: 'all',
};

const selectConfig: ScopeFilterConfig = {
  claim: 'clinics',
  type: 'int',
  column: 'clinicId',
  bypassRoles: ['superadmin'],
  mode: 'select',
  header: 'X-Active-Scope',
};

describe('buildScopeWhereClause — mode "all"', () => {
  it('generates IN clause with parameterized scope values', () => {
    const result = buildScopeWhereClause(allConfig, [1, 5, 12], undefined, ['EDITOR']);
    expect(result!.sql).toContain('_scoped.organizationId IN');
    expect(result!.sql).toContain('@_scope0');
    expect(result!.sql).toContain('@_scope1');
    expect(result!.sql).toContain('@_scope2');
    expect(result!.params).toEqual({ _scope0: 1, _scope1: 5, _scope2: 12 });
  });

  it('returns null for bypass roles', () => {
    const result = buildScopeWhereClause(allConfig, [1, 5], undefined, ['ADMIN']);
    expect(result).toBeNull();
  });

  it('generates clause that blocks everything when scope is empty', () => {
    const result = buildScopeWhereClause(allConfig, [], undefined, ['EDITOR']);
    expect(result!.sql).toContain('1 = 0');
  });

  it('uses column override when provided', () => {
    const result = buildScopeWhereClause(allConfig, [1], undefined, ['EDITOR'], 'inst_id');
    expect(result!.sql).toContain('_scoped.inst_id IN');
  });
});

describe('buildScopeWhereClause — mode "select"', () => {
  it('generates equality clause with active scope', () => {
    const result = buildScopeWhereClause(selectConfig, [3, 5, 12], 5, ['user']);
    expect(result!.sql).toContain('_scoped.clinicId = @_activeScope');
    expect(result!.params).toEqual({ _activeScope: 5 });
  });

  it('returns null for bypass roles', () => {
    const result = buildScopeWhereClause(selectConfig, [3, 5], 5, ['superadmin']);
    expect(result).toBeNull();
  });
});

describe('resolveActiveScope', () => {
  it('parses int header value', () => {
    expect(resolveActiveScope('5', 'int')).toBe(5);
  });

  it('returns string as-is for string type', () => {
    expect(resolveActiveScope('abc', 'string')).toBe('abc');
  });

  it('returns null for missing header', () => {
    expect(resolveActiveScope(undefined, 'int')).toBeNull();
  });

  it('returns null for invalid int', () => {
    expect(resolveActiveScope('notanumber', 'int')).toBeNull();
  });
});

describe('validateScopeForInsert', () => {
  it('passes when body value is in user scope', () => {
    expect(validateScopeForInsert(allConfig, { organizationId: 5 }, [1, 5, 12], ['EDITOR'])).toBe(true);
  });

  it('fails when body value is not in user scope', () => {
    expect(validateScopeForInsert(allConfig, { organizationId: 99 }, [1, 5, 12], ['EDITOR'])).toBe(false);
  });

  it('passes for bypass roles', () => {
    expect(validateScopeForInsert(allConfig, { organizationId: 99 }, [], ['ADMIN'])).toBe(true);
  });

  it('fails when body does not contain scope column', () => {
    expect(validateScopeForInsert(allConfig, { otherField: 5 }, [1, 5], ['EDITOR'])).toBe(false);
  });
});

describe('wrapQueryWithScopeFilter', () => {
  it('wraps SQL as subquery with WHERE clause', () => {
    const clause = buildScopeWhereClause(allConfig, [1, 5], undefined, ['EDITOR'])!;
    const wrapped = wrapQueryWithScopeFilter('SELECT * FROM sample_table WHERE year = @year', clause);
    expect(wrapped).toContain('AS _scoped');
    expect(wrapped).toContain('_scoped.organizationId IN');
    expect(wrapped).toContain('SELECT * FROM sample_table WHERE year = @year');
  });
});
