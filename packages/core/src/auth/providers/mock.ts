import type { AuthProvider, AuthResult, AuthUser, MockAuthProviderConfig } from '../types.js';

/**
 * Mock auth provider for testing. No network required.
 * Returns configurable user data, supports simulated delays and failures.
 */
export function createMockAuthProvider(config: MockAuthProviderConfig): AuthProvider {
  // Token counter scoped to this instance — no shared module state between tests
  let tokenCounter = 0;

  function generateToken(): string {
    return `mock-token-${++tokenCounter}-${Date.now()}`;
  }
  const { user, shouldFail, shouldFailRefresh, errorMessage, delay, expiresIn } = config;

  async function withDelay<T>(fn: () => T): Promise<T> {
    if (delay && delay > 0) {
      await new Promise((r) => setTimeout(r, delay));
    }
    return fn();
  }

  async function login(_credentials: Record<string, unknown>): Promise<AuthResult> {
    return withDelay(() => {
      if (shouldFail) {
        throw new Error(errorMessage ?? 'Mock login failed');
      }
      return {
        token: generateToken(),
        refreshToken: generateToken(),
        expiresIn: expiresIn ?? 3600,
        user: { ...user },
      };
    });
  }

  async function logout(): Promise<void> {
    return withDelay(() => undefined);
  }

  async function refresh(_refreshToken: string): Promise<AuthResult> {
    return withDelay(() => {
      if (shouldFailRefresh) {
        throw new Error(errorMessage ?? 'Mock refresh failed');
      }
      return {
        token: generateToken(),
        refreshToken: generateToken(),
        expiresIn: expiresIn ?? 3600,
        user: { ...user },
      };
    });
  }

  async function getUser(_token: string): Promise<AuthUser> {
    return withDelay(() => ({ ...user }));
  }

  return { login, logout, refresh, getUser };
}
