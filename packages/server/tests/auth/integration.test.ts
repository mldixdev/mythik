import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createAuthMiddleware } from '../../src/auth/middleware.js';
import { buildScopeWhereClause, wrapQueryWithScopeFilter, validateScopeForInsert, resolveActiveScope } from '../../src/auth/scope-filter.js';
import type { AuthConfig, ScopeFilterConfig } from '../../src/auth/types.js';

const SECRET = 'integration-test-secret-32-chars!!';

function makeToken(claims: Record<string, unknown>): string {
  return jwt.sign(claims, SECRET, { issuer: 'test', expiresIn: '1h' });
}

const authConfig: AuthConfig = {
  strategy: 'jwt',
  jwt: {
    secret: SECRET,
    issuer: 'test',
    claims: { username: 'sub', roles: 'roles', scope: 'organizations' },
  },
  policies: {
    records: { roles: ['ADMIN', 'EDITOR'] },
    admin: { roles: ['ADMIN'] },
  },
  scopeFilter: {
    claim: 'organizations',
    type: 'int',
    column: 'organizationId',
    bypassRoles: ['ADMIN'],
    mode: 'all',
  },
};

describe('Full Auth Pipeline Integration', () => {
  function createApp() {
    const app = express();
    app.use(express.json());
    const auth = createAuthMiddleware(authConfig);

    // Public endpoint
    app.get('/api/health', auth('public'), (_req, res) => res.json({ status: 'ok' }));

    // Authenticated only (no specific policy)
    app.get('/api/profile', auth(), (req, res) => {
      res.json({ user: (req as unknown as Record<string, unknown>).user });
    });

    // Policy-protected endpoint
    app.get('/api/records', auth('records'), (req, res) => {
      res.json({ data: [], user: (req as unknown as Record<string, unknown>).user });
    });

    // Admin-only endpoint
    app.get('/api/admin', auth('admin'), (_req, res) => res.json({ admin: true }));

    return app;
  }

  it('public endpoint accessible without token', async () => {
    const app = createApp();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('authenticated endpoint rejects without token', async () => {
    const app = createApp();
    const res = await request(app).get('/api/profile');
    expect(res.status).toBe(401);
  });

  it('authenticated endpoint works with valid token', async () => {
    const app = createApp();
    const token = makeToken({ sub: 'sample-user', roles: ['EDITOR'], organizations: [1, 5] });
    const res = await request(app).get('/api/profile').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('sample-user');
  });

  it('policy endpoint allows matching role', async () => {
    const app = createApp();
    const token = makeToken({ sub: 'sample-user', roles: ['EDITOR'] });
    const res = await request(app).get('/api/records').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('policy endpoint rejects non-matching role', async () => {
    const app = createApp();
    const token = makeToken({ sub: 'sample-user', roles: ['AUDITOR'] });
    const res = await request(app).get('/api/records').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('admin endpoint rejects non-admin', async () => {
    const app = createApp();
    const token = makeToken({ sub: 'sample-user', roles: ['EDITOR'] });
    const res = await request(app).get('/api/admin').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('admin endpoint allows admin', async () => {
    const app = createApp();
    const token = makeToken({ sub: 'admin', roles: ['ADMIN'] });
    const res = await request(app).get('/api/admin').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('expired token is rejected', async () => {
    const app = createApp();
    const token = jwt.sign({ sub: 'sample-user', roles: ['EDITOR'] }, SECRET, { issuer: 'test', expiresIn: '0s' });
    await new Promise(r => setTimeout(r, 10));
    const res = await request(app).get('/api/profile').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_INVALID');
  });
});

describe('Scope Filter — SQL Generation Integration', () => {
  const scopeConfig: ScopeFilterConfig = {
    claim: 'organizations',
    type: 'int',
    column: 'organizationId',
    bypassRoles: ['ADMIN'],
    mode: 'all',
  };

  it('wraps query with scope filter', () => {
    const clause = buildScopeWhereClause(scopeConfig, [1, 5], undefined, ['EDITOR'])!;
    const wrapped = wrapQueryWithScopeFilter('SELECT * FROM sample_table WHERE year = @year', clause);
    expect(wrapped).toContain('AS _scoped');
    expect(wrapped).toContain('_scoped.organizationId IN');
    expect(wrapped).toContain('@_scope0');
  });

  it('scope filter with select mode uses header value', () => {
    const selectConfig: ScopeFilterConfig = { ...scopeConfig, mode: 'select', header: 'X-Scope' };
    const active = resolveActiveScope('5', 'int');
    const clause = buildScopeWhereClause(selectConfig, [3, 5, 12], active, ['EDITOR'])!;
    expect(clause.sql).toContain('= @_activeScope');
    expect(clause.params._activeScope).toBe(5);
  });

  it('insert validation blocks out-of-scope', () => {
    expect(validateScopeForInsert(scopeConfig, { organizationId: 99 }, [1, 5], ['EDITOR'])).toBe(false);
  });

  it('insert validation allows in-scope', () => {
    expect(validateScopeForInsert(scopeConfig, { organizationId: 5 }, [1, 5], ['EDITOR'])).toBe(true);
  });

  it('ADMIN bypasses all scope filters', () => {
    expect(buildScopeWhereClause(scopeConfig, [], undefined, ['ADMIN'])).toBeNull();
    expect(validateScopeForInsert(scopeConfig, { organizationId: 99 }, [], ['ADMIN'])).toBe(true);
  });
});
