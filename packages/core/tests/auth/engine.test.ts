import { describe, it, expect } from 'vitest';
import { createAuthEngine } from '../../src/auth/engine.js';
import { createMockAuthProvider } from '../../src/auth/providers/mock.js';
import { createStateStore } from '../../src/state/store.js';
import type { AuthEngineConfig } from '../../src/auth/types.js';

function setup(opts: { shouldFail?: boolean; shouldFailRefresh?: boolean; delay?: number } = {}) {
  const store = createStateStore({});
  const provider = createMockAuthProvider({
    user: { id: 'u1', email: 'john@test.com', name: 'John', role: 'admin', roles: ['admin', 'editor'] },
    shouldFail: opts.shouldFail,
    shouldFailRefresh: opts.shouldFailRefresh,
    delay: opts.delay,
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
  return { store, provider, engine };
}

describe('AuthEngine', () => {
  // ─── Login ───

  it('login writes safe derived data to state', async () => {
    const { store, engine } = setup();
    await engine.login({ email: 'john@test.com', password: 'pass' });

    expect(store.get('/auth/isAuthenticated')).toBe(true);
    expect(store.get('/auth/user/id')).toBe('u1');
    expect(store.get('/auth/user/email')).toBe('john@test.com');
    expect(store.get('/auth/user/name')).toBe('John');
    expect(store.get('/auth/user/role')).toBe('admin');
    expect(store.get('/auth/user/roles')).toEqual(['admin', 'editor']);
    expect(store.get('/auth/loading')).toBe(false);
    expect(store.get('/auth/error')).toBeNull();
  });

  it('token is NOT accessible via state store', async () => {
    const { store, engine } = setup();
    await engine.login({ email: 'john@test.com', password: 'pass' });

    expect(store.get('/auth/token')).toBeUndefined();
    expect(store.get('/auth/refreshToken')).toBeUndefined();
    expect(store.get('/auth/access_token')).toBeUndefined();
  });

  it('getAccessToken returns token from closure', async () => {
    const { engine } = setup();
    expect(engine.getAccessToken()).toBeNull();

    await engine.login({ email: 'john@test.com', password: 'pass' });
    const token = engine.getAccessToken();
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token!.length).toBeGreaterThan(0);
  });

  it('login sets loading state during operation', async () => {
    const { store, engine } = setup({ delay: 50 });
    const promise = engine.login({ email: 'john@test.com', password: 'pass' });

    expect(store.get('/auth/loading')).toBe(true);
    await promise;
    expect(store.get('/auth/loading')).toBe(false);
  });

  it('login writes error on failure', async () => {
    const { store, engine } = setup({ shouldFail: true });

    await expect(engine.login({ email: 'x', password: 'x' })).rejects.toThrow();

    expect(store.get('/auth/isAuthenticated')).toBe(false);
    expect(store.get('/auth/error')).toBeDefined();
    expect(typeof store.get('/auth/error')).toBe('string');
    expect(store.get('/auth/loading')).toBe(false);
  });

  it('login clears previous error on new attempt', async () => {
    const store = createStateStore({});
    const failProvider = createMockAuthProvider({
      user: { id: 'u1', email: 'john@test.com', role: 'admin', roles: ['admin'] },
      shouldFail: true,
    });
    const config: AuthEngineConfig = {
      provider: failProvider,
      store,
      config: { loginScreen: 'login', protectedScreens: ['*'], roleAccess: {}, persistence: 'memory', tokenRefresh: false, authDomains: [] },
    };
    const engine = createAuthEngine(config);

    // First attempt fails
    await engine.login({ email: 'x', password: 'x' }).catch(() => {});
    expect(store.get('/auth/error')).toBeDefined();

    // Create new engine with successful provider to test error clearing
    const successProvider = createMockAuthProvider({
      user: { id: 'u1', email: 'john@test.com', role: 'admin', roles: ['admin'] },
    });
    const engine2 = createAuthEngine({ ...config, provider: successProvider });
    await engine2.login({ email: 'john@test.com', password: 'pass' });
    expect(store.get('/auth/error')).toBeNull();
  });

  // ─── Logout ───

  it('logout clears everything', async () => {
    const { store, engine } = setup();
    await engine.login({ email: 'john@test.com', password: 'pass' });
    expect(store.get('/auth/isAuthenticated')).toBe(true);

    await engine.logout();

    expect(store.get('/auth/isAuthenticated')).toBe(false);
    expect(store.get('/auth/user/email')).toBeNull();
    expect(store.get('/auth/user/role')).toBeNull();
    expect(store.get('/auth/user/roles')).toBeNull();
    expect(store.get('/auth/user/id')).toBeNull();
    expect(store.get('/auth/user/name')).toBeNull();
    expect(store.get('/auth/loading')).toBe(false);
    expect(store.get('/auth/error')).toBeNull();
    expect(engine.getAccessToken()).toBeNull();
    expect(engine.isAuthenticated()).toBe(false);
  });

  // ─── isAuthenticated ───

  it('isAuthenticated returns correct state', async () => {
    const { engine } = setup();
    expect(engine.isAuthenticated()).toBe(false);

    await engine.login({ email: 'john@test.com', password: 'pass' });
    expect(engine.isAuthenticated()).toBe(true);

    await engine.logout();
    expect(engine.isAuthenticated()).toBe(false);
  });

  // ─── getConfig ───

  it('getConfig returns auth config', () => {
    const { engine } = setup();
    const config = engine.getConfig();
    expect(config.loginScreen).toBe('login');
    expect(config.authDomains).toEqual(['api.test.com']);
    expect(config.persistence).toBe('memory');
  });

  // ─── Destroy ───

  it('destroy clears tokens', async () => {
    const { engine } = setup();
    await engine.login({ email: 'john@test.com', password: 'pass' });
    expect(engine.getAccessToken()).toBeDefined();

    engine.destroy();
    expect(engine.getAccessToken()).toBeNull();
    expect(engine.isAuthenticated()).toBe(false);
  });

  // ─── Multiple logins ───

  it('second login replaces first session', async () => {
    const { store, engine } = setup();
    await engine.login({ email: 'john@test.com', password: 'pass' });
    const firstToken = engine.getAccessToken();

    await engine.login({ email: 'john@test.com', password: 'pass' });
    const secondToken = engine.getAccessToken();

    expect(secondToken).not.toBe(firstToken);
    expect(store.get('/auth/isAuthenticated')).toBe(true);
  });
});
