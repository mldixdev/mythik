import { describe, it, expect, vi } from 'vitest';
import { createMockAuthProvider } from '../../src/auth/providers/mock.js';
import { createCustomJWTProvider } from '../../src/auth/providers/custom-jwt.js';

describe('MockAuthProvider', () => {
  it('login returns configured user', async () => {
    const provider = createMockAuthProvider({
      user: { id: '1', email: 'test@test.com', name: 'Test', role: 'admin', roles: ['admin'] },
    });
    const result = await provider.login({ email: 'any', password: 'any' });
    expect(result.token).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.expiresIn).toBeDefined();
    expect(result.user.email).toBe('test@test.com');
    expect(result.user.role).toBe('admin');
    expect(result.user.roles).toEqual(['admin']);
  });

  it('login rejects when configured to fail', async () => {
    const provider = createMockAuthProvider({
      user: { id: '1', email: 'test@test.com', role: 'user', roles: ['user'] },
      shouldFail: true,
      errorMessage: 'Invalid credentials',
    });
    await expect(provider.login({ email: 'a', password: 'b' })).rejects.toThrow('Invalid credentials');
  });

  it('logout resolves', async () => {
    const provider = createMockAuthProvider({
      user: { id: '1', email: 'test@test.com', role: 'user', roles: ['user'] },
    });
    await expect(provider.logout()).resolves.toBeUndefined();
  });

  it('refresh returns new token with same user', async () => {
    const provider = createMockAuthProvider({
      user: { id: '1', email: 'test@test.com', role: 'user', roles: ['user'] },
    });
    const result = await provider.refresh('old-token');
    expect(result.token).toBeDefined();
    expect(result.token).not.toBe('old-token');
    expect(result.user.email).toBe('test@test.com');
  });

  it('refresh rejects when configured to fail', async () => {
    const provider = createMockAuthProvider({
      user: { id: '1', email: 'test@test.com', role: 'user', roles: ['user'] },
      shouldFailRefresh: true,
    });
    await expect(provider.refresh('old')).rejects.toThrow();
  });

  it('getUser returns configured user', async () => {
    const provider = createMockAuthProvider({
      user: { id: '1', email: 'test@test.com', role: 'admin', roles: ['admin', 'editor'] },
    });
    const user = await provider.getUser('any-token');
    expect(user.id).toBe('1');
    expect(user.email).toBe('test@test.com');
    expect(user.roles).toEqual(['admin', 'editor']);
  });

  it('simulates delay when configured', async () => {
    const provider = createMockAuthProvider({
      user: { id: '1', email: 'test@test.com', role: 'user', roles: ['user'] },
      delay: 50,
    });
    const start = Date.now();
    await provider.login({ email: 'a', password: 'b' });
    expect(Date.now() - start).toBeGreaterThanOrEqual(40);
  });

  it('generates unique tokens per call', async () => {
    const provider = createMockAuthProvider({
      user: { id: '1', email: 'test@test.com', role: 'user', roles: ['user'] },
    });
    const r1 = await provider.login({ email: 'a', password: 'b' });
    const r2 = await provider.login({ email: 'a', password: 'b' });
    expect(r1.token).not.toBe(r2.token);
  });

  it('user has correct default fields', async () => {
    const provider = createMockAuthProvider({
      user: { id: '1', email: 'test@test.com', role: 'viewer', roles: ['viewer'] },
    });
    const result = await provider.login({ email: 'a', password: 'b' });
    expect(result.user.id).toBe('1');
    expect(result.user.name).toBeUndefined();
    expect(result.user.avatar).toBeUndefined();
    expect(result.user.metadata).toBeUndefined();
  });
});

// ─── CustomJWTProvider ───

