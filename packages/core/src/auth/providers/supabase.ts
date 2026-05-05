import type { AuthProvider, AuthResult, AuthUser, AuthEvent } from '../types.js';

/**
 * Supabase client interface — minimal surface needed by the auth provider.
 * Avoids importing the full @supabase/supabase-js package as a dependency.
 */
export interface SupabaseAuthClient {
  auth: {
    signInWithPassword(credentials: { email: string; password: string }): Promise<{
      data: { session: { access_token: string; refresh_token: string; expires_in: number } | null; user: { id: string; email?: string; user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> } | null };
      error: { message: string } | null;
    }>;
    signOut(): Promise<{ error: { message: string } | null }>;
    refreshSession(): Promise<{
      data: { session: { access_token: string; refresh_token: string; expires_in: number } | null; user: { id: string; email?: string; user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> } | null };
      error: { message: string } | null;
    }>;
    getUser(token: string): Promise<{
      data: { user: { id: string; email?: string; user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> } | null };
      error: { message: string } | null;
    }>;
    onAuthStateChange(callback: (event: string, session: unknown) => void): { data: { subscription: { unsubscribe: () => void } } };
  };
}

export interface SupabaseAuthProviderConfig {
  /** Default role when none specified in metadata. */
  defaultRole?: string;
  /** Key in app_metadata or user_metadata that holds role(s). Default: 'role'. */
  roleKey?: string;
  /** Key in app_metadata or user_metadata that holds roles array. Default: 'roles'. */
  rolesKey?: string;
}

function extractUser(
  supaUser: { id: string; email?: string; user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> },
  config: SupabaseAuthProviderConfig,
): AuthUser {
  const roleKey = config.roleKey ?? 'role';
  const rolesKey = config.rolesKey ?? 'roles';
  const defaultRole = config.defaultRole ?? 'user';

  const appMeta = supaUser.app_metadata ?? {};
  const userMeta = supaUser.user_metadata ?? {};

  // Extract roles: check app_metadata first, then user_metadata
  const rolesRaw = appMeta[rolesKey] ?? userMeta[rolesKey];
  const roles: string[] = Array.isArray(rolesRaw) ? rolesRaw : [];

  // Extract primary role
  const roleRaw = appMeta[roleKey] ?? userMeta[roleKey];
  const role = typeof roleRaw === 'string' ? roleRaw : (roles[0] ?? defaultRole);

  // Ensure role is in roles array
  if (roles.length === 0) roles.push(role);
  if (!roles.includes(role)) roles.unshift(role);

  return {
    id: supaUser.id,
    email: supaUser.email ?? '',
    name: (userMeta.name ?? userMeta.full_name) as string | undefined,
    avatar: (userMeta.avatar_url ?? userMeta.avatar) as string | undefined,
    role,
    roles,
    metadata: { ...userMeta },
  };
}

/**
 * Supabase Auth Provider — wraps @supabase/supabase-js auth methods.
 *
 * Usage:
 *   const supabase = createClient(url, key);
 *   const provider = createSupabaseAuthProvider(supabase);
 */
export function createSupabaseAuthProvider(
  client: SupabaseAuthClient,
  config: SupabaseAuthProviderConfig = {},
): AuthProvider {
  async function login(credentials: Record<string, unknown>): Promise<AuthResult> {
    const { data, error } = await client.auth.signInWithPassword({
      email: credentials.email as string,
      password: credentials.password as string,
    });

    if (error) throw new Error(error.message);
    if (!data.session || !data.user) throw new Error('Login failed: no session returned');

    return {
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
      user: extractUser(data.user, config),
    };
  }

  async function logout(): Promise<void> {
    const { error } = await client.auth.signOut();
    if (error) throw new Error(error.message);
  }

  async function refresh(_refreshToken: string): Promise<AuthResult> {
    // Supabase SDK manages refresh token internally
    const { data, error } = await client.auth.refreshSession();

    if (error) throw new Error(error.message);
    if (!data.session || !data.user) throw new Error('Refresh failed: no session returned');

    return {
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
      user: extractUser(data.user, config),
    };
  }

  async function getUser(token: string): Promise<AuthUser> {
    const { data, error } = await client.auth.getUser(token);
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('No user found');
    return extractUser(data.user, config);
  }

  function onAuthStateChange(callback: (event: AuthEvent) => void): () => void {
    const { data } = client.auth.onAuthStateChange((event, session) => {
      switch (event) {
        case 'SIGNED_IN':
          if (session && typeof session === 'object' && 'user' in session) {
            const user = extractUser((session as Record<string, unknown>).user as Parameters<typeof extractUser>[0], config);
            callback({ type: 'SIGNED_IN', user });
          }
          break;
        case 'SIGNED_OUT':
          callback({ type: 'SIGNED_OUT' });
          break;
        case 'TOKEN_REFRESHED':
          if (session && typeof session === 'object' && 'access_token' in session) {
            callback({ type: 'TOKEN_REFRESHED', token: (session as Record<string, unknown>).access_token as string });
          }
          break;
      }
    });
    return () => data.subscription.unsubscribe();
  }

  return { login, logout, refresh, getUser, onAuthStateChange };
}
