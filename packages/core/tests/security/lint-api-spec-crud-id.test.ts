import { describe, it, expect } from 'vitest';
import { validateApiSpec } from '../../src/security/api-spec-validator.js';

describe('spec-crud-id-collision lint rule', () => {
  it('errors when endpoint.path ends with /:id and crud is present', () => {
    const spec = {
      endpoints: {
        salasById: { path: '/api/salas/:id', crud: { table: 'salas', primaryKey: 'id' } },
      },
    };
    const result = validateApiSpec(spec);
    const lint = result.lintWarnings?.filter(w => w.ruleId === 'spec-crud-id-collision') ?? [];
    expect(lint).toHaveLength(1);
    expect(lint[0].message).toContain(':id');
    expect(lint[0].path).toBe('/endpoints/salasById/path');
    expect(lint[0].suggestedFixes).toBeDefined();
    expect(lint[0].suggestedFixes![0].patch).toMatchObject({
      op: 'replace',
      path: '/endpoints/salasById/path',
      value: '/api/salas',
    });
  });

  it('does not error when endpoint.path lacks /:id (with crud)', () => {
    const spec = {
      endpoints: {
        salas: { path: '/api/salas', crud: { table: 'salas', primaryKey: 'id' } },
      },
    };
    const result = validateApiSpec(spec);
    const lint = result.lintWarnings?.filter(w => w.ruleId === 'spec-crud-id-collision') ?? [];
    expect(lint).toHaveLength(0);
  });

  it('does not error when endpoint has /:id but no crud (custom endpoint OK)', () => {
    const spec = {
      endpoints: {
        salasById: { path: '/api/salas/:id', method: 'GET' },
      },
    };
    const result = validateApiSpec(spec);
    const lint = result.lintWarnings?.filter(w => w.ruleId === 'spec-crud-id-collision') ?? [];
    expect(lint).toHaveLength(0);
  });

  it('only triggers on /:id literal (not other named params)', () => {
    const spec = {
      endpoints: {
        usersById: { path: '/api/users/:userId', crud: { table: 'users', primaryKey: 'userId' } },
      },
    };
    const result = validateApiSpec(spec);
    const lint = result.lintWarnings?.filter(w => w.ruleId === 'spec-crud-id-collision') ?? [];
    expect(lint).toHaveLength(0);
  });

  it('emits one error per matching endpoint with unique paths', () => {
    const spec = {
      endpoints: {
        a: { path: '/api/a/:id', crud: { table: 'a', primaryKey: 'id' } },
        b: { path: '/api/b/:id', crud: { table: 'b', primaryKey: 'id' } },
      },
    };
    const result = validateApiSpec(spec);
    const lint = result.lintWarnings?.filter(w => w.ruleId === 'spec-crud-id-collision') ?? [];
    expect(lint).toHaveLength(2);
    const paths = lint.map(w => w.path);
    expect(new Set(paths)).toEqual(new Set(['/endpoints/a/path', '/endpoints/b/path']));
  });
});
