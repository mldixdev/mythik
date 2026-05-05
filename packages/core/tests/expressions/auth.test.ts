import { describe, it, expect } from 'vitest';
import { authHandler } from '../../src/expressions/handlers/auth.js';
import type { ResolverContext } from '../../src/types.js';
import { getByPath, parsePointer } from '../../src/state/store.js';

function createContext(state: Record<string, unknown>): ResolverContext {
  return {
    getState: (path: string) => {
      const segments = parsePointer(path);
      return getByPath(state, segments);
    },
    setState: () => {},
  };
}

describe('$auth handler', () => {
  const authState = {
    auth: {
      isAuthenticated: true,
      loading: false,
      error: null,
      user: {
        id: 'u1',
        email: 'john@test.com',
        name: 'John Doe',
        avatar: 'https://example.com/avatar.jpg',
        role: 'admin',
        roles: ['admin', 'editor'],
        metadata: { department: 'Engineering', level: 3 },
      },
    },
  };

  // ─── Whitelisted fields ───

  it('resolves isAuthenticated', () => {
    expect(authHandler.resolve({ $auth: 'isAuthenticated' }, createContext(authState))).toBe(true);
  });

  it('resolves id', () => {
    expect(authHandler.resolve({ $auth: 'id' }, createContext(authState))).toBe('u1');
  });

  it('resolves email', () => {
    expect(authHandler.resolve({ $auth: 'email' }, createContext(authState))).toBe('john@test.com');
  });

  it('resolves name', () => {
    expect(authHandler.resolve({ $auth: 'name' }, createContext(authState))).toBe('John Doe');
  });

  it('resolves avatar', () => {
    expect(authHandler.resolve({ $auth: 'avatar' }, createContext(authState))).toBe('https://example.com/avatar.jpg');
  });

  it('resolves role (primary)', () => {
    expect(authHandler.resolve({ $auth: 'role' }, createContext(authState))).toBe('admin');
  });

  it('resolves roles (array)', () => {
    expect(authHandler.resolve({ $auth: 'roles' }, createContext(authState))).toEqual(['admin', 'editor']);
  });

  it('resolves metadata (full object)', () => {
    expect(authHandler.resolve({ $auth: 'metadata' }, createContext(authState))).toEqual({ department: 'Engineering', level: 3 });
  });

  it('resolves metadata subpath (dot notation)', () => {
    expect(authHandler.resolve({ $auth: 'metadata.department' }, createContext(authState))).toBe('Engineering');
  });

  it('resolves metadata nested numeric value', () => {
    expect(authHandler.resolve({ $auth: 'metadata.level' }, createContext(authState))).toBe(3);
  });

  it('resolves user (full object)', () => {
    const user = authHandler.resolve({ $auth: 'user' }, createContext(authState));
    expect(user).toEqual(authState.auth.user);
  });

  it('resolves loading', () => {
    expect(authHandler.resolve({ $auth: 'loading' }, createContext(authState))).toBe(false);
  });

  it('resolves error', () => {
    expect(authHandler.resolve({ $auth: 'error' }, createContext(authState))).toBeNull();
  });

  // ─── Blocked fields (security) ───

  it('BLOCKS token — returns undefined', () => {
    expect(authHandler.resolve({ $auth: 'token' }, createContext(authState))).toBeUndefined();
  });

  it('BLOCKS accessToken — returns undefined', () => {
    expect(authHandler.resolve({ $auth: 'accessToken' }, createContext(authState))).toBeUndefined();
  });

  it('BLOCKS access_token — returns undefined', () => {
    expect(authHandler.resolve({ $auth: 'access_token' }, createContext(authState))).toBeUndefined();
  });

  it('BLOCKS refreshToken — returns undefined', () => {
    expect(authHandler.resolve({ $auth: 'refreshToken' }, createContext(authState))).toBeUndefined();
  });

  it('BLOCKS refresh_token — returns undefined', () => {
    expect(authHandler.resolve({ $auth: 'refresh_token' }, createContext(authState))).toBeUndefined();
  });

  it('BLOCKS password — returns undefined', () => {
    expect(authHandler.resolve({ $auth: 'password' }, createContext(authState))).toBeUndefined();
  });

  it('BLOCKS secret — returns undefined', () => {
    expect(authHandler.resolve({ $auth: 'secret' }, createContext(authState))).toBeUndefined();
  });

  it('BLOCKS session — returns undefined', () => {
    expect(authHandler.resolve({ $auth: 'session' }, createContext(authState))).toBeUndefined();
  });

  // ─── No auth state ───

  it('returns false for isAuthenticated when no auth state', () => {
    expect(authHandler.resolve({ $auth: 'isAuthenticated' }, createContext({}))).toBe(false);
  });

  it('returns undefined for user fields when no auth state', () => {
    expect(authHandler.resolve({ $auth: 'email' }, createContext({}))).toBeUndefined();
  });

  it('returns undefined for role when no auth state', () => {
    expect(authHandler.resolve({ $auth: 'role' }, createContext({}))).toBeUndefined();
  });

  it('returns undefined for unknown fields', () => {
    expect(authHandler.resolve({ $auth: 'nonexistent' }, createContext(authState))).toBeUndefined();
  });

  // ─── Defense in depth: blocked fields inside metadata ───

  it('BLOCKS metadata.token — returns undefined', () => {
    const stateWithBadMetadata = {
      auth: {
        ...authState.auth,
        user: { ...authState.auth.user, metadata: { token: 'leaked', department: 'Eng' } },
      },
    };
    expect(authHandler.resolve({ $auth: 'metadata.token' }, createContext(stateWithBadMetadata))).toBeUndefined();
  });

  it('BLOCKS metadata.password — returns undefined', () => {
    const stateWithBadMetadata = {
      auth: {
        ...authState.auth,
        user: { ...authState.auth.user, metadata: { password: 'leaked' } },
      },
    };
    expect(authHandler.resolve({ $auth: 'metadata.password' }, createContext(stateWithBadMetadata))).toBeUndefined();
  });

  it('allows non-sensitive metadata fields', () => {
    expect(authHandler.resolve({ $auth: 'metadata.department' }, createContext(authState))).toBe('Engineering');
  });

  // ─── Defense in depth: $auth "user" filters blocked fields from returned object ───

  it('$auth "user" strips any blocked fields from returned object', () => {
    const stateWithLeakedToken = {
      auth: {
        ...authState.auth,
        user: { ...authState.auth.user, token: 'leaked-token', password: 'leaked-pass' },
      },
    };
    const user = authHandler.resolve({ $auth: 'user' }, createContext(stateWithLeakedToken)) as Record<string, unknown>;
    expect(user.email).toBe('john@test.com');
    expect(user.token).toBeUndefined();
    expect(user.password).toBeUndefined();
  });

  // ─── Handler metadata ───

  it('has correct key', () => {
    expect(authHandler.key).toBe('$auth');
  });
});
