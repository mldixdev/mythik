import type { AuthProvider, AuthResult, AuthUser } from '../types.js';

export interface CustomJWTProviderConfig {
  /** POST endpoint for login. */
  loginUrl: string;
  /** POST endpoint for token refresh. Optional — if absent, refresh is unsupported. */
  refreshUrl?: string;
  /** POST/DELETE endpoint for logout. Optional — if absent, logout is client-side only. */
  logoutUrl?: string;
  /** Request body template. Use "$email" and "$password" as placeholders replaced at runtime. */
  loginBody?: Record<string, unknown>;
  /** Dot-notation path to access token in login/refresh response. Default: "token". */
  tokenPath?: string;
  /** Dot-notation path to refresh token in response. Default: "refreshToken". */
  refreshTokenPath?: string;
  /** Dot-notation path to user object in response. Default: "user". */
  userPath?: string;
  /** Path to primary role. Plain keys resolve inside userPath; dotted paths resolve from the full response. Default: "role". */
  rolePath?: string;
  /** Path to roles array. Plain keys resolve inside userPath; dotted paths resolve from the full response. Default: "roles". */
  rolesPath?: string;
  /** Dot-notation path to expiresIn (seconds) in response. Optional. */
  expiresInPath?: string;
  /** Default role when none found in response. Default: "user". */
  defaultRole?: string;
  /** Custom fetch function for testing. Defaults to globalThis.fetch. */
  fetcher?: typeof globalThis.fetch;
}

/** Navigate an object by dot-notation path. "data.user.email" → obj.data.user.email */
function getByDotPath(obj: unknown, path: string): unknown {
  const segments = path.split('.');
  let current: unknown = obj;
  for (const seg of segments) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[seg];
  }
  return current;
}

function getRolePathValue(data: unknown, user: Record<string, unknown>, path: string): unknown {
  return path.includes('.') ? getByDotPath(data, path) : getByDotPath(user, path);
}

function warnDefaultRoleFallback(defaultRole: string, rolePath: string, rolesPath: string): void {
  if (process.env.NODE_ENV === 'production') return;
  // eslint-disable-next-line no-console
  console.warn(
    `[Mythik Auth] Custom JWT provider could not find rolePath "${rolePath}" or rolesPath "${rolesPath}"; using defaultRole "${defaultRole}".`,
  );
}

