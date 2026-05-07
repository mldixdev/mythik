import { isValidIdentifier } from './identifier-guard.js';
import type { ValidationError } from './spec-validator.js';

export interface ApiSpecValidationResult {
  valid: boolean;
  errors: string[];
  /**
   * Lint warnings with structured ValidationError shape (separate from `errors: string[]`
   * for backwards compat). Populated by lint rules with `ruleId` set. Each entry has
   * `suggestedFixes` (RFC 6902 patches) when auto-fixable.
   */
  lintWarnings?: ValidationError[];
}

const DANGEROUS_SQL_KEYWORDS = /\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|EXEC|EXECUTE|UNION|INTO)\b/i;
const SQL_COMMENTS = /(--|\/\*)/;
const SCOPE_COUNT_MACRO_PATTERN = /{{\s*scope(Where|And)(?::\s*([^}\s]+))?\s*}}/g;

function getScopeCountMacroAliases(sql: string): string[] {
  const aliases: string[] = [];
  SCOPE_COUNT_MACRO_PATTERN.lastIndex = 0;
  for (const match of sql.matchAll(SCOPE_COUNT_MACRO_PATTERN)) {
    if (match[2]) aliases.push(match[2]);
  }
  return aliases;
}

function hasScopeCountMacro(sql: string): boolean {
  SCOPE_COUNT_MACRO_PATTERN.lastIndex = 0;
  return SCOPE_COUNT_MACRO_PATTERN.test(sql);
}

function endpointHasActiveScopeFilter(
  endpoint: Record<string, unknown>,
  auth: Record<string, unknown> | undefined,
): boolean {
  return !!auth?.scopeFilter && endpoint.scopeFilter !== undefined && endpoint.scopeFilter !== false;
}

/**
 * Lint rule: spec-crud-id-collision — error when `endpoint.path` ends with `/:id`
 * AND the same node has `crud: {...}` present.
 *
 * CRUD operations auto-append `/:id` to PUT/DELETE routes. Declaring `path: '/api/x/:id'`
 * with `crud: {}` produces server-side URL `/api/x/:id/:id` → 404 silent.
 *
 * Walks the object-shaped `spec.endpoints: Record<string, EndpointConfig>`, emitting
 * to lintWarnings with ruleId 'spec-crud-id-collision' and JSON Pointer path
 * `/endpoints/<name>/path`.
 */
function validateCrudIdCollision(spec: Record<string, unknown>, lintWarnings: ValidationError[]): void {
  const endpoints = spec.endpoints;
  if (!endpoints || typeof endpoints !== 'object' || Array.isArray(endpoints)) return;
  for (const [name, ep] of Object.entries(endpoints as Record<string, unknown>)) {
    if (!ep || typeof ep !== 'object') continue;
    const epObj = ep as Record<string, unknown>;
    const path = epObj.path;
    const hasCrud = epObj.crud && typeof epObj.crud === 'object';
    if (typeof path === 'string' && hasCrud && /\/:id$/.test(path)) {
      const fixed = path.replace(/\/:id$/, '');
      lintWarnings.push({
        message: `endpoint.path "${path}" ends with /:id and has crud — server auto-appends /:id, producing /:id/:id`,
        path: `/endpoints/${name}/path`,
        ruleId: 'spec-crud-id-collision',
        suggestedFixes: [{
          patch: { op: 'replace', path: `/endpoints/${name}/path`, value: fixed },
          confidence: 'high',
          description: `Remove trailing /:id — CRUD auto-appends it for PUT/DELETE routes`,
        }],
      });
    }
  }
}

/**
 * Lint rule: spec-auth-domains-port — warn when an `auth.authDomains` entry contains `:port`.
 *
 * The auth matcher (packages/core/src/fetch/interceptors/auth.ts:matchesDomain) uses
 * hostname-only comparison — port is silently stripped from URL.hostname. Consumer
 * believes match works but does not, leading to apparent matches that fail at runtime.
 *
 * Detection: regex `^[^:]+:\d+$` matches `host:port` shape on the entry string.
 * Walks `spec.auth.authDomains: string[]`, emitting JSON Pointer paths `/auth/authDomains/<i>`.
 */