describe('CustomJWTProvider', () => {
  function mockFetch(responseData: unknown, status = 200) {
    return vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => responseData,
    } as Response);
  }

  it('login sends POST to loginUrl and extracts token/user', async () => {
    const fetcher = mockFetch({
      token: 'jwt-abc',
      refreshToken: 'rt-xyz',
      user: { id: '1', email: 'john@test.com', role: 'admin', roles: ['admin'] },
    });

    const provider = createCustomJWTProvider({
      loginUrl: 'https://api.test.com/auth/login',
      fetcher,
    });

    const result = await provider.login({ email: 'john@test.com', password: 'pass' });
    expect(result.token).toBe('jwt-abc');
    expect(result.refreshToken).toBe('rt-xyz');
    expect(result.user.email).toBe('john@test.com');
    expect(result.user.role).toBe('admin');

    expect(fetcher).toHaveBeenCalledWith('https://api.test.com/auth/login', expect.objectContaining({ method: 'POST' }));
  });

  it('login with custom tokenPath/userPath (dot notation)', async () => {
    const fetcher = mockFetch({
      data: {
        access_token: 'deep-token',
        refresh_token: 'deep-refresh',
        user_info: { id: '2', email: 'jane@test.com', role: 'viewer' },
      },
    });

    const provider = createCustomJWTProvider({
      loginUrl: 'https://api.test.com/auth/login',
      tokenPath: 'data.access_token',
      refreshTokenPath: 'data.refresh_token',
      userPath: 'data.user_info',
      fetcher,
    });

    const result = await provider.login({ email: 'jane', password: 'pass' });
    expect(result.token).toBe('deep-token');
    expect(result.refreshToken).toBe('deep-refresh');
    expect(result.user.email).toBe('jane@test.com');
  });

  it('plain rolePath and rolesPath resolve relative to userPath', async () => {
    const fetcher = mockFetch({
      data: {
        access_token: 'deep-token',
        user_info: {
          id: '2',
          email: 'jane@test.com',
          role: 'manager',
          roles: ['manager', 'auditor'],
        },
      },
    });

    const provider = createCustomJWTProvider({
      loginUrl: 'https://api.test.com/auth/login',
      tokenPath: 'data.access_token',
      userPath: 'data.user_info',
      rolePath: 'role',
      rolesPath: 'roles',
      fetcher,
    });

    const result = await provider.login({ email: 'jane', password: 'pass' });
    expect(result.user.role).toBe('manager');
    expect(result.user.roles).toEqual(['manager', 'auditor']);
  });

  it('dotted rolePath and rolesPath resolve against the full response', async () => {
    const fetcher = mockFetch({
      data: {
        access_token: 'deep-token',
        user_info: { id: '2', email: 'jane@test.com' },
      },
      authz: {
        role: 'admin',
        roles: ['admin', 'operator'],
      },
    });

    const provider = createCustomJWTProvider({
      loginUrl: 'https://api.test.com/auth/login',
      tokenPath: 'data.access_token',
      userPath: 'data.user_info',
      rolePath: 'authz.role',
      rolesPath: 'authz.roles',
      fetcher,
    });

    const result = await provider.login({ email: 'jane', password: 'pass' });
    expect(result.user.role).toBe('admin');
    expect(result.user.roles).toEqual(['admin', 'operator']);
  });

  it('warns in dev when role mapping falls back to defaultRole', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetcher = mockFetch({
      token: 'tk',
      user: { id: '1', email: 'a@b.com' },
    });

    const provider = createCustomJWTProvider({ loginUrl: 'https://api.test.com/login', defaultRole: 'guest', fetcher });
    const result = await provider.login({ email: 'a', password: 'b' });

    expect(result.user.role).toBe('guest');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('using defaultRole "guest"'));
    warnSpy.mockRestore();
  });

  it('login with body template ($email/$password replacement)', async () => {
    const fetcher = mockFetch({
      token: 'tk',
      user: { id: '1', email: 'a@b.com', role: 'user' },
    });

    const provider = createCustomJWTProvider({
      loginUrl: 'https://api.test.com/login',
      loginBody: { credentials: { username: '$email', pass: '$password' } },
      fetcher,
    });

    await provider.login({ email: 'john@test.com', password: 'secret' });

    const calledBody = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(calledBody.credentials.username).toBe('john@test.com');
    expect(calledBody.credentials.pass).toBe('secret');
  });

  it('login throws on HTTP error with top-level message', async () => {
    const fetcher = mockFetch({ message: 'Invalid credentials' }, 401);
    const provider = createCustomJWTProvider({ loginUrl: 'https://api.test.com/login', fetcher });

    await expect(provider.login({ email: 'a', password: 'b' })).rejects.toThrow('Invalid credentials');
  });

  it('login extracts error.message from nested error response (Mythik server format)', async () => {
    const fetcher = mockFetch({ error: { code: 'INVALID_CREDENTIALS', message: 'Credenciales inválidas' } }, 401);
    const provider = createCustomJWTProvider({ loginUrl: 'https://api.test.com/login', fetcher });

    await expect(provider.login({ email: 'a', password: 'b' })).rejects.toThrow('Credenciales inválidas');
  });

  it('refresh extracts error message from response body', async () => {
    const fetcher = mockFetch({ error: { code: 'TOKEN_EXPIRED', message: 'Refresh token expired' } }, 401);
    const provider = createCustomJWTProvider({
      loginUrl: 'https://api.test.com/login',
      refreshUrl: 'https://api.test.com/refresh',
      fetcher,
    });

    await expect(provider.refresh('old-rt')).rejects.toThrow('Refresh token expired');
  });

  it('refresh sends POST to refreshUrl', async () => {
    const fetcher = mockFetch({
      token: 'new-token',
      refreshToken: 'new-rt',
      user: { id: '1', email: 'a@b.com', role: 'user' },
    });

    const provider = createCustomJWTProvider({
      loginUrl: 'https://api.test.com/login',
      refreshUrl: 'https://api.test.com/refresh',
      fetcher,
    });

    const result = await provider.refresh('old-rt');
    expect(result.token).toBe('new-token');
    expect(fetcher).toHaveBeenCalledWith('https://api.test.com/refresh', expect.objectContaining({ method: 'POST' }));
  });

  it('refresh throws when no refreshUrl configured', async () => {
    const provider = createCustomJWTProvider({
      loginUrl: 'https://api.test.com/login',
      fetcher: mockFetch({}),
    });

    await expect(provider.refresh('old')).rejects.toThrow(/not supported/i);
  });

  it('logout calls logoutUrl when configured', async () => {
    const fetcher = mockFetch({});
    const provider = createCustomJWTProvider({
      loginUrl: 'https://api.test.com/login',
      logoutUrl: 'https://api.test.com/logout',
      fetcher,
    });

    await provider.logout();
    expect(fetcher).toHaveBeenCalledWith('https://api.test.com/logout', expect.objectContaining({ method: 'POST' }));
  });

  it('logout is noop when no logoutUrl', async () => {
    const fetcher = mockFetch({});
    const provider = createCustomJWTProvider({ loginUrl: 'https://api.test.com/login', fetcher });

    await provider.logout(); // Should not throw
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('default role is "user" when none in response', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetcher = mockFetch({
      token: 'tk',
      user: { id: '1', email: 'a@b.com' },
    });

    const provider = createCustomJWTProvider({ loginUrl: 'https://api.test.com/login', fetcher });
    const result = await provider.login({ email: 'a', password: 'b' });
    expect(result.user.role).toBe('user');
    expect(result.user.roles).toContain('user');
    warnSpy.mockRestore();
  });

  it('custom defaultRole overrides', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetcher = mockFetch({
      token: 'tk',
      user: { id: '1', email: 'a@b.com' },
    });

    const provider = createCustomJWTProvider({ loginUrl: 'https://api.test.com/login', defaultRole: 'guest', fetcher });
    const result = await provider.login({ email: 'a', password: 'b' });
    expect(result.user.role).toBe('guest');
    warnSpy.mockRestore();
  });
});