/** Replace $email and $password placeholders in a body template with actual values. */
function resolveBodyTemplate(
  template: Record<string, unknown>,
  credentials: Record<string, unknown>,
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(template)) {
    if (typeof value === 'string' && value.startsWith('$')) {
      const credKey = value.slice(1); // "$email" → "email"
      resolved[key] = credentials[credKey];
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      resolved[key] = resolveBodyTemplate(value as Record<string, unknown>, credentials);
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}

function extractUser(data: unknown, config: CustomJWTProviderConfig): AuthUser {
  const userPath = config.userPath ?? 'user';
  const userObj = getByDotPath(data, userPath);
  if (!userObj || typeof userObj !== 'object') {
    throw new Error(`User not found at path "${userPath}"`);
  }

  const user = userObj as Record<string, unknown>;
  const defaultRole = config.defaultRole ?? 'user';

  // Extract roles. Plain paths are relative to userPath; dotted paths are full-response paths.
  const rolesPath = config.rolesPath ?? 'roles';
  const rolesRaw = getRolePathValue(data, user, rolesPath);
  const roles: string[] = Array.isArray(rolesRaw) ? rolesRaw : [];

  // Extract primary role. Plain paths are relative to userPath; dotted paths are full-response paths.
  const rolePath = config.rolePath ?? 'role';
  const roleRaw = getRolePathValue(data, user, rolePath);
  const role = typeof roleRaw === 'string' ? roleRaw : (roles[0] ?? defaultRole);

  if (typeof roleRaw !== 'string' && roles.length === 0) {
    warnDefaultRoleFallback(defaultRole, rolePath, rolesPath);
  }

  if (roles.length === 0) roles.push(role);
  if (!roles.includes(role)) roles.unshift(role);

  return {
    id: String(user.id ?? ''),
    email: String(user.email ?? ''),
    name: user.name as string | undefined,
    avatar: user.avatar as string | undefined,
    role,
    roles,
    metadata: user.metadata as Record<string, unknown> | undefined,
  };
}

/**
 * Custom JWT Provider — configurable endpoints and response mapping.
 *
 * Usage:
 *   const provider = createCustomJWTProvider({
 *     loginUrl: 'https://api.example.com/auth/login',
 *     refreshUrl: 'https://api.example.com/auth/refresh',
 *     tokenPath: 'data.access_token',
 *     userPath: 'data.user',
 *     rolePath: 'role', // relative to data.user; use 'data.user.role' for full-response paths
 *   });
 */
export function createCustomJWTProvider(config: CustomJWTProviderConfig): AuthProvider {
  const fetcher = config.fetcher ?? globalThis.fetch?.bind(globalThis);

  async function login(credentials: Record<string, unknown>): Promise<AuthResult> {
    const body = config.loginBody
      ? resolveBodyTemplate(config.loginBody, credentials)
      : credentials;

    const response = await fetcher(config.loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null) as Record<string, unknown> | null;
      const msg = (errorData?.error as Record<string, unknown>)?.message ?? errorData?.message ?? `Login failed: HTTP ${response.status}`;
      throw new Error(String(msg));
    }

    const data = await response.json();

    const tokenPath = config.tokenPath ?? 'token';
    const token = getByDotPath(data, tokenPath);
    if (!token || typeof token !== 'string') {
      throw new Error(`Token not found at path "${tokenPath}"`);
    }

    const refreshTokenPath = config.refreshTokenPath ?? 'refreshToken';
    const refreshToken = getByDotPath(data, refreshTokenPath) as string | undefined;

    const expiresIn = config.expiresInPath
      ? (getByDotPath(data, config.expiresInPath) as number | undefined)
      : undefined;

    return {
      token,
      refreshToken: typeof refreshToken === 'string' ? refreshToken : undefined,
      expiresIn: typeof expiresIn === 'number' ? expiresIn : undefined,
      user: extractUser(data, config),
    };
  }

  async function logout(): Promise<void> {
    if (!config.logoutUrl) return; // Client-side only logout

    const response = await fetcher(config.logoutUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Logout failed: HTTP ${response.status}`);
    }
  }

  async function refresh(refreshToken: string): Promise<AuthResult> {
    if (!config.refreshUrl) throw new Error('Refresh not supported: no refreshUrl configured');

    const response = await fetcher(config.refreshUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null) as Record<string, unknown> | null;
      const msg = (errorData?.error as Record<string, unknown>)?.message ?? errorData?.message ?? `Refresh failed: HTTP ${response.status}`;
      throw new Error(String(msg));
    }

    const data = await response.json();

    const tokenPath = config.tokenPath ?? 'token';
    const token = getByDotPath(data, tokenPath);
    if (!token || typeof token !== 'string') {
      throw new Error(`Token not found at path "${tokenPath}"`);
    }

    const newRefreshToken = getByDotPath(data, config.refreshTokenPath ?? 'refreshToken') as string | undefined;
    const expiresIn = config.expiresInPath
      ? (getByDotPath(data, config.expiresInPath) as number | undefined)
      : undefined;

    return {
      token,
      refreshToken: typeof newRefreshToken === 'string' ? newRefreshToken : undefined,
      expiresIn: typeof expiresIn === 'number' ? expiresIn : undefined,
      user: extractUser(data, config),
    };
  }

  async function getUser(_token: string): Promise<AuthUser> {
    // Custom JWT typically doesn't have a separate getUser endpoint
    // Decode from the token itself or return cached user
    throw new Error('getUser not supported by CustomJWTProvider — user data comes from login/refresh responses');
  }

  return { login, logout, refresh, getUser };
}
