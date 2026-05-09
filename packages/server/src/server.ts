import express from 'express';
import type { ApiSpec, MythikServer, MythikServerConfig, Handler, EndpointConfig, ParamConfig, UserContext } from './types.js';
import type { SqlDriver, SqlMutationResult, SqlStatement } from 'mythik/server';
import type { AuthConfig, ScopeFilterConfig, EndpointScopeOverride } from './auth/types.js';
import { validateApiSpec } from './validation/spec-validator.js';
import { createDatabaseDriver, resolveDatabaseDialect } from './connection.js';
import { buildCatalogQuery } from './catalog-builder.js';
import { parseParamValue, buildPaginatedQuery, buildEndpointCountQuery, buildTotalsQuery } from './query-engine.js';
import { filterFields, buildInsertQuery, buildUpdateQuery, buildDeleteQuery, buildSelectByPrimaryKeyQuery } from './crud-builder.js';
import { injectAuditFields } from './audit.js';
import { checkScreensTable, buildSpecServingRoutes, discoverAppSpecs, stripSensitiveFields } from './spec-serving.js';
import { createJwtStrategy } from './auth/jwt-strategy.js';
import { discoverHandlers, getHandlerRefs, validateHandlerRefs } from './handler-loader.js';
import { createErrorHandler } from './middleware/error-handler.js';
import { createCors } from './middleware/cors.js';
import { createAuthMiddleware } from './auth/middleware.js';
import { createDbAuthProvider } from './auth/db-auth-provider.js';
import { buildScopeWhereClause, wrapQueryWithScopeFilter, resolveActiveScope, validateScopeForInsert } from './auth/scope-filter.js';
import { resolveEnvVars } from './spec-loader.js';
import path from 'path';
import fs from 'fs';
import type { Server } from 'http';

async function resolveSpec(config: MythikServerConfig): Promise<ApiSpec> {
  const { spec } = config;

  // Mode 1: ApiSpec object
  if (typeof spec === 'object' && 'type' in spec && spec.type === 'api') {
    return spec as ApiSpec;
  }

  // Mode 2: File path string
  if (typeof spec === 'string') {
    const raw = fs.readFileSync(path.resolve(spec), 'utf-8');
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`Failed to parse spec file "${spec}" — invalid JSON`);
    }
    return parsed as ApiSpec;
  }

  // Mode 3: Store + ID
  if (typeof spec === 'object' && 'store' in spec && 'id' in spec) {
    const loaded = await spec.store.load(spec.id);
    return loaded as ApiSpec;
  }

  throw new Error('Invalid spec config: must be a file path (string), ApiSpec object, or { store, id }');
}

