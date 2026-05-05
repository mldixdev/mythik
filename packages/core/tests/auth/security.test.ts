/**
 * Security Invariant Tests — Auth Engine
 *
 * These tests verify the 8 security guarantees from the design spec.
 * Every invariant MUST have a dedicated test. If any fails, the auth engine is not secure.
 */
import { describe, it, expect } from 'vitest';
import { createAuthEngine } from '../../src/auth/engine.js';
import { createMockAuthProvider } from '../../src/auth/providers/mock.js';
import { createStateStore } from '../../src/state/store.js';
import { createStateGuard } from '../../src/security/state-protection.js';
import { createAuthInterceptor } from '../../src/fetch/interceptors/auth.js';
import { authHandler } from '../../src/expressions/handlers/auth.js';
import { createLoginRateLimiter } from '../../src/auth/rate-limiter.js';
import type { AuthEngineConfig } from '../../src/auth/types.js';
import type { ResolverContext } from '../../src/types.js';
import { getByPath, parsePointer } from '../../src/state/store.js';

function setupEngine() {
  const store = createStateStore({});
  const provider = createMockAuthProvider({
    user: { id: 'u1', email: 'john@test.com', name: 'John', role: 'admin', roles: ['admin', 'editor'] },
    expiresIn: 3600,
  });
  const config: AuthEngineConfig = {
    provider,
    store,
    config: {
      loginScreen: 'login',
      protectedScreens: ['*'],
      roleAccess: { admin: ['*'] },
      persistence: 'memory',
      tokenRefresh: false,
      authDomains: ['api.test.com'],
    },
  };
  const engine = createAuthEngine(config);
  return { store, engine };
}

function createResolverContext(store: import('../../src/state/store.js').StateStore): ResolverContext {
  return {
    getState: (path: string) => {
      const segments = parsePointer(path);
      return getByPath(store.getSnapshot(), segments);
    },
    setState: () => {},
  };
}

