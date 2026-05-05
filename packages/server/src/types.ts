import type { ConnectionPool } from 'mssql';
import type { AuthConfig, JwtConfig, EndpointScopeOverride } from './auth/types.js';
import type { AuditConfig } from './audit.js';

// --- ApiSpec (pure declarative — safe to store in DB) ---

export interface ApiSpec {
  type: 'api';
  name?: string;
  auth?: ApiAuthConfig;
  catalogs?: Record<string, CatalogConfig>;
  endpoints?: Record<string, EndpointConfig>;
}

/** Auth config within the ApiSpec — no secrets, no jwt key */
export interface ApiAuthConfig {
  strategy?: 'jwt';
  claims?: Record<string, string>;
  provider?: import('./auth/types.js').ProviderConfig;
  policies?: Record<string, import('./auth/types.js').PolicyConfig>;
  scopeFilter?: import('./auth/types.js').ScopeFilterConfig;
  catalogsPolicy?: 'public';
}

// --- Server Config (infrastructure — never stored in DB) ---

export interface MythikServerConfig {
  /** Spec source: file path, ApiSpec object, or { store, id } for SpecStore */
  spec: string | ApiSpec | { store: import('mythik').SpecStore; id: string };
  /** Database connection */
  database: ConnectionConfig;
  /** Auth secrets (required if spec has auth) */
  auth?: { jwt: JwtConfig };
  /** Server port. Default: 3010 */
  port?: number;
  /** Enable CORS. Default: true */
  cors?: boolean;
  /** Directory for handler .ts files. Default: './handlers' */
  handlersDir?: string;
  /** Spec serving config. Default: true */
  specServing?: boolean | { table: string };
}

// --- Connection ---

export interface ConnectionConfig {
  server: string;
  database: string;
  user?: string;
  password?: string;
  port?: number;
  trustServerCertificate?: boolean;
}

// --- Catalogs ---

export interface CatalogConfig {
  from?: string;
  value?: string;
  label?: string;
  extra?: string[];
  distinct?: string;
  orderBy?: string;
  where?: string;
  static?: Array<{ label: string; value: string; [key: string]: unknown }>;
}

// --- Endpoints ---

export interface EndpointConfig {
  path: string;
  method?: string;
  params?: Record<string, ParamConfig>;
  query?: string;
  pagination?: 'offset' | false;
  totals?: string[] | string;
  count?: string;
  handler?: string;
  crud?: CrudConfig;
  audit?: AuditConfig;
  policy?: string;
  scopeFilter?: boolean | EndpointScopeOverride | false;
}

export interface ParamConfig {
  type: 'int' | 'string' | 'float' | 'date' | 'boolean';
  required?: boolean;
  default?: unknown;
  max?: number;
  source?: 'query' | 'path' | 'body';
}

export interface CrudConfig {
  table: string;
  primaryKey: string;
  insertable: string[];
  updatable: string[];
}

// --- Handlers ---

export interface SqlTypes {
  Int: unknown;
  Float: unknown;
  Bit: unknown;
  NVarChar: unknown;
  DateTime: unknown;
}

export interface HandlerContext {
  params: Record<string, unknown>;
  db: ConnectionPool;
  sql: SqlTypes;
  user: UserContext | null;
  query: Record<string, string>;
  body: unknown;
}

export interface UserContext {
  username: string;
  name: string | null;
  roles: string[];
  scope: unknown[];
  raw: Record<string, unknown>;
  [key: string]: unknown;
}

export type HandlerResult =
  | Record<string, unknown>
  | unknown[]
  | { status: number; error: { code: string; message: string } }
  | { data: unknown[]; total?: number };

export type Handler = (ctx: HandlerContext) => Promise<HandlerResult>;

// --- Server ---

export interface MythikServer {
  start(port?: number): Promise<void>;
  stop(): Promise<void>;
  getApp(): import('express').Express;
}
