/**
 * Manual auth E2E smoke test against a real SQL Server database.
 *
 * This script is intentionally opt-in and environment-driven. Do not hardcode
 * private database names, credentials, table names, users, emails, roles, or
 * production data here.
 *
 * Required:
 *   MYTHIK_E2E_SQLSERVER_AUTH=1
 *   MYTHIK_E2E_SQLSERVER_HOST=<host>
 *   MYTHIK_E2E_SQLSERVER_DATABASE=<database>
 *   MYTHIK_E2E_SQLSERVER_USER=<user>
 *   MYTHIK_E2E_SQLSERVER_PASSWORD=<password>
 *   MYTHIK_E2E_AUTH_JWT_SECRET=<secret>
 *   MYTHIK_E2E_AUTH_USERS_TABLE=<users-table>
 *   MYTHIK_E2E_AUTH_USERNAME_COLUMN=<username-column>
 *   MYTHIK_E2E_AUTH_PASSWORD_COLUMN=<password-column>
 *   MYTHIK_E2E_AUTH_LOGIN_USERNAME=<login-user>
 *   MYTHIK_E2E_AUTH_LOGIN_PASSWORD=<login-password>
 *   MYTHIK_E2E_AUTH_ALLOWED_ROLE=<role>
 *
 * Optional:
 *   MYTHIK_E2E_AUTH_DISPLAY_NAME_QUERY=<query returning "val">
 *   MYTHIK_E2E_AUTH_ROLES_QUERY=<query returning "val">
 *   MYTHIK_E2E_AUTH_SCOPE_QUERY=<query returning "val">
 *   MYTHIK_E2E_AUTH_SAMPLE_TABLE=<table>
 *   MYTHIK_E2E_AUTH_SAMPLE_ID_COLUMN=id
 *   MYTHIK_E2E_AUTH_PORT=3099
 *
 * Run:
 *   npx tsx packages/server/tests/e2e-auth-real-sqlserver.ts
 */

import { createServer } from '../src/index.js';
import type { AuthConfig } from '../src/auth/types.js';
import type { ApiSpec } from '../src/types.js';

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readEnv(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

function assertSafeIdentifier(value: string, label: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`${label} must be a simple SQL identifier. Got: ${value}`);
  }
  return value;
}

function optionalQuery(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value : undefined;
}

function createManualAuthConfig(): AuthConfig {
  const allowedRole = readRequiredEnv('MYTHIK_E2E_AUTH_ALLOWED_ROLE');

  return {
    strategy: 'jwt',
    jwt: {
      secret: readRequiredEnv('MYTHIK_E2E_AUTH_JWT_SECRET'),
      issuer: readEnv('MYTHIK_E2E_AUTH_JWT_ISSUER', 'mythik-manual-e2e'),
      expiresIn: Number(readEnv('MYTHIK_E2E_AUTH_TOKEN_MINUTES', '60')),
      refreshExpiresIn: Number(readEnv('MYTHIK_E2E_AUTH_REFRESH_MINUTES', '1440')),
      claims: {
        username: 'sub',
        name: 'name',
        roles: 'roles',
        scope: 'scope',
      },
    },
    provider: {
      usersTable: assertSafeIdentifier(readRequiredEnv('MYTHIK_E2E_AUTH_USERS_TABLE'), 'MYTHIK_E2E_AUTH_USERS_TABLE'),
      usernameColumn: assertSafeIdentifier(
        readRequiredEnv('MYTHIK_E2E_AUTH_USERNAME_COLUMN'),
        'MYTHIK_E2E_AUTH_USERNAME_COLUMN',
      ),
      passwordColumn: assertSafeIdentifier(
        readRequiredEnv('MYTHIK_E2E_AUTH_PASSWORD_COLUMN'),
        'MYTHIK_E2E_AUTH_PASSWORD_COLUMN',
      ),
      passwordHash: readEnv('MYTHIK_E2E_AUTH_PASSWORD_HASH', 'bcrypt') as 'bcrypt' | 'argon2',
      activeCondition: process.env.MYTHIK_E2E_AUTH_ACTIVE_CONDITION,
      emailColumn: process.env.MYTHIK_E2E_AUTH_EMAIL_COLUMN,
      displayNameQuery: optionalQuery('MYTHIK_E2E_AUTH_DISPLAY_NAME_QUERY'),
      rolesQuery: optionalQuery('MYTHIK_E2E_AUTH_ROLES_QUERY'),
      scopeQuery: optionalQuery('MYTHIK_E2E_AUTH_SCOPE_QUERY'),
      defaultScopeQuery: optionalQuery('MYTHIK_E2E_AUTH_DEFAULT_SCOPE_QUERY'),
    },
    policies: {
      protected: { roles: [allowedRole] },
    },
  };
}