export function createServer(config: MythikServerConfig): MythikServer {
  const app = express();
  let db: SqlDriver | null = null;
  let httpServer: Server | null = null;

  async function start(port?: number): Promise<void> {
    // 1. Load and validate spec
    const spec = await resolveSpec(config);
    const validation = validateApiSpec(spec);
    if (!validation.valid) {
      throw new Error(`Invalid API spec:\n${validation.errors.map(e => `  - ${e}`).join('\n')}`);
    }

    // 2. Resolve env vars and connect to DB
    const databaseConfig = resolveEnvVars(config.database as unknown as Record<string, unknown>) as unknown as MythikServerConfig['database'];
    const dbDriver = createDatabaseDriver(databaseConfig, spec.dialect);
    await dbDriver.connect();
    db = dbDriver;

    const specDir = typeof config.spec === 'string' ? path.dirname(path.resolve(config.spec)) : process.cwd();

    // 3. Discover handlers
    const handlersDir = path.resolve(specDir, config.handlersDir ?? './handlers');
    const handlers = await discoverHandlers(handlersDir);

    // Validate handler references
    const handlerRefs = getHandlerRefs(spec);
    const handlerErrors = validateHandlerRefs(handlerRefs, handlers);
    if (handlerErrors.length > 0) {
      throw new Error(`Handler errors:\n${handlerErrors.map(e => `  - ${e}`).join('\n')}`);
    }

    // 4. Setup middleware
    app.use(createCors(config.cors !== false));
    app.use(express.json());

    const serverPort = port ?? config.port ?? 3010;
    const devMode = process.env.NODE_ENV !== 'production';

    // 4b. Auth setup — merge spec auth (declarative) with config auth (secrets)
    const jwtConfig = config.auth?.jwt
      ? resolveEnvVars(config.auth.jwt)
      : null;
    const fullAuthConfig: AuthConfig | null = spec.auth && jwtConfig
      ? { ...spec.auth, strategy: 'jwt' as const, jwt: { ...jwtConfig, claims: spec.auth.claims } }
      : null;
    const authMiddleware = fullAuthConfig ? createAuthMiddleware(fullAuthConfig) : null;
    const defaultPolicy = fullAuthConfig ? undefined : 'public'; // no auth config = all public

    // 4c. Built-in login provider (when auth.provider is configured)
    if (spec.auth?.provider && jwtConfig) {
      const jwtWithClaims = { ...jwtConfig, claims: spec.auth.claims };
      const dbProvider = createDbAuthProvider(spec.auth.provider, jwtWithClaims, dbDriver);

      app.post('/api/auth/login', async (req, res, next) => {
        try {
          const { username, password } = req.body;
          if (!username || !password) {
            res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: 'username and password are required' } });
            return;
          }
          const result = await dbProvider.login(username, password);
          res.json(result);
        } catch (err) {
          next(err);
        }
      });

      app.post('/api/auth/refresh', async (req, res, next) => {
        try {
          const { refreshToken } = req.body;
          if (!refreshToken) {
            res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: 'refreshToken is required' } });
            return;
          }
          const result = await dbProvider.refresh(refreshToken);
          res.json(result);
        } catch (err) {
          next(err);
        }
      });
    }

    // 5. Catalog routes
    if (spec.catalogs) {
      const catalogPolicy = fullAuthConfig?.catalogsPolicy === 'public' ? 'public' : defaultPolicy;
      for (const [name, catalogConfig] of Object.entries(spec.catalogs)) {
        const routeHandlers: express.RequestHandler[] = [];
        if (authMiddleware && catalogPolicy !== 'public') {
          routeHandlers.push(authMiddleware(catalogPolicy));
        }
        routeHandlers.push(async (_req, res, next) => {
          try {
            if (catalogConfig.static) {
              res.json(catalogConfig.static);
              return;
            }

            const catalogSql = buildCatalogQuery(db!, catalogConfig);
            if (!catalogSql) {
              res.json([]);
              return;
            }

            const result = await db!.query(catalogSql);
            res.json(result);
          } catch (err) {
            next(err);
          }
        });
        app.get(`/api/catalogs/${name}`, ...routeHandlers);
      }
    }

    // 6. Spec serving
    const specServingConfig = config.specServing;
    if (specServingConfig !== false) {
      const tableName = typeof specServingConfig === 'object' ? specServingConfig.table : 'screens';
      const tableExists = await checkScreensTable(db, tableName);

      if (tableExists) {
        const serving = buildSpecServingRoutes(db, tableName);

        // Auto-detect public screens: AppSpecs are always public (needed for bootstrap),
        // and each AppSpec's loginScreen is also public (must load before auth).
        // All other screens require authentication.
        const publicScreenIds = new Set<string>();
        if (fullAuthConfig) {
          const appSpecs = await discoverAppSpecs(db, tableName);
          for (const { id, loginScreen } of appSpecs) {
            publicScreenIds.add(id);
            if (loginScreen) publicScreenIds.add(loginScreen);
          }
        }

        // JWT strategy for optional token validation on AppSpec requests
        const appSpecJwt = fullAuthConfig ? createJwtStrategy(fullAuthConfig.jwt) : null;

        // /api/app/:id — returns full AppSpec with valid Bearer, filtered without
        app.get('/api/app/:id', async (req, res, next) => {
          try {
            const appSpecData = await serving.loadApp(req.params.id);
            if (!appSpecData) {
              res.status(404).json({ error: { code: 'NOT_FOUND', message: `App "${req.params.id}" not found` } });
              return;
            }

            // If auth is configured, check for valid Bearer token
            if (appSpecJwt) {
              const token = appSpecJwt.extractToken(req);
              if (token) {
                try {
                  await appSpecJwt.validateToken(token);
                  // Valid token — return full AppSpec
                  res.json(appSpecData);
                  return;
                } catch {
                  // Invalid token — fall through to filtered response
                }
              }
              // No token or invalid token — return filtered AppSpec
              res.json(stripSensitiveFields(appSpecData as Record<string, unknown>));
              return;
            }

            // No auth configured — return full AppSpec
            res.json(appSpecData);
          } catch (err) { next(err); }
        });

        // /api/screens/:id — public for loginScreens, authenticated for everything else
        if (authMiddleware && fullAuthConfig) {
          app.get('/api/screens/:id', async (req, res, next) => {
            if (publicScreenIds.has(req.params.id)) {
              return next(); // public — skip auth
            }
            // Apply auth middleware
            authMiddleware(defaultPolicy)(req, res, next);
          }, async (req, res, next) => {
            try {
              const screenSpec = await serving.loadScreen(req.params.id);
              if (!screenSpec) {
                res.status(404).json({ error: { code: 'NOT_FOUND', message: `Screen "${req.params.id}" not found` } });
                return;
              }
              res.json(screenSpec);
            } catch (err) { next(err); }
          });
        } else {
          app.get('/api/screens/:id', async (req, res, next) => {
            try {
              const screenSpec = await serving.loadScreen(req.params.id);
              if (!screenSpec) {
                res.status(404).json({ error: { code: 'NOT_FOUND', message: `Screen "${req.params.id}" not found` } });
                return;
              }
              res.json(screenSpec);
            } catch (err) { next(err); }
          });
        }
      }
    }

    // 7. Endpoint routes
    if (spec.endpoints) {
      for (const [, endpointConfig] of Object.entries(spec.endpoints)) {
        registerEndpoint(app, db, endpointConfig, handlers, authMiddleware, defaultPolicy, fullAuthConfig ?? undefined);
      }
    }

    // 8. Error handler (must be last)
    app.use(createErrorHandler(devMode));

    // 9. Start listening
    await new Promise<void>((resolve) => {
      httpServer = app.listen(serverPort, () => {
        printStartupInfo(spec, config, serverPort, handlers, specServingConfig !== false);
        resolve();
      });
    });
  }

  async function stop(): Promise<void> {
    if (httpServer) {
      await new Promise<void>((resolve) => httpServer!.close(() => resolve()));
      httpServer = null;
    }
    if (db) {
      await db.close();
      db = null;
    }
  }

  function getApp() {
    return app;
  }

  return { start, stop, getApp };
}