function validateAuthDomainsPort(spec: Record<string, unknown>, lintWarnings: ValidationError[]): void {
  const auth = spec.auth as Record<string, unknown> | undefined;
  if (!auth || typeof auth !== 'object') return;
  const domains = auth.authDomains;
  if (!Array.isArray(domains)) return;
  for (let i = 0; i < domains.length; i++) {
    const entry = domains[i];
    if (typeof entry !== 'string') continue;
    if (/^[^:]+:\d+$/.test(entry)) {
      const fixed = entry.replace(/:\d+$/, '');
      lintWarnings.push({
        message: `auth.authDomains[${i}] "${entry}" contains :port — matcher uses hostname-only comparison, port silently stripped`,
        path: `/auth/authDomains/${i}`,
        ruleId: 'spec-auth-domains-port',
        suggestedFixes: [{
          patch: { op: 'replace', path: `/auth/authDomains/${i}`, value: fixed },
          confidence: 'high',
          description: `Remove :port — matcher uses hostname-only comparison`,
        }],
      });
    }
  }
}

export function validateApiSpec(spec: unknown): ApiSpecValidationResult {
  if (!spec || typeof spec !== 'object') {
    return { valid: false, errors: ['spec must be an object'] };
  }
  const s = spec as Record<string, unknown>;
  const errors: string[] = [];

  // Catalogs
  const catalogs = s.catalogs as Record<string, Record<string, unknown>> | undefined;
  if (catalogs) {
    for (const [name, catalog] of Object.entries(catalogs)) {
      if (catalog.static) continue;

      if (catalog.from) {
        if (!isValidIdentifier(catalog.from as string)) {
          errors.push(`catalog "${name}": invalid SQL identifier "${catalog.from}" in "from"`);
        }

        if (!catalog.distinct) {
          if (!catalog.value) {
            errors.push(`catalog "${name}": "value" is required when "from" is present (without "distinct")`);
          }
          if (!catalog.label) {
            errors.push(`catalog "${name}": "label" is required when "from" is present (without "distinct")`);
          }
        }

        if (catalog.value && !isValidIdentifier(catalog.value as string)) {
          errors.push(`catalog "${name}": invalid SQL identifier "${catalog.value}" in "value"`);
        }
        if (catalog.label && !isValidIdentifier(catalog.label as string)) {
          errors.push(`catalog "${name}": invalid SQL identifier "${catalog.label}" in "label"`);
        }
        if (catalog.distinct && !isValidIdentifier(catalog.distinct as string)) {
          errors.push(`catalog "${name}": invalid SQL identifier "${catalog.distinct}" in "distinct"`);
        }
        if (catalog.extra) {
          for (const field of catalog.extra as string[]) {
            if (!isValidIdentifier(field)) {
              errors.push(`catalog "${name}": invalid SQL identifier "${field}" in "extra"`);
            }
          }
        }
        // where clause hardening — concatenated directly into SQL
        if (catalog.where) {
          const where = catalog.where as string;
          if (where.includes(';')) {
            errors.push(`catalog "${name}": "where" must not contain semicolons`);
          }
          if (SQL_COMMENTS.test(where)) {
            errors.push(`catalog "${name}": "where" must not contain SQL comment markers (-- or /*)`);
          }
          if (DANGEROUS_SQL_KEYWORDS.test(where)) {
            errors.push(`catalog "${name}": "where" contains dangerous SQL keywords`);
          }
        }

        // orderBy validation
        if (catalog.orderBy) {
          const orderBy = catalog.orderBy as string;
          if (orderBy.includes(';')) {
            errors.push(`catalog "${name}": "orderBy" must not contain semicolons`);
          }
          if (SQL_COMMENTS.test(orderBy)) {
            errors.push(`catalog "${name}": "orderBy" must not contain SQL comment markers (-- or /*)`);
          }
        }
      } else if (!catalog.static) {
        errors.push(`catalog "${name}": must have "from" (database table) or "static" (inline data)`);
      }
    }
  }

  // Endpoints
  const endpoints = s.endpoints as Record<string, Record<string, unknown>> | undefined;
  if (endpoints) {
    for (const [name, endpoint] of Object.entries(endpoints)) {
      const hasQuery = !!endpoint.query;
      const hasHandler = !!endpoint.handler;
      const hasCrud = !!endpoint.crud;

      const sources = [hasQuery, hasHandler, hasCrud].filter(Boolean).length;

      if (sources === 0) {
        errors.push(`endpoint "${name}": must have "query", "handler", or "crud"`);
      }
      if (hasQuery && hasHandler) {
        errors.push(`endpoint "${name}": "query" and "handler" are mutually exclusive`);
      }
      if (hasQuery && hasCrud) {
        errors.push(`endpoint "${name}": "query" and "crud" are mutually exclusive`);
      }

      if (endpoint.crud) {
        const crud = endpoint.crud as Record<string, unknown>;
        if (!isValidIdentifier(crud.table as string)) {
          errors.push(`endpoint "${name}": invalid SQL identifier "${crud.table}" in crud.table`);
        }
        if (!isValidIdentifier(crud.primaryKey as string)) {
          errors.push(`endpoint "${name}": invalid SQL identifier "${crud.primaryKey}" in crud.primaryKey`);
        }
        for (const field of (crud.insertable as string[]) ?? []) {
          if (!isValidIdentifier(field)) {
            errors.push(`endpoint "${name}": invalid SQL identifier "${field}" in crud.insertable`);
          }
        }
        for (const field of (crud.updatable as string[]) ?? []) {
          if (!isValidIdentifier(field)) {
            errors.push(`endpoint "${name}": invalid SQL identifier "${field}" in crud.updatable`);
          }
        }
      }

      if (endpoint.audit) {
        if (!endpoint.crud) {
          errors.push(`endpoint "${name}": "audit" requires "crud" to be configured`);
        }
        const audit = endpoint.audit as Record<string, unknown>;
        for (const key of ['createdBy', 'createdAt', 'updatedBy', 'updatedAt']) {
          const col = audit[key];
          if (col !== undefined) {
            if (typeof col !== 'string') {
              errors.push(`endpoint "${name}": audit.${key} must be a string (column name)`);
            } else if (!isValidIdentifier(col)) {
              errors.push(`endpoint "${name}": invalid SQL identifier "${col}" in audit.${key}`);
            }
          }
        }
        const tz = audit.timezone;
        if (tz !== undefined && typeof tz !== 'string') {
          errors.push(`endpoint "${name}": audit.timezone must be a string (IANA timezone)`);
        }
      }

      // Endpoint-level scopeFilter column override validation
      if (endpoint.scopeFilter && typeof endpoint.scopeFilter === 'object') {
        const sf = endpoint.scopeFilter as Record<string, unknown>;
        if (sf.column && !isValidIdentifier(sf.column as string)) {
          errors.push(`endpoint "${name}": invalid SQL identifier "${sf.column}" in scopeFilter.column`);
        }
      }

      if (typeof endpoint.count === 'string') {
        const usesScopeFilter = endpointHasActiveScopeFilter(endpoint, s.auth as Record<string, unknown> | undefined);
        const usesScopeMacro = hasScopeCountMacro(endpoint.count);

        if (usesScopeFilter && !usesScopeMacro) {
          errors.push(`endpoint "${name}": custom "count" with scopeFilter must include {{scopeWhere}} or {{scopeAnd}} so Mythik can expand scope and bypass-role behavior`);
        }
        if (!usesScopeFilter && usesScopeMacro) {
          errors.push(`endpoint "${name}": custom "count" uses a scope macro but scopeFilter is not enabled for this endpoint`);
        }
        for (const alias of getScopeCountMacroAliases(endpoint.count)) {
          if (!isValidIdentifier(alias)) {
            errors.push(`endpoint "${name}": invalid scope macro alias "${alias}" in custom "count"`);
          }
        }
      }
    }
  }

  // Auth
  const auth = s.auth as Record<string, unknown> | undefined;
  if (auth) {
    if (auth.strategy && auth.strategy !== 'jwt') {
      errors.push('auth.strategy must be "jwt"');
    }

    // Provider validation
    if (auth.provider) {
      const p = auth.provider as Record<string, unknown>;
      if (!p.usersTable) {
        errors.push('auth.provider.usersTable is required');
      } else if (!isValidIdentifier(p.usersTable as string)) {
        errors.push(`auth.provider: invalid SQL identifier "${p.usersTable}" in usersTable`);
      }
      if (!p.usernameColumn) {
        errors.push('auth.provider.usernameColumn is required');
      } else if (!isValidIdentifier(p.usernameColumn as string)) {
        errors.push(`auth.provider: invalid SQL identifier "${p.usernameColumn}" in usernameColumn`);
      }
      if (!p.passwordColumn) {
        errors.push('auth.provider.passwordColumn is required');
      } else if (!isValidIdentifier(p.passwordColumn as string)) {
        errors.push(`auth.provider: invalid SQL identifier "${p.passwordColumn}" in passwordColumn`);
      }

      // emailColumn validation (NEW hardening)
      if (p.emailColumn) {
        if (!isValidIdentifier(p.emailColumn as string)) {
          errors.push(`auth.provider: invalid SQL identifier "${p.emailColumn}" in emailColumn`);
        }
      }

      if (!p.rolesQuery) {
        errors.push('auth.provider.rolesQuery is required');
      } else {
        if (!(p.rolesQuery as string).includes('@username')) {
          errors.push('auth.provider.rolesQuery must contain @username parameter');
        }
        if ((p.rolesQuery as string).includes(';')) {
          errors.push('auth.provider.rolesQuery must not contain semicolons');
        }
      }
      if (!p.scopeQuery) {
        errors.push('auth.provider.scopeQuery is required');
      } else {
        if (!(p.scopeQuery as string).includes('@username')) {
          errors.push('auth.provider.scopeQuery must contain @username parameter');
        }
        if ((p.scopeQuery as string).includes(';')) {
          errors.push('auth.provider.scopeQuery must not contain semicolons');
        }
      }

      // activeCondition hardening (NEW)
      if (p.activeCondition) {
        const cond = p.activeCondition as string;
        if (cond.includes(';')) {
          errors.push('auth.provider.activeCondition must not contain semicolons');
        }
        if (SQL_COMMENTS.test(cond)) {
          errors.push('auth.provider.activeCondition must not contain SQL comment markers (-- or /*)');
        }
        if (DANGEROUS_SQL_KEYWORDS.test(cond)) {
          errors.push('auth.provider.activeCondition contains dangerous SQL keywords');
        }
      }

      // displayNameQuery validation (NEW)
      if (p.displayNameQuery) {
        const q = p.displayNameQuery as string;
        if (!q.includes('@username')) {
          errors.push('auth.provider.displayNameQuery must contain @username parameter');
        }
        if (q.includes(';')) {
          errors.push('auth.provider.displayNameQuery must not contain semicolons');
        }
      }

      // defaultScopeQuery validation (NEW)
      if (p.defaultScopeQuery) {
        const q = p.defaultScopeQuery as string;
        if (!q.includes('@username')) {
          errors.push('auth.provider.defaultScopeQuery must contain @username parameter');
        }
        if (q.includes(';')) {
          errors.push('auth.provider.defaultScopeQuery must not contain semicolons');
        }
      }
    }

    // Policies validation
    if (auth.policies) {
      for (const [name, policy] of Object.entries(auth.policies as Record<string, Record<string, unknown>>)) {
        const roles = policy.roles;
        if (!roles || !Array.isArray(roles) || roles.length === 0) {
          errors.push(`auth.policies.${name}: "roles" must be a non-empty array`);
        }
      }
    }

    // Scope filter validation
    if (auth.scopeFilter) {
      const sf = auth.scopeFilter as Record<string, unknown>;
      if (!sf.claim) {
        errors.push('auth.scopeFilter.claim is required');
      }
      if (!sf.column) {
        errors.push('auth.scopeFilter.column is required');
      } else if (!isValidIdentifier(sf.column as string)) {
        errors.push(`auth.scopeFilter: invalid SQL identifier "${sf.column}" in column`);
      }
      if (sf.mode === 'select' && !sf.header) {
        errors.push('auth.scopeFilter.header is required when mode is "select"');
      }
    }

    // Endpoint policy references
    if (endpoints) {
      for (const [name, endpoint] of Object.entries(endpoints)) {
        const policy = endpoint.policy as string | undefined;
        if (policy && policy !== 'public' && policy !== 'authenticated') {
          const policies = auth.policies as Record<string, unknown> | undefined;
          if (!policies?.[policy]) {
            errors.push(`endpoint "${name}": policy "${policy}" not found in auth.policies`);
          }
        }
      }
    }
  }

  const lintWarnings: ValidationError[] = [];
  validateCrudIdCollision(s, lintWarnings);
  validateAuthDomainsPort(s, lintWarnings);
  return {
    valid: errors.length === 0,
    errors,
    lintWarnings: lintWarnings.length > 0 ? lintWarnings : undefined,
  };
}