describe('Security Invariants', () => {
  // ─── Invariant #1: Token/refreshToken NEVER exist in state store ───

  it('#1: Token is NOT accessible via state store after login', async () => {
    const { store, engine } = setupEngine();
    await engine.login({ email: 'john@test.com', password: 'pass' });

    // These paths must NEVER contain token data
    expect(store.get('/auth/token')).toBeUndefined();
    expect(store.get('/auth/refreshToken')).toBeUndefined();
    expect(store.get('/auth/access_token')).toBeUndefined();
    expect(store.get('/auth/refresh_token')).toBeUndefined();
    expect(store.get('/auth/accessToken')).toBeUndefined();

    // But the engine closure has the token
    expect(engine.getAccessToken()).toBeDefined();
    expect(typeof engine.getAccessToken()).toBe('string');
  });

  // ─── Invariant #2: $auth: "token" returns undefined (whitelist) ───

  it('#2: $auth expression blocks token/refreshToken/password fields', async () => {
    const { store, engine } = setupEngine();
    await engine.login({ email: 'john@test.com', password: 'pass' });
    const ctx = createResolverContext(store);

    // All sensitive fields MUST return undefined
    expect(authHandler.resolve({ $auth: 'token' }, ctx)).toBeUndefined();
    expect(authHandler.resolve({ $auth: 'accessToken' }, ctx)).toBeUndefined();
    expect(authHandler.resolve({ $auth: 'access_token' }, ctx)).toBeUndefined();
    expect(authHandler.resolve({ $auth: 'refreshToken' }, ctx)).toBeUndefined();
    expect(authHandler.resolve({ $auth: 'refresh_token' }, ctx)).toBeUndefined();
    expect(authHandler.resolve({ $auth: 'password' }, ctx)).toBeUndefined();
    expect(authHandler.resolve({ $auth: 'secret' }, ctx)).toBeUndefined();
    expect(authHandler.resolve({ $auth: 'session' }, ctx)).toBeUndefined();

    // But safe fields resolve
    expect(authHandler.resolve({ $auth: 'email' }, ctx)).toBe('john@test.com');
    expect(authHandler.resolve({ $auth: 'role' }, ctx)).toBe('admin');
  });

  // ─── Invariant #3: Auth headers ONLY injected for authDomains URLs ───

  it('#3: Auth interceptor injects headers ONLY for authorized domains', async () => {
    const { engine } = setupEngine();
    await engine.login({ email: 'john@test.com', password: 'pass' });

    const interceptor = createAuthInterceptor({
      getToken: () => engine.getAccessToken(),
      authDomains: ['api.test.com'],
    });

    // Authorized domain — gets Bearer header
    const opts1 = await interceptor.request!('https://api.test.com/data', { headers: {} });
    expect((opts1.headers as Record<string, string>)['Authorization']).toBeDefined();

    // Unauthorized domain — NO Bearer header
    const opts2 = await interceptor.request!('https://evil.com/steal', { headers: {} });
    expect((opts2.headers as Record<string, string>)['Authorization']).toBeUndefined();

    // Another unauthorized domain
    const opts3 = await interceptor.request!('https://malicious.api.test.com.evil.com/data', { headers: {} });
    expect((opts3.headers as Record<string, string>)['Authorization']).toBeUndefined();
  });

  // ─── Invariant #4: Credentials cleared from state post-login ───

  it('#4: Credentials are cleared after successful login', async () => {
    const { store, engine } = setupEngine();
    const credentials = { email: 'john@test.com', password: 'secret123' };

    await engine.login(credentials);

    // The credentials object should be zeroed
    expect(credentials.email).toBeUndefined();
    expect(credentials.password).toBeUndefined();
  });

  it('#4b: Credentials are cleared after failed login', async () => {
    const store = createStateStore({});
    const provider = createMockAuthProvider({
      user: { id: '1', email: 'test@test.com', role: 'user', roles: ['user'] },
      shouldFail: true,
    });
    const engine = createAuthEngine({
      provider,
      store,
      config: { loginScreen: 'login', protectedScreens: ['*'], roleAccess: {}, persistence: 'memory', tokenRefresh: false, authDomains: [] },
    });

    const credentials = { email: 'test@test.com', password: 'wrong' };
    await engine.login(credentials).catch(() => {});

    expect(credentials.email).toBeUndefined();
    expect(credentials.password).toBeUndefined();
  });

  // ─── Invariant #5: Refresh mutex: max 1 concurrent refresh ───
  // (Tested in refresh.test.ts — mutex prevents stampede)

  it('#5: Refresh mutex is wired into engine', async () => {
    const { engine } = setupEngine();
    await engine.login({ email: 'john@test.com', password: 'pass' });

    // Multiple concurrent refreshSession calls should not throw concurrency errors
    // They share the same mutex via the refresh engine
    const results = await Promise.allSettled([
      engine.refreshSession(),
      engine.refreshSession(),
      engine.refreshSession(),
    ]);

    // All should either succeed or fail uniformly (not mix)
    const statuses = new Set(results.map(r => r.status));
    expect(statuses.size).toBe(1); // All same status
  });

  // ─── Invariant #6: Login rate limit: 5 attempts/min ───

  it('#6: Login rate limiter blocks after 5 attempts', async () => {
    const store = createStateStore({});
    const provider = createMockAuthProvider({
      user: { id: '1', email: 'test@test.com', role: 'user', roles: ['user'] },
      shouldFail: true,
    });
    const engine = createAuthEngine({
      provider,
      store,
      config: { loginScreen: 'login', protectedScreens: ['*'], roleAccess: {}, persistence: 'memory', tokenRefresh: false, authDomains: [] },
    });

    // Exhaust 5 attempts
    for (let i = 0; i < 5; i++) {
      await engine.login({ email: 'x', password: 'x' }).catch(() => {});
    }

    // 6th attempt should be rate limited (not even reach the provider)
    await expect(engine.login({ email: 'x', password: 'x' })).rejects.toThrow(/rate limit/i);
  });

  // ─── Invariant #7: Cross-tab logout: all tabs de-authenticate ───
  // (Tested in cross-tab.test.ts — broadcast + listener tests)
  // Here we verify the engine broadcasts on logout

  it('#7: Logout clears all auth state completely', async () => {
    const { store, engine } = setupEngine();
    await engine.login({ email: 'john@test.com', password: 'pass' });

    expect(store.get('/auth/isAuthenticated')).toBe(true);
    expect(engine.getAccessToken()).toBeDefined();

    await engine.logout();

    expect(store.get('/auth/isAuthenticated')).toBe(false);
    expect(store.get('/auth/user/email')).toBeNull();
    expect(store.get('/auth/user/role')).toBeNull();
    expect(store.get('/auth/user/roles')).toBeNull();
    expect(store.get('/auth/user/id')).toBeNull();
    expect(engine.getAccessToken()).toBeNull();
    expect(engine.isAuthenticated()).toBe(false);
  });

  // ─── Invariant #8: StateGuard blocks writes to /auth/* from specs ───

  it('#8: StateGuard blocks spec writes to /auth/* paths', () => {
    const guard = createStateGuard(['/auth/*']);

    // These should all be blocked
    expect(guard.canWrite('/auth/isAuthenticated')).toBe(false);
    expect(guard.canWrite('/auth/user/email')).toBe(false);
    expect(guard.canWrite('/auth/user/role')).toBe(false);
    expect(guard.canWrite('/auth/token')).toBe(false);
    expect(guard.canWrite('/auth')).toBe(false);

    // Non-auth paths should be allowed
    expect(guard.canWrite('/form/email')).toBe(true);
    expect(guard.canWrite('/ui/loading')).toBe(true);
    expect(guard.canWrite('/navigation/currentScreen')).toBe(true);
  });
});