// --- Scope filter helpers ---

function resolveScopeConfig(
  endpoint: EndpointConfig,
  authConfig: AuthConfig | undefined,
): ScopeFilterConfig | null {
  if (!authConfig?.scopeFilter) return null;
  const sf = endpoint.scopeFilter;
  if (sf === false || sf === undefined) return null;
  if (sf === true) return authConfig.scopeFilter;
  if (typeof sf === 'object' && 'column' in sf) {
    return { ...authConfig.scopeFilter, column: (sf as EndpointScopeOverride).column };
  }
  return null;
}

function getUserFromReq(req: express.Request): UserContext | null {
  return (req as unknown as Record<string, unknown>).user as UserContext | null;
}

function resolveScopeClauseForRequest(
  req: express.Request,
  res: express.Response,
  scopeFilterConfig: ScopeFilterConfig,
  db: SqlDriver,
): ReturnType<typeof buildScopeWhereClause> | undefined {
  const user = getUserFromReq(req);
  if (!user) return null;

  // Handle "select" mode — validate active scope
  let activeScope: unknown = undefined;
  if (scopeFilterConfig.mode === 'select') {
    const headerVal = req.headers[scopeFilterConfig.header!.toLowerCase()] as string | undefined;
    activeScope = resolveActiveScope(headerVal, scopeFilterConfig.type);
    if (activeScope === null) {
      res.status(400).json({ error: { code: 'SCOPE_REQUIRED', message: 'Active scope header is required' } });
      return undefined; // signal to caller to stop
    }
    const bypassRoles = scopeFilterConfig.bypassRoles ?? [];
    if (!user.scope.includes(activeScope) && !bypassRoles.some(r => user.roles.includes(r))) {
      res.status(403).json({ error: { code: 'SCOPE_VIOLATION', message: 'Active scope not in allowed values' } });
      return undefined;
    }
  }

  return buildScopeWhereClause(scopeFilterConfig, user.scope, activeScope, user.roles, { driver: db });
}

