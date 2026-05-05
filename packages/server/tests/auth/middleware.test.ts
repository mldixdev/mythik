import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createAuthMiddleware } from '../../src/auth/middleware.js';
import type { AuthConfig } from '../../src/auth/types.js';

const SECRET = 'test-secret-key-at-least-32-chars!!';

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
    admin: { roles: ['ADMIN'] },
    records: { roles: ['ADMIN', 'EDITOR'] },
  },
};

function createTestApp(policy?: string) {
  const app = express();
  const middleware = createAuthMiddleware(authConfig);

  app.get('/test', middleware(policy), (req, res) => {
    res.json({ user: (req as Record<string, unknown>).user });
  });

  return app;
}

describe('Auth Middleware', () => {
  it('passes public endpoints without token', async () => {
    const app = createTestApp('public');
    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
  });

  it('rejects authenticated endpoint without token', async () => {
    const app = createTestApp();
    const res = await request(app).get('/test');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_REQUIRED');
  });

  it('rejects invalid token', async () => {
    const app = createTestApp();
    const res = await request(app).get('/test').set('Authorization', 'Bearer invalid-jwt');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_INVALID');
  });

  it('passes with valid token — default authenticated policy', async () => {
    const app = createTestApp();
    const token = makeToken({ sub: 'sample-user', roles: ['EDITOR'] });
    const res = await request(app).get('/test').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('sample-user');
    expect(res.body.user.roles).toEqual(['EDITOR']);
  });

  it('enforces named policy — user has required role', async () => {
    const app = createTestApp('records');
    const token = makeToken({ sub: 'sample-user', roles: ['EDITOR'] });
    const res = await request(app).get('/test').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('enforces named policy — user lacks required role', async () => {
    const app = createTestApp('admin');
    const token = makeToken({ sub: 'sample-user', roles: ['EDITOR'] });
    const res = await request(app).get('/test').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('maps claims to UserContext using configured mapping', async () => {
    const app = createTestApp();
    const token = makeToken({ sub: 'admin', roles: ['ADMIN'], organizations: [1, 5] });
    const res = await request(app).get('/test').set('Authorization', `Bearer ${token}`);
    expect(res.body.user.scope).toEqual([1, 5]);
  });
});
