# Mythik — API Spec Reference

> Read when generating API specs (`type: "api"`). Covers catalogs, endpoints, auth, and audit.

## ApiSpec (Server)

An ApiSpec defines a backend API declaratively — endpoints, catalogs, auth, audit. `type: "api"` identifies it. No connection strings or secrets in the spec (those go in `createServer` config).

```json
{
  "type": "api",
  "name": "My API",
  "dialect": "postgres",
  "auth": { },
  "catalogs": { },
  "endpoints": { }
}
```

### Database dialect

Set `dialect` on the ApiSpec when the server should compile generated CRUD, catalog, scope, and pagination SQL for a specific database. Supported values: `"sqlserver"`, `"postgres"`, `"mysql"`, `"sqlite"`. The database credentials stay in the host server config, not in the ApiSpec.

```ts
import { createServer } from 'mythik-server';

const server = createServer({
  spec: apiSpec,
  database: { type: 'postgres', connectionString: process.env.DATABASE_URL },
  auth: { jwt: { secret: process.env.JWT_SECRET! } },
});
```

SQLite is useful for local demos, tests, and lightweight deployments:

```ts
createServer({
  spec: { type: 'api', dialect: 'sqlite', endpoints: { /* ... */ } },
  database: { type: 'sqlite', filename: './mythik.db' },
});
```

SQL policy: write dialect-native SQL in `query`, `count`, provider queries, catalog `where`, and handlers. Mythik gives you named params (`@name`) and compiles them through the active driver; it does not translate a SQL Server query into PostgreSQL/MySQL/SQLite SQL at runtime. Generated CRUD/catalog/pagination/scope SQL is dialect-aware, but custom SQL remains owned by the ApiSpec author. MySQL generated upsert SQL uses the modern row-alias form and requires MySQL 8.0.19+; use SQLite/PostgreSQL/SQL Server or an explicit custom SQL path for older MySQL deployments.

### Catalogs

Dropdown data sources. Three types:

```json
"catalogs": {
  "years": { "from": "TableName", "distinct": "year", "orderBy": "year DESC" },
  "institutions": { "from": "Institution", "value": "id", "label": "name", "orderBy": "name" },
  "categories": { "from": "Categories", "value": "id", "label": "name", "extra": ["type"] },
  "months": { "static": [{ "label": "January", "value": "1" }, { "label": "February", "value": "2" }] }
}
```

| Type | Props | Description |
|------|-------|-------------|
| DB distinct | `from`, `distinct`, `orderBy` | Unique values from a column |
| DB value/label | `from`, `value`, `label`, `extra?`, `orderBy?`, `where?` | Maps columns to options |
| Static | `static` (array of `{label, value}`) | Hardcoded options |

### Endpoints

Four patterns:

**Query endpoint (read):**
```json
"item-list": {
  "path": "/api/items",
  "policy": "items",
  "scopeFilter": true,
  "query": "SELECT i.id, i.name, i.amount, c.name as category FROM Items i LEFT JOIN Categories c ON i.categoryId = c.id ORDER BY i.name",
  "pagination": "offset",
  "params": { "pageSize": { "type": "int", "default": 20, "max": 100 } },
  "totals": ["SUM:amount", "COUNT:*"]
}
```

**Handler endpoint (complex logic):**
```json
"advanced-report": {
  "path": "/api/report",
  "policy": "reports",
  "handler": "report-handler",
  "params": {
    "year": { "type": "int", "source": "query" },
    "search": { "type": "string", "source": "query" },
    "page": { "type": "int", "default": 0, "source": "query" },
    "pageSize": { "type": "int", "default": 20, "max": 100, "source": "query" }
  }
}
```

Handler context exposes the active SQL driver as `ctx.db`. Use it for custom logic instead of vendor-specific connection objects:

```ts
import type { Handler } from 'mythik-server';

export const handler: Handler = async (ctx) => {
  const rows = await ctx.db.query(
    'SELECT id, name FROM Customers WHERE status = @status ORDER BY name',
    { status: ctx.params.status ?? 'active' },
  );
  return { data: rows };
};
```

`ctx.db` supports `query`, `exec`, `transaction`, `quoteIdent`, `compileNamedParams`, `paginate`, `countQuery`, `totalsQuery`, and dialect-aware insert/update/delete/upsert builders. Do not use `ctx.sql`, `ctx.db.request()`, `pool.request()`, `SCOPE_IDENTITY()`, backtick-only quoting, or bracket-only quoting in portable handlers. If a handler is intentionally dialect-specific, keep that decision local to the handler and document the required `ApiSpec.dialect`.

**CRUD endpoint — one declaration, three routes:**

A single endpoint with `crud: { table, primaryKey, insertable, updatable }` generates three routes automatically:
- `POST <path>` — insert (body filtered to `insertable`)
- `PUT <path>/:id` — update (body filtered to `updatable`, `:id` matches `primaryKey`)
- `DELETE <path>/:id` — delete by primary key

Do NOT declare three endpoints. See `ai-context-runtime-semantics.md § 3.1` for the contract + anti-pattern warning.

```json
"items": {
  "path": "/api/items",
  "policy": "admin",
  "crud": {
    "table": "Items",
    "primaryKey": "id",
    "insertable": ["name", "amount", "categoryId"],
    "updatable": ["name", "amount"]
  },
  "audit": {
    "createdBy": "created_by", "createdAt": "created_at",
    "updatedBy": "updated_by", "updatedAt": "updated_at",
    "timezone": "America/El_Salvador"
  }
}
```

This ONE endpoint produces `POST /api/items`, `PUT /api/items/:id`, `DELETE /api/items/:id`. Fields outside `insertable`/`updatable` are silently filtered (security feature). Audit fields are injected server-side from JWT context — clients cannot forge them (see `ai-context-runtime-semantics.md § 3.1` CV4).