// --- Endpoint registration ---

function registerEndpoint(
  app: express.Express,
  db: SqlDriver,
  endpoint: EndpointConfig,
  handlers: Map<string, Handler>,
  authMiddleware: ((policy?: string) => express.RequestHandler) | null,
  defaultPolicy: string | undefined,
  authConfig: AuthConfig | undefined,
): void {
  const method = (endpoint.method ?? 'GET').toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch';
  const params = endpoint.params ?? {};
  const policy = endpoint.policy ?? defaultPolicy;
  const scopeFilterConfig = resolveScopeConfig(endpoint, authConfig);

  // Auth middleware for this endpoint
  const authHandler: express.RequestHandler | null =
    authMiddleware && policy !== 'public' ? authMiddleware(policy) : null;

  // Query-based endpoint
  if (endpoint.query) {
    const routeHandlers: express.RequestHandler[] = [];
    if (authHandler) routeHandlers.push(authHandler);
    routeHandlers.push(async (req, res, next) => {
      try {
        const paramValues = extractParamValues(req, params);
        validateRequiredParams(params, paramValues);

        const hasPagination = endpoint.pagination === 'offset';
        const page = hasPagination ? (parseParamValue(req.query.page as string, 'int') as number ?? 0) : 0;
        const pageSize = hasPagination
          ? (parseParamValue(req.query.pageSize as string, 'int', params.pageSize?.max) as number ?? (params.pageSize?.default as number) ?? 20)
          : 0;

        const scopeClause = scopeFilterConfig ? resolveScopeClauseForRequest(req, res, scopeFilterConfig, db) : null;
        if (scopeClause === undefined) return; // response already sent (error)
        const queryParams = scopeClause ? { ...paramValues, ...scopeClause.params } : paramValues;

        // Build parallel queries
        const queries: Promise<Record<string, unknown>[]>[] = [];

        // Data query
        let dataQuery = endpoint.query!;
        if (scopeClause) {
          dataQuery = wrapQueryWithScopeFilter(dataQuery, scopeClause);
        }
        if (hasPagination) {
          dataQuery = buildPaginatedQuery(dataQuery, {
            driver: db,
            limit: pageSize,
            offset: page * pageSize,
          });
        }

        queries.push(db.query(dataQuery, queryParams));

        // Count query (if pagination)
        if (hasPagination) {
          const countSql = buildEndpointCountQuery(endpoint.query!, {
            driver: db,
            customCount: endpoint.count,
            ...(scopeClause ? { scopeClause } : {}),
          });

          queries.push(db.query(countSql, queryParams));
        }

        // Totals query
        if (endpoint.totals) {
          let totalsSql = typeof endpoint.totals === 'string'
            ? endpoint.totals
            : buildTotalsQuery(endpoint.query!, endpoint.totals, { driver: db });

          if (totalsSql && scopeClause) {
            totalsSql = wrapQueryWithScopeFilter(totalsSql, scopeClause);
          }

          if (totalsSql) {
            queries.push(db.query(totalsSql, queryParams));
          }
        }

        const results = await Promise.all(queries);
        const dataResult = results[0];

        const response: Record<string, unknown> = { data: dataResult };

        if (hasPagination && results[1]) {
          const countResult = results[1];
          response.total = countResult[0]?._total ?? countResult[0]?.total ?? 0;
          response.page = page;
          response.pageSize = pageSize;
        }

        if (endpoint.totals && results[hasPagination ? 2 : 1]) {
          const totalsResult = results[hasPagination ? 2 : 1];
          response.totals = totalsResult[0] ?? {};
        }

        res.json(response);
      } catch (err) { next(err); }
    });
    app[method](endpoint.path, ...routeHandlers);
  }

  // Handler-based endpoint
  if (endpoint.handler) {
    const handler = handlers.get(endpoint.handler)!;
    const routeHandlers: express.RequestHandler[] = [];
    if (authHandler) routeHandlers.push(authHandler);
    routeHandlers.push(async (req, res, next) => {
      try {
        const paramValues = extractParamValues(req, params);
        validateRequiredParams(params, paramValues);

        const result = await handler({
          params: paramValues,
          db,
          user: getUserFromReq(req) ?? null,
          query: req.query as Record<string, string>,
          body: req.body,
        });

        // Check if result is an explicit error
        if (result && typeof result === 'object' && 'status' in result && 'error' in result) {
          const errResult = result as { status: number; error: { code: string; message: string } };
          res.status(errResult.status).json({ error: errResult.error });
          return;
        }

        res.json(result);
      } catch (err) { next(err); }
    });
    app[method](endpoint.path, ...routeHandlers);
  }

  // CRUD endpoints
  if (endpoint.crud) {
    const crud = endpoint.crud;

    // POST — create
    const postHandlers: express.RequestHandler[] = [];
    if (authHandler) postHandlers.push(authHandler);
    postHandlers.push(async (req, res, next) => {
      try {
        // Scope filter: validate insert
        if (scopeFilterConfig) {
          const user = getUserFromReq(req);
          if (user && !validateScopeForInsert(scopeFilterConfig, req.body as Record<string, unknown>, user.scope, user.roles)) {
            res.status(403).json({ error: { code: 'SCOPE_INSERT_VIOLATION', message: 'Cannot create record outside your scope' } });
            return;
          }
        }

        const fields = filterFields(req.body as Record<string, unknown>, crud.insertable);
        if (endpoint.audit) {
          const user = getUserFromReq(req);
          injectAuditFields(fields, endpoint.audit, user?.username ?? null, 'insert');
        }
        if (Object.keys(fields).length === 0) {
          res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: 'No valid fields in request body' } });
          return;
        }
        const { sql: insertSql, params: insertParams } = buildInsertQuery(db, crud.table, fields);
        const result = await db.exec(insertSql, insertParams);
        const pkValue = primaryKeyValueForInsert(crud.primaryKey, fields, result);
        const created = result.rows[0]
          ?? (db.capabilities.returning === false && pkValue !== undefined
            ? await loadCrudRecord(db, crud, pkValue)
            : undefined);
        res.status(201).json(created ?? responseFallback(crud.primaryKey, pkValue, fields));
      } catch (err) { next(err); }
    });
    app.post(endpoint.path, ...postHandlers);

    // PUT — update
    const putHandlers: express.RequestHandler[] = [];
    if (authHandler) putHandlers.push(authHandler);
    putHandlers.push(async (req, res, next) => {
      try {
        const fields = filterFields(req.body as Record<string, unknown>, crud.updatable);
        if (endpoint.audit) {
          const user = getUserFromReq(req);
          injectAuditFields(fields, endpoint.audit, user?.username ?? null, 'update');
        }
        if (Object.keys(fields).length === 0) {
          res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: 'No valid fields in request body' } });
          return;
        }
        let scopedWhere: SqlStatement | undefined;

        // Scope filter: restrict update to user's scope
        if (scopeFilterConfig) {
          const user = getUserFromReq(req);
          if (user) {
            let activeScope: unknown = undefined;
            if (scopeFilterConfig.mode === 'select') {
              activeScope = resolveActiveScope(
                req.headers[scopeFilterConfig.header!.toLowerCase()] as string | undefined,
                scopeFilterConfig.type,
              );
            }
            const scopeClause = buildScopeWhereClause(scopeFilterConfig, user.scope, activeScope, user.roles, {
              driver: db,
              qualifier: null,
            });
            if (scopeClause) scopedWhere = scopeClause;
          }
        }

        const { sql: updateSql, params: updateParams } = buildUpdateQuery(
          db,
          crud.table,
          crud.primaryKey,
          req.params.id,
          fields,
          scopedWhere,
        );
        const result = await db.exec(updateSql, updateParams);
        const updated = result.rows[0]
          ?? (db.capabilities.returning === false
            ? await loadCrudRecord(db, crud, req.params.id, scopedWhere)
            : undefined);
        if (!updated) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Record not found' } });
          return;
        }
        res.json(updated);
      } catch (err) { next(err); }
    });
    app.put(`${endpoint.path}/:id`, ...putHandlers);

    // DELETE
    const deleteHandlers: express.RequestHandler[] = [];
    if (authHandler) deleteHandlers.push(authHandler);
    deleteHandlers.push(async (req, res, next) => {
      try {
        let scopedWhere: SqlStatement | undefined;

        // Scope filter: restrict delete to user's scope
        if (scopeFilterConfig) {
          const user = getUserFromReq(req);
          if (user) {
            let activeScope: unknown = undefined;
            if (scopeFilterConfig.mode === 'select') {
              activeScope = resolveActiveScope(
                req.headers[scopeFilterConfig.header!.toLowerCase()] as string | undefined,
                scopeFilterConfig.type,
              );
            }
            const scopeClause = buildScopeWhereClause(scopeFilterConfig, user.scope, activeScope, user.roles, {
              driver: db,
              qualifier: null,
            });
            if (scopeClause) scopedWhere = scopeClause;
          }
        }

        const { sql: deleteSql, params: deleteParams } = buildDeleteQuery(
          db,
          crud.table,
          crud.primaryKey,
          req.params.id,
          scopedWhere,
        );
        const result = await db.exec(deleteSql, deleteParams);
        if (result.affectedRows === 0) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Record not found' } });
          return;
        }
        res.status(204).send();
      } catch (err) { next(err); }
    });
    app.delete(`${endpoint.path}/:id`, ...deleteHandlers);
  }
}

