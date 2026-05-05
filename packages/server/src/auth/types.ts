// --- Auth Strategy (extensible — only JWT implemented) ---

export interface AuthStrategy {
  extractToken(req: { headers: Record<string, string | string[] | undefined> }): string | null;
  validateToken(token: string): Promise<Record<string, unknown>>;
  generateToken(payload: Record<string, unknown>, expiresInMinutes: number): string;
}

// --- Password Verification ---

export interface PasswordVerifier {
  verify(password: string, hash: string): Promise<boolean>;
}

// --- JWT Config ---

export interface JwtConfig {
  secret: string;
  issuer?: string;
  audience?: string;
  expiresIn?: number;        // minutes, default 60
  refreshExpiresIn?: number; // minutes, default 10080 (7 days)
  claims?: ClaimsMapping;
}

export interface ClaimsMapping {
  username?: string;  // default: "sub"
  name?: string;
  roles?: string;     // default: "roles"
  scope?: string;
}

// --- Provider Config (built-in login) ---

export interface ProviderConfig {
  usersTable: string;
  usernameColumn: string;
  passwordColumn: string;
  passwordHash?: 'bcrypt' | 'argon2';  // default: "bcrypt"
  activeCondition?: string;
  emailColumn?: string;
  displayNameQuery?: string;
  rolesQuery: string;
  scopeQuery: string;
  defaultScopeQuery?: string;
}

// --- Policies ---

export interface PolicyConfig {
  roles: string[];
}

// --- Scope Filter ---

export interface ScopeFilterConfig {
  claim: string;
  type?: 'int' | 'string';     // default: "int"
  column: string;
  bypassRoles?: string[];       // default: []
  mode?: 'all' | 'select';     // default: "all"
  header?: string;              // required when mode = "select"
}

export interface EndpointScopeOverride {
  column: string;
}

// --- Full Auth Config ---

export interface AuthConfig {
  strategy: 'jwt';
  jwt: JwtConfig;
  provider?: ProviderConfig;
  policies?: Record<string, PolicyConfig>;
  scopeFilter?: ScopeFilterConfig;
  catalogsPolicy?: 'public';
}

// --- Login Response (matches CustomJWTProvider defaults) ---

export interface LoginResponseUser {
  id: string;
  email: string;
  name: string;
  role: string;
  roles: string[];
  scope: unknown[];
  defaultScope: unknown;
  metadata: Record<string, unknown>;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
  user: LoginResponseUser;
}
