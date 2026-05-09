import { describe, it, expect } from 'vitest';
import type { SqlDriver } from 'mythik/server';
import { createDbAuthProvider } from '../../src/auth/db-auth-provider.js';
import type { ProviderConfig, JwtConfig } from '../../src/auth/types.js';
import bcrypt from 'bcryptjs';

const passwordHash = bcrypt.hashSync('secret123', 10);

const providerConfig: ProviderConfig = {
  usersTable: 'AppUsers',
  usernameColumn: 'Username',
  passwordColumn: 'PasswordHash',
  passwordHash: 'bcrypt',
  activeCondition: 'IsActive = 1',
  emailColumn: 'Email',
  displayNameQuery: "SELECT FirstName + ' ' + LastName AS val FROM AppUsers WHERE Username = @username",
  rolesQuery: 'SELECT RoleCode AS val FROM AppRoles g JOIN UserRoles gu ON g.RoleId = gu.RoleId WHERE gu.Username = @username',
  scopeQuery: 'SELECT OrganizationId AS val FROM UserOrganizations WHERE Username = @username AND IsActive = 1',
  defaultScopeQuery: 'SELECT OrganizationId AS val FROM AppUsers WHERE Username = @username',
};

const jwtConfig: JwtConfig = {
  secret: 'test-secret-key-at-least-32-chars!!',
  issuer: 'test',
  expiresIn: 60,
  refreshExpiresIn: 10080,
  claims: { username: 'sub', name: 'nombre', roles: 'roles', scope: 'organizations' },
};

function createMockDriver(
  userData: Record<string, unknown> | null,
  rolesData: unknown[],
  scopeData: unknown[],
  displayName?: string,
  defaultScope?: unknown,
  email?: string,
): SqlDriver {
  return {
    query: async (sql: string, params?: unknown) => {
      expect(params).toEqual({ username: expect.any(String) });
      if (sql.includes('RoleCode')) {
        return rolesData.map(v => ({ val: v }));
      }
      if (sql.includes('UserOrganizations')) {
        return scopeData.map(v => ({ val: v }));
      }
      if (sql.includes('FirstName')) {
        return displayName ? [{ val: displayName }] : [];
      }
      if (sql.includes('OrganizationId') && sql.includes('AppUsers')) {
        return defaultScope !== undefined ? [{ val: defaultScope }] : [];
      }
      if (sql.includes('SELECT *') && sql.includes(providerConfig.usersTable)) {
        return userData ? [{ ...userData, Email: email ?? 'test@test.com' }] : [];
      }
      return [];
    },
    quoteIdent: (identifier: string) => `"${identifier}"`,
    quoteQualified: (...identifiers: string[]) => identifiers.map(identifier => `"${identifier}"`).join('.'),
  } as unknown as SqlDriver;
}

describe('DbAuthProvider', () => {
  describe('login', () => {
    it('returns token and user for valid credentials', async () => {
      const db = createMockDriver(
        { Username: 'sample-user', PasswordHash: passwordHash },
        ['ADMIN', 'EDITOR'],
        [1, 5, 12],
        'Sample User',
        5,
        'user@example.com',
      );
      const provider = createDbAuthProvider(providerConfig, jwtConfig, db);
      const result = await provider.login('sample-user', 'secret123');

      expect(result.token).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result.expiresIn).toBe(3600);
      expect(result.user.id).toBe('sample-user');
      expect(result.user.roles).toEqual(['ADMIN', 'EDITOR']);
      expect(result.user.scope).toEqual([1, 5, 12]);
      expect(result.user.name).toBe('Sample User');
      expect(result.user.email).toBe('user@example.com');
      expect(result.user.role).toBe('ADMIN');
      expect(result.user.defaultScope).toBe(5);
    });

    it('throws for non-existent user', async () => {
      const db = createMockDriver(null, [], []);
      const provider = createDbAuthProvider(providerConfig, jwtConfig, db);
      await expect(provider.login('nobody', 'pass')).rejects.toThrow('Invalid credentials');
    });

    it('throws for wrong password', async () => {
      const db = createMockDriver({ Username: 'sample-user', PasswordHash: passwordHash }, [], []);
      const provider = createDbAuthProvider(providerConfig, jwtConfig, db);
      await expect(provider.login('sample-user', 'wrongpass')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('refresh', () => {
    it('returns new tokens for valid refresh token', async () => {
      const db = createMockDriver(
        { Username: 'sample-user', PasswordHash: passwordHash },
        ['ADMIN'],
        [1, 5],
        'Sample User',
        1,
        'user@example.com',
      );
      const provider = createDbAuthProvider(providerConfig, jwtConfig, db);

      const loginResult = await provider.login('sample-user', 'secret123');
      // Wait 1.1s so JWT iat differs (JWTs use second precision)
      await new Promise(r => setTimeout(r, 1100));
      const refreshResult = await provider.refresh(loginResult.refreshToken);

      expect(refreshResult.token).toBeTruthy();
      expect(refreshResult.token).not.toBe(loginResult.token);
      expect(refreshResult.refreshToken).not.toBe(loginResult.refreshToken);
      expect(refreshResult.user.roles).toEqual(['ADMIN']);
    });

    it('throws for invalid refresh token', async () => {
      const db = createMockDriver(null, [], []);
      const provider = createDbAuthProvider(providerConfig, jwtConfig, db);
      await expect(provider.refresh('invalid-token')).rejects.toThrow('Invalid or expired refresh token');
    });
  });
});