**Read-only list endpoint** stays separate (no `crud:{}`) — it uses a SQL query or handler:

```json
"items-list": {
  "path": "/api/items/query",
  "policy": "items",
  "scopeFilter": true,
  "query": "SELECT id, name, amount, categoryId FROM Items ORDER BY name",
  "pagination": "offset"
}
```

**Anti-pattern — do NOT declare 3 endpoints with `crud:{}` each:**

```json
// WRONG — each crud:{} synthesizes 3 routes; 3 endpoints → 9 routes, collisions
"item-create": { "path": "/api/items", "method": "POST", "crud": { } },
"item-update": { "path": "/api/items/:id", "method": "PUT", "crud": { } },
"item-delete": { "path": "/api/items/:id", "method": "DELETE", "crud": { } }
```

The `PUT` endpoint at `/api/items/:id` combined with the framework's auto-append produces `/api/items/:id/:id` (broken). Every CRUD endpoint also attempts to register the POST route at its `<path>` — collisions compound.

**Public endpoint (no auth):**
```json
"health": { "path": "/api/health", "policy": "public", "query": "SELECT 1 as status" }
```

**Endpoint properties:**

| Property | Type | Description |
|----------|------|-------------|
| `path` | string | URL path (supports `:id` params) |
| `method` | string | `GET` (default), `POST`, `PUT`, `DELETE` |
| `query` | string | SQL query (mutually exclusive with `handler`) |
| `handler` | string | Handler file name (mutually exclusive with `query`) |
| `crud` | object | `{ table, primaryKey, insertable, updatable }` |
| `pagination` | `"offset"` or `false` | Enable offset pagination |
| `count` | string | Optional custom `_total` query for offset pagination. Prefer generated counts. |
| `totals` | string[] | Aggregate expressions: `"SUM:column"`, `"COUNT:*"` |
| `params` | object | Parameter definitions (see below) |
| `policy` | string | Reference to `auth.policies` key, or `"public"` |
| `scopeFilter` | boolean/object | Enable row-level filtering |
| `audit` | object | Auto-inject user + timestamp fields |

**Param properties:** `type` (`int`/`string`/`float`/`date`/`boolean`), `required?`, `default?`, `max?`, `source?` (`query`/`path`/`body`).

`pagination: "offset"` is compatible with `scopeFilter`. For framework-generated counts, Mythik applies the scope filter to the query source before wrapping it in `COUNT(*)`, so `total` reflects the scoped tenant/role slice. Prefer generated counts. If custom `endpoint.count` is truly needed with `scopeFilter`, include `{{scopeWhere[:alias]}}` when the count has no `WHERE`, or `{{scopeAnd[:alias]}}` when it already has one. Mythik expands the macro to the correct scope predicate, or to an empty string for bypass roles. Other custom count SQL is left verbatim; use `:alias` for JOIN/subquery counts so the scope column is qualified.

```json
"count": "SELECT COUNT(*) as _total FROM Orders o WHERE o.status = @status {{scopeAnd:o}}"
```

**Audit properties:** `createdBy?`, `createdAt?`, `updatedBy?`, `updatedAt?` (column names), `timezone?` (IANA string). All optional. Values override client-sent (prevents spoofing). Without timezone → UTC.

### Auth

```json
"auth": {
  "strategy": "jwt",
  "claims": { "username": "sub", "roles": "roles", "scope": "institutions" },
  "provider": {
    "usersTable": "Users",
    "usernameColumn": "username",
    "passwordColumn": "password",
    "passwordHash": "bcrypt",
    "activeCondition": "active = 1",
    "rolesQuery": "SELECT role AS val FROM UserRoles WHERE username = @username",
    "scopeQuery": "SELECT institution_id AS val FROM UserInstitutions WHERE username = @username"
  },
  "policies": {
    "items": { "roles": ["ADMIN", "EDITOR"] },
    "reports": { "roles": ["ADMIN", "VIEWER"] },
    "admin": { "roles": ["ADMIN"] }
  },
  "scopeFilter": {
    "claim": "institutions",
    "type": "int",
    "column": "institution_id",
    "bypassRoles": ["ADMIN"]
  }
}
```

| Component | Purpose |
|-----------|---------|
| `claims` | Maps JWT claim names to your naming convention |
| `provider` | Database-backed login: user table, password hash, role/scope queries |
| `policies` | Named role lists referenced by endpoints via `policy` |
| `scopeFilter` | Row-level security: filter by JWT claim, bypass for admin roles |

`passwordHash`: `"bcrypt"` (default) or `"argon2"`. Provider queries use `@username` parameter. Scope queries return `val` column.

## API Rules

- ApiSpec is pure declarative — no connection strings, no secrets (those go in `createServer` config)
- `dialect` selects generated SQL behavior; credentials still live in host config
- Custom SQL is dialect-native and uses Mythik named params (`@name`); Mythik does not translate custom SQL between dialects
- Api-specs use `type: "api"` — never served to browser (404 on GET /api/screens/:id for type "api")
- `query` and `handler` are mutually exclusive — use query for simple SQL, handler for complex logic
- CRUD `insertable`/`updatable` define which fields can be written — fields not listed are rejected
- Audit values override client-sent values — prevents spoofing of created_by/updated_at
- `policy: "public"` skips auth — use for health checks and public endpoints only
- ScopeFilter `bypassRoles` lets admin roles see all data — other roles see only their scope
- Generated offset-pagination totals are scoped before aggregation when `scopeFilter` is enabled
- Provider queries use `@username` parameter and must return `val` column
- Param `source` defaults to auto-detect: path first, body for non-GET, query as fallback
