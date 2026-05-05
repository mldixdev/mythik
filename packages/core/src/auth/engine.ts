import type { AuthEngineConfig, AuthEngine, AuthResult, AuthUser } from './types.js';
import { createRefreshEngine, type RefreshEngine } from './refresh-engine.js';
import { createLoginRateLimiter, type LoginRateLimiter } from './rate-limiter.js';
import { createAuthPersistence, type AuthPersistence } from './persistence.js';
import { createCrossTabSync, type CrossTabSync } from './cross-tab.js';

/**
 * Creates the AuthEngine — the core authentication manager.
 *
 * SECURITY: Tokens are stored exclusively in closure variables.
 * They NEVER touch the state store. Only safe derived data
 * (user info, isAuthenticated, loading, error) is written to state.
 *
 * Persistence: Only the refresh token + safe user data are persisted.
 * Access tokens are NEVER persisted — they live in closure only.
 * Plain JSON storage is intentional: browser-fingerprint encryption does NOT
 * protect against XSS (the only realistic attack on localStorage) because
 * the fingerprint is computable by any script on the page.
 */
export function createAuthEngine(config: AuthEngineConfig): AuthEngine {
  const { provider, store, config: authConfig } = config;

  // ─── Closure-based token storage (NEVER in state) ───
  let accessToken: string | null = null;
  let refreshToken: string | null = null;
  let destroyed = false;

  // ─── Rate limiter (brute-force protection) ───
  const rateLimiter: LoginRateLimiter = createLoginRateLimiter();

  // ─── Persistence (refresh token + safe user data only) ───
  const persistence: AuthPersistence = createAuthPersistence(authConfig.persistence);

  // ─── Cross-tab sync ───
  const crossTab: CrossTabSync = createCrossTabSync();

  // ─── Refresh engine (mutex + proactive scheduling) ───
  const refreshEngine: RefreshEngine = createRefreshEngine({
    doRefresh: async () => {
      if (!refreshToken) throw new Error('No refresh token available');
      const result = await provider.refresh(refreshToken);
      applyAuthResult(result);
      return result.token;
    },
  });

  // Listen for auth events from other tabs
  crossTab.onEvent((event) => {
    if (destroyed) return;
    if (event.type === 'SIGNED_OUT' || event.type === 'SESSION_EXPIRED') {
      // Another tab logged out — clear local session
      refreshEngine.cancelProactive();
      clearTokens();
      clearAuthState();
    } else if (event.type === 'TOKEN_REFRESHED') {
      // Another tab refreshed — restore from persistence to get new token
      const data = persistence.restore();
      if (data) {
        refreshToken = data.refreshToken;
      }
    }
  });

  // ─── State helpers ───

  function writeUserToState(user: AuthUser): void {
    store.set('/auth/user/id', user.id);
    store.set('/auth/user/email', user.email);
    store.set('/auth/user/name', user.name ?? null);
    store.set('/auth/user/avatar', user.avatar ?? null);
    store.set('/auth/user/role', user.role);
    store.set('/auth/user/roles', user.roles);
    store.set('/auth/user/metadata', user.metadata ?? null);
  }

  function clearUserFromState(): void {
    store.set('/auth/user/id', null);
    store.set('/auth/user/email', null);
    store.set('/auth/user/name', null);
    store.set('/auth/user/avatar', null);
    store.set('/auth/user/role', null);
    store.set('/auth/user/roles', null);
    store.set('/auth/user/metadata', null);
  }

  function clearAuthState(): void {
    store.set('/auth/isAuthenticated', false);
    clearUserFromState();
    store.set('/auth/loading', false);
    store.set('/auth/error', null);
  }

  function clearTokens(): void {
    accessToken = null;
    refreshToken = null;
  }

  /** Apply auth result to closure + state + persistence. Shared by login and refresh. */
  function applyAuthResult(result: AuthResult): void {
    accessToken = result.token;
    refreshToken = result.refreshToken ?? refreshToken;
    store.set('/auth/isAuthenticated', true);
    writeUserToState(result.user);

    // Persist refresh token + safe user data
    if (refreshToken) {
      persistence.save({ refreshToken, user: result.user });
    }

    // Schedule proactive refresh if enabled and expiry info available
    if (authConfig.tokenRefresh) {
      const lifetimeMs = result.expiresAt
        ? result.expiresAt - Date.now()
        : result.expiresIn
          ? result.expiresIn * 1000
          : null;

      if (lifetimeMs && lifetimeMs > 0) {
        refreshEngine.scheduleProactive(lifetimeMs);
      }
    }
  }

  /** Best-effort cleanup of credential values from the passed object. */
  function clearCredentials(credentials: Record<string, unknown>): void {
    for (const key of Object.keys(credentials)) {
      credentials[key] = undefined;
    }
  }

  // ─── Login ───

  async function login(credentials: Record<string, unknown>): Promise<void> {
    if (destroyed) throw new Error('AuthEngine has been destroyed');

    // Rate limit check (brute-force protection)
    rateLimiter.assertAllowed();

    // Clear previous error
    store.set('/auth/error', null);
    store.set('/auth/loading', true);

    try {
      const result = await provider.login(credentials);

      // Apply auth result (tokens to closure, user to state, persist, schedule refresh)
      applyAuthResult(result);

      store.set('/auth/loading', false);
      store.set('/auth/error', null);

      // Broadcast to other tabs
      crossTab.broadcast({ type: 'SIGNED_IN', user: result.user });

      // Best-effort credential cleanup
      clearCredentials(credentials);
    } catch (err) {
      // Clear tokens on failure
      clearTokens();
      store.set('/auth/isAuthenticated', false);
      store.set('/auth/loading', false);
      store.set('/auth/error', err instanceof Error ? err.message : 'Login failed');

      // Best-effort credential cleanup even on failure
      clearCredentials(credentials);
      throw err;
    }
  }

  // ─── Logout ───

  async function logout(): Promise<void> {
    refreshEngine.cancelProactive();

    try {
      await provider.logout();
    } catch {
      // Provider logout failure should not prevent client-side cleanup
    }

    clearTokens();
    clearAuthState();
    persistence.clear();
    crossTab.broadcast({ type: 'SIGNED_OUT' });
  }

  // ─── Refresh ───

  async function refreshSession(): Promise<void> {
    const newToken = await refreshEngine.requestRefresh();
    if (!newToken) {
      // Refresh failed — session is dead
      clearTokens();
      clearAuthState();
      persistence.clear();
      crossTab.broadcast({ type: 'SESSION_EXPIRED' });
      throw new Error('Session refresh failed');
    }
    // applyAuthResult already handles persistence + state via doRefresh callback
    crossTab.broadcast({ type: 'TOKEN_REFRESHED', token: '' }); // token value not broadcast for security
  }

  // ─── Mount ───

  async function mount(): Promise<void> {
    // Initialize auth state in store
    clearAuthState();

    // Restore session from persistence
    const persisted = persistence.restore();
    if (persisted && persisted.refreshToken) {
      refreshToken = persisted.refreshToken;

      // Don't set isAuthenticated or write user data until refresh confirms.
      // applyAuthResult (called by successful refresh) handles both.
      // This prevents the app from briefly entering authenticated state
      // and making requests with an invalid token when the server has restarted.
      try {
        await refreshSession();
      } catch {
        // Refresh failed — persisted session is dead
        clearTokens();
        clearAuthState();
        persistence.clear();
      }
    }
  }

  // ─── Destroy ───

  function destroy(): void {
    destroyed = true;
    refreshEngine.destroy();
    crossTab.destroy();
    clearTokens();
  }

  // ─── Accessors ───

  function getAccessToken(): string | null {
    return accessToken;
  }

  function isAuthenticatedFn(): boolean {
    return accessToken !== null;
  }

  function getConfig(): AuthEngineConfig['config'] {
    return authConfig;
  }

  return {
    login,
    logout,
    refreshSession,
    mount,
    destroy,
    getAccessToken,
    isAuthenticated: isAuthenticatedFn,
    getConfig,
  };
}
