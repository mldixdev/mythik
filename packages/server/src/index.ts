export type {
  ApiSpec,
  ApiAuthConfig,
  ConnectionConfig,
  CatalogConfig,
  EndpointConfig,
  ParamConfig,
  CrudConfig,
  Handler,
  HandlerContext,
  HandlerResult,
  UserContext,
  MythikServer,
  MythikServerConfig,
} from './types.js';

// Auth
export type {
  AuthConfig,
  JwtConfig,
  ProviderConfig,
  PolicyConfig,
  ScopeFilterConfig,
  AuthStrategy,
  PasswordVerifier,
  LoginResponse,
  LoginResponseUser,
  ClaimsMapping,
  EndpointScopeOverride,
} from './auth/types.js';

export { createServer } from './server.js';
export { resolveEnvVars } from './spec-loader.js';
export { validateApiSpec } from './validation/spec-validator.js';
export { isValidIdentifier, assertValidIdentifier } from './validation/identifier-guard.js';

// Auth modules
export { createJwtStrategy } from './auth/jwt-strategy.js';
export { createAuthMiddleware } from './auth/middleware.js';
export { createDbAuthProvider } from './auth/db-auth-provider.js';
export { evaluatePolicy } from './auth/policy-evaluator.js';
export { buildScopeWhereClause, wrapQueryWithScopeFilter, validateScopeForInsert, resolveActiveScope } from './auth/scope-filter.js';
export { buildUserContext } from './auth/user-context.js';
export { createRefreshStore } from './auth/refresh-store.js';
export { getPasswordVerifier } from './auth/password-verifier.js';
