import type { ConnectionPool } from 'mssql';
import type { ProviderConfig, JwtConfig, LoginResponse, LoginResponseUser } from './types.js';
import { createJwtStrategy } from './jwt-strategy.js';
import { getPasswordVerifier } from './password-verifier.js';
import { createRefreshStore, type RefreshStore } from './refresh-store.js';

export interface DbAuthProvider {
  login(username: string, password: string): Promise<LoginResponse>;
  refresh(refreshToken: string): Promise<LoginResponse>;
  getRefreshStore(): RefreshStore;
}

/** Case-insensitive field lookup — SQL Server column casing varies by driver/config */
function getField(row: Record<string, unknown>, fieldName: string): unknown {
  if (fieldName in row) return row[fieldName];
  const lower = fieldName.toLowerCase();
  for (const key of Object.keys(row)) {
    if (key.toLowerCase() === lower) return row[key];
  }
  return undefined;
}

export function createDbAuthProvider(
  config: ProviderConfig,
  jwtConfig: JwtConfig,
  pool: ConnectionPool,
): DbAuthProvider {
  const jwtStrategy = createJwtStrategy(jwtConfig);
  const passwordVerifier = getPasswordVerifier(config.passwordHash);
  const refreshStore = createRefreshStore(jwtConfig.refreshExpiresIn ?? 10080);
  const expiresInSeconds = (jwtConfig.expiresIn ?? 60) * 60;
  const claimsMapping = jwtConfig.claims ?? {};

  async function queryList(sql: string, username: string): Promise<unknown[]> {
    const req = pool.request();
    req.input('username', username);
    const result = await req.query(sql);
    return result.recordset.map((r: Record<string, unknown>) => {
      const keys = Object.keys(r);
      return r.val ?? r[keys[0]];
    });
  }

  async function queryScalar(sql: string, username: string): Promise<unknown> {
    const req = pool.request();
    req.input('username', username);
    const result = await req.query(sql);
    if (!result.recordset[0]) return null;
    const row = result.recordset[0] as Record<string, unknown>;
    const keys = Object.keys(row);
    return row.val ?? row[keys[0]] ?? null;
  }

  async function lookupUser(username: string): Promise<Record<string, unknown> | null> {
    const req = pool.request();
    req.input('username', username);
    const condition = config.activeCondition ? ` AND ${config.activeCondition}` : '';
    const sql = `SELECT * FROM ${config.usersTable} WHERE ${config.usernameColumn} = @username${condition}`;
    const result = await req.query(sql);
    return result.recordset[0] ?? null;
  }

  async function buildUserInfo(username: string, userRow: Record<string, unknown>): Promise<LoginResponseUser> {
    const promises: Promise<unknown>[] = [
      queryList(config.rolesQuery, username),
      queryList(config.scopeQuery, username),
    ];
    if (config.displayNameQuery) promises.push(queryScalar(config.displayNameQuery, username));
    if (config.defaultScopeQuery) promises.push(queryScalar(config.defaultScopeQuery, username));

    const results = await Promise.all(promises);
    const roles = results[0] as string[];
    const scope = results[1] as unknown[];
    const displayName = config.displayNameQuery ? (results[2] as string | null) : null;
    const defaultScope = config.defaultScopeQuery
      ? (results[config.displayNameQuery ? 3 : 2] ?? null)
      : null;

    const email = config.emailColumn
      ? String(getField(userRow, config.emailColumn) ?? `${username}@local`)
      : `${username}@local`;

    return {
      id: username,
      email,
      name: displayName ?? username,
      role: roles[0] ?? 'user',
      roles,
      scope,
      defaultScope,
      metadata: {},
    };
  }

  async function login(username: string, password: string): Promise<LoginResponse> {
    const userRow = await lookupUser(username);
    if (!userRow) {
      throw Object.assign(new Error('Invalid credentials'), { status: 401, code: 'INVALID_CREDENTIALS' });
    }

    const hash = String(getField(userRow, config.passwordColumn));
    const valid = await passwordVerifier.verify(password, hash);
    if (!valid) {
      throw Object.assign(new Error('Invalid credentials'), { status: 401, code: 'INVALID_CREDENTIALS' });
    }

    const userInfo = await buildUserInfo(username, userRow);

    const jwtPayload: Record<string, unknown> = {};
    jwtPayload[claimsMapping.username ?? 'sub'] = username;
    if (claimsMapping.name) jwtPayload[claimsMapping.name] = userInfo.name;
    jwtPayload[claimsMapping.roles ?? 'roles'] = userInfo.roles;
    if (claimsMapping.scope) jwtPayload[claimsMapping.scope] = userInfo.scope;

    const token = jwtStrategy.generateToken(jwtPayload, jwtConfig.expiresIn ?? 60);
    const refreshToken = refreshStore.generateToken();
    refreshStore.store(username, refreshToken);

    return { token, refreshToken, expiresIn: expiresInSeconds, user: userInfo };
  }

  async function refresh(refreshToken: string): Promise<LoginResponse> {
    const username = refreshStore.getUsername(refreshToken);
    if (!username) {
      throw Object.assign(new Error('Invalid or expired refresh token'), { status: 401, code: 'INVALID_REFRESH_TOKEN' });
    }

    const userRow = await lookupUser(username);
    if (!userRow) {
      refreshStore.revoke(refreshToken);
      throw Object.assign(new Error('Invalid or expired refresh token'), { status: 401, code: 'INVALID_REFRESH_TOKEN' });
    }

    const userInfo = await buildUserInfo(username, userRow);

    const jwtPayload: Record<string, unknown> = {};
    jwtPayload[claimsMapping.username ?? 'sub'] = username;
    if (claimsMapping.name) jwtPayload[claimsMapping.name] = userInfo.name;
    jwtPayload[claimsMapping.roles ?? 'roles'] = userInfo.roles;
    if (claimsMapping.scope) jwtPayload[claimsMapping.scope] = userInfo.scope;

    const newToken = jwtStrategy.generateToken(jwtPayload, jwtConfig.expiresIn ?? 60);
    const newRefreshToken = refreshStore.generateToken();

    refreshStore.revoke(refreshToken);
    refreshStore.store(username, newRefreshToken);

    return { token: newToken, refreshToken: newRefreshToken, expiresIn: expiresInSeconds, user: userInfo };
  }

  function getRefreshStore(): RefreshStore {
    return refreshStore;
  }

  return { login, refresh, getRefreshStore };
}
