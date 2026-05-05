import type { StateStore } from '../state/store.js';

// ─── Auth User ───

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  /** Primary role — backward compat with existing canAccess/evaluatePermission */
  role: string;
  /** All roles — enables multi-role access checks */
  roles: string[];
  metadata?: Record<string, unknown>;
}

// ─── Auth Result ───

export interface AuthResult {
  token: string;
  refreshToken?: string;
  /** Token lifetime in seconds. Used for proactive refresh scheduling. */
  expiresIn?: number;
  /** Absolute expiry timestamp (ms since epoch). Preferred over expiresIn when provider knows exact expiry (e.g., JWT decode). Engine falls back to Date.now() + expiresIn * 1000 if absent. */
  expiresAt?: number;
  user: AuthUser;
}

// ─── Auth Events ───

export type AuthEvent =
  | { type: 'SIGNED_IN'; user: AuthUser }
  | { type: 'SIGNED_OUT' }
  | { type: 'TOKEN_REFRESHED'; token: string }
  | { type: 'SESSION_EXPIRED' }
  | { type: 'AUTH_ERROR'; error: string };

// ─── Auth Provider (adapter interface) ───

export interface AuthProvider {
  login(credentials: Record<string, unknown>): Promise<AuthResult>;
  logout(): Promise<void>;
  refresh(refreshToken: string): Promise<AuthResult>;
  getUser(token: string): Promise<AuthUser>;
  /** Optional: listen for external auth state changes (e.g., OAuth redirect completion) */
  onAuthStateChange?(callback: (event: AuthEvent) => void): () => void;
}

// ─── Auth Engine Config ───

export interface AuthEngineConfig {
  provider: AuthProvider;
  store: StateStore;
  config: {
    loginScreen: string;
    protectedScreens: string[];
    roleAccess: Record<string, string[]>;
    persistence: 'local' | 'session' | 'memory';
    tokenRefresh: boolean;
    /** Domains where auth headers (Bearer token) are auto-injected into fetch requests. Requests to non-listed domains go without auth headers. Prevents token leakage to third-party URLs. */
    authDomains: string[];
    sessionExpiredMessage?: string;
  };
}

// ─── Auth Engine Instance ───

export interface AuthEngine {
  /** Authenticate with credentials. Writes safe derived data to state. */
  login(credentials: Record<string, unknown>): Promise<void>;
  /** Clear session, tokens, state. Navigate to loginScreen. */
  logout(): Promise<void>;
  /** Manual refresh trigger. */
  refreshSession(): Promise<void>;
  /** Initialize engine: restore session, setup listeners. */
  mount(): Promise<void>;
  /** Cleanup: cancel timers, close channels, clear tokens. */
  destroy(): void;
  /** Get access token from closure (for framework fetch interceptor). */
  getAccessToken(): string | null;
  /** Check if currently authenticated. */
  isAuthenticated(): boolean;
  /** Get current auth config. */
  getConfig(): AuthEngineConfig['config'];
}

// ─── Mock Provider Config ───

export interface MockAuthProviderConfig {
  user: AuthUser;
  /** Simulate login failure. */
  shouldFail?: boolean;
  /** Simulate refresh failure. */
  shouldFailRefresh?: boolean;
  /** Error message on failure. */
  errorMessage?: string;
  /** Simulated delay in ms. */
  delay?: number;
  /** Token lifetime in seconds. Default: 3600. */
  expiresIn?: number;
}