function createManualAuthSpec(): ApiSpec {
  const table = process.env.MYTHIK_E2E_AUTH_SAMPLE_TABLE;
  const idColumn = readEnv('MYTHIK_E2E_AUTH_SAMPLE_ID_COLUMN', 'id');

  const endpoints: ApiSpec['endpoints'] = {
    health: {
      path: '/api/health',
      policy: 'public',
      query: 'SELECT 1 as status',
    },
  };

  if (table) {
    const safeTable = assertSafeIdentifier(table, 'MYTHIK_E2E_AUTH_SAMPLE_TABLE');
    const safeIdColumn = assertSafeIdentifier(idColumn, 'MYTHIK_E2E_AUTH_SAMPLE_ID_COLUMN');
    endpoints.protectedSample = {
      path: '/api/protected-sample',
      policy: 'protected',
      query: `SELECT TOP 10 ${safeIdColumn} as id FROM ${safeTable}`,
    };
  }

  return {
    type: 'api',
    name: 'Manual SQL Server Auth E2E',
    connection: {
      server: readRequiredEnv('MYTHIK_E2E_SQLSERVER_HOST'),
      database: readRequiredEnv('MYTHIK_E2E_SQLSERVER_DATABASE'),
      user: readRequiredEnv('MYTHIK_E2E_SQLSERVER_USER'),
      password: readRequiredEnv('MYTHIK_E2E_SQLSERVER_PASSWORD'),
      trustServerCertificate: process.env.MYTHIK_E2E_SQLSERVER_TRUST_CERT !== 'false',
    },
    auth: createManualAuthConfig(),
    endpoints,
  };
}

const port = Number(process.env.MYTHIK_E2E_AUTH_PORT || '3099');
let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  PASS ${message}`);
    passed++;
  } else {
    console.error(`  FAIL ${message}`);
    failed++;
  }
}

async function fetchJson(path: string, options: RequestInit = {}): Promise<{ status: number; data: Record<string, unknown> }> {
  const res = await fetch(`http://localhost:${port}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers as Record<string, string> },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data: data as Record<string, unknown> };
}

async function main(): Promise<void> {
  if (process.env.MYTHIK_E2E_SQLSERVER_AUTH !== '1') {
    console.log('Skipping manual SQL Server auth E2E. Set MYTHIK_E2E_SQLSERVER_AUTH=1 to run it.');
    return;
  }

  const spec = createManualAuthSpec();
  const server = createServer({ spec });

  await server.start(port);

  try {
    const loginUsername = readRequiredEnv('MYTHIK_E2E_AUTH_LOGIN_USERNAME');
    const loginPassword = readRequiredEnv('MYTHIK_E2E_AUTH_LOGIN_PASSWORD');

    console.log('\n--- Public endpoint ---');
    {
      const { status, data } = await fetchJson('/api/health');
      assert(status === 200, `Public health endpoint returns 200 (${status})`);
      assert(Array.isArray(data.data), 'Public health endpoint returns data array');
    }

    console.log('\n--- Login ---');
    let accessToken = '';
    let refreshToken = '';
    {
      const { status, data } = await fetchJson('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      assert(status === 200, `Login succeeds (${status})`);
      assert(typeof data.token === 'string' && data.token.length > 20, 'Login returns an access token');
      assert(typeof data.refreshToken === 'string', 'Login returns a refresh token');

      accessToken = data.token as string;
      refreshToken = data.refreshToken as string;
    }

    console.log('\n--- Refresh ---');
    {
      await new Promise(resolve => setTimeout(resolve, 1100));
      const { status, data } = await fetchJson('/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
      assert(status === 200, `Refresh succeeds (${status})`);
      assert(typeof data.token === 'string' && data.token !== accessToken, 'Refresh returns a new access token');
      assert(typeof data.refreshToken === 'string' && data.refreshToken !== refreshToken, 'Refresh rotates the refresh token');

      accessToken = data.token as string;
    }

    if (process.env.MYTHIK_E2E_AUTH_SAMPLE_TABLE) {
      console.log('\n--- Protected endpoint ---');
      {
        const { status } = await fetchJson('/api/protected-sample');
        assert(status === 401, `Protected endpoint rejects anonymous requests (${status})`);
      }
      {
        const { status, data } = await fetchJson('/api/protected-sample', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        assert(status === 200, `Protected endpoint accepts authenticated requests (${status})`);
        assert(Array.isArray(data.data), 'Protected endpoint returns data array');
      }
    }
  } finally {
    await server.stop();
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\nFatal error:', error);
  process.exit(1);
});