async function loadCrudRecord(
  db: SqlDriver,
  crud: { table: string; primaryKey: string },
  primaryKeyValue: unknown,
  extraWhere?: SqlStatement,
): Promise<Record<string, unknown> | undefined> {
  const { sql, params } = buildSelectByPrimaryKeyQuery(db, crud.table, crud.primaryKey, primaryKeyValue, extraWhere);
  const rows = await db.query(sql, params);
  return rows[0];
}

function primaryKeyValueForInsert(
  primaryKey: string,
  fields: Record<string, unknown>,
  result: SqlMutationResult,
): unknown {
  return Object.prototype.hasOwnProperty.call(fields, primaryKey)
    ? fields[primaryKey]
    : result.insertId;
}

function responseFallback(
  primaryKey: string,
  primaryKeyValue: unknown,
  fields: Record<string, unknown>,
): Record<string, unknown> {
  if (primaryKeyValue === undefined) return fields;
  return { [primaryKey]: primaryKeyValue, ...fields };
}

function extractParamValues(
  req: express.Request,
  params: Record<string, ParamConfig>,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const [name, config] of Object.entries(params)) {
    const source = config.source ?? autoDetectSource(name, req);
    let raw: string | undefined;

    if (source === 'path') {
      raw = req.params[name];
    } else if (source === 'body') {
      raw = req.body?.[name] !== undefined ? String(req.body[name]) : undefined;
    } else {
      raw = req.query[name] as string | undefined;
    }

    const parsed = parseParamValue(raw, config.type, config.max);
    values[name] = parsed ?? config.default ?? null;
  }
  return values;
}

function autoDetectSource(name: string, req: express.Request): 'query' | 'path' | 'body' {
  if (req.params[name] !== undefined) return 'path';
  if (req.method !== 'GET' && req.body?.[name] !== undefined) return 'body';
  return 'query';
}

function validateRequiredParams(params: Record<string, ParamConfig>, values: Record<string, unknown>): void {
  for (const [name, config] of Object.entries(params)) {
    if (config.required && (values[name] === null || values[name] === undefined)) {
      const err = new Error(`Required parameter "${name}" is missing`) as Error & { type: string; status: number };
      err.type = 'VALIDATION';
      err.status = 400;
      throw err;
    }
  }
}

function printStartupInfo(
  spec: ApiSpec,
  config: MythikServerConfig,
  port: number,
  handlers: Map<string, Handler>,
  specServingEnabled: boolean,
): void {
  console.log('\nMythik Server v0.2.0');
  const dialect = resolveDatabaseDialect(config.database, spec.dialect);
  const databaseName =
    'database' in config.database && config.database.database
      ? config.database.database
      : 'filename' in config.database && config.database.filename
        ? config.database.filename
        : 'connectionString' in config.database && config.database.connectionString
          ? config.database.connectionString
          : 'uri' in config.database && config.database.uri
            ? config.database.uri
            : '(configured)';
  console.log(`Connected to ${dialect} - ${databaseName}`);

  if (spec.auth) {
    console.log(`\nAuth: JWT${spec.auth.provider ? ' + built-in login' : ' (external)'}`);
    if (spec.auth.provider) {
      console.log('  POST /api/auth/login');
      console.log('  POST /api/auth/refresh');
    }
    if (spec.auth.policies) {
      console.log(`  Policies (${Object.keys(spec.auth.policies).length}): ${Object.keys(spec.auth.policies).join(', ')}`);
    }
    if (spec.auth.scopeFilter) {
      console.log(`  Scope filter: ${spec.auth.scopeFilter.mode ?? 'all'} on ${spec.auth.scopeFilter.column}`);
    }
  }

  if (spec.catalogs) {
    const catalogNames = Object.keys(spec.catalogs);
    console.log(`\nCatalogs (${catalogNames.length}):`);
    for (const name of catalogNames) {
      const config = spec.catalogs[name];
      const detail = config.static
        ? '(static)'
        : config.distinct
          ? `(distinct: ${config.distinct})`
          : `(${config.value} → ${config.label})`;
      console.log(`  GET /api/catalogs/${name} ${detail}`);
    }
  }

  if (spec.endpoints) {
    const endpointEntries = Object.entries(spec.endpoints);
    console.log(`\nEndpoints (${endpointEntries.length}):`);
    for (const [, ep] of endpointEntries) {
      const m = (ep.method ?? 'GET').toUpperCase();
      const details: string[] = [];
      if (ep.query) details.push('query');
      if (ep.pagination) details.push(`pagination: ${ep.pagination}`);
      if (ep.totals) details.push(`totals: ${Array.isArray(ep.totals) ? ep.totals.length : 'manual'}`);
      if (ep.handler) details.push(`handler: ${ep.handler}`);
      if (ep.crud) details.push('crud');
      if (ep.policy) details.push(`policy: ${ep.policy}`);
      if (ep.scopeFilter) details.push('scopeFilter');
      console.log(`  ${m.padEnd(6)} ${ep.path} (${details.join(', ')})`);
    }
  }

  if (specServingEnabled) {
    console.log('\nSpec serving:');
    console.log('  GET /api/screens/:id');
    console.log('  GET /api/app/:id');
  }

  if (handlers.size > 0) {
    console.log(`\nHandlers (${handlers.size}): ${Array.from(handlers.keys()).join(', ')}`);
  }

  console.log(`\nListening on http://localhost:${port}\n`);
}
