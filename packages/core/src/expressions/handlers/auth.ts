import type { ExpressionHandlerDefinition, ResolverContext } from '../../types.js';

/**
 * BLOCKED fields — these NEVER resolve, even if somehow present in state.
 * Defense in depth: tokens live in closure, but we block at expression level too.
 */
const BLOCKED_FIELDS = new Set([
  'token', 'accessToken', 'access_token',
  'refreshToken', 'refresh_token',
  'password', 'secret', 'session',
]);

/**
 * Field resolution map — maps $auth field names to state paths.
 * Only fields in this map (or metadata subpaths) are accessible.
 */
const FIELD_MAP: Record<string, string> = {
  isAuthenticated: '/auth/isAuthenticated',
  loading: '/auth/loading',
  error: '/auth/error',
  id: '/auth/user/id',
  email: '/auth/user/email',
  name: '/auth/user/name',
  avatar: '/auth/user/avatar',
  role: '/auth/user/role',
  roles: '/auth/user/roles',
  metadata: '/auth/user/metadata',
  user: '/auth/user',
};

/**
 * $auth expression handler — secure access to authenticated user data.
 *
 * Usage: { "$auth": "email" }, { "$auth": "role" }, { "$auth": "metadata.department" }
 *
 * Security:
 * - Whitelist: only FIELD_MAP keys + metadata.* subpaths resolve
 * - Blocklist: token/password/secret/session always return undefined
 * - Reads from state /auth/* (which only contains safe derived data)
 */
export const authHandler: ExpressionHandlerDefinition = {
  key: '$auth',

  resolve(expr: Record<string, unknown>, context: ResolverContext): unknown {
    const field = expr.$auth as string;
    if (!field || typeof field !== 'string') return undefined;

    // Security: block sensitive fields
    if (BLOCKED_FIELDS.has(field)) return undefined;

    // Special case: isAuthenticated defaults to false when no auth state
    if (field === 'isAuthenticated') {
      const value = context.getState('/auth/isAuthenticated');
      return value === true;
    }

    // Direct field lookup
    const statePath = FIELD_MAP[field];
    if (statePath) {
      const value = context.getState(statePath);

      // Defense in depth: if returning an object (like "user"), strip any blocked fields
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const filtered: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
          if (!BLOCKED_FIELDS.has(k)) filtered[k] = v;
        }
        return filtered;
      }

      return value;
    }

    // Metadata subpath: "metadata.department" → /auth/user/metadata/department
    if (field.startsWith('metadata.')) {
      const subpath = field.slice('metadata.'.length);

      // Defense in depth: block sensitive field names even inside metadata
      const firstSegment = subpath.split('.')[0];
      if (BLOCKED_FIELDS.has(firstSegment)) return undefined;

      const metadata = context.getState('/auth/user/metadata') as Record<string, unknown> | undefined;
      if (!metadata || typeof metadata !== 'object') return undefined;

      // Support nested paths: "metadata.address.city"
      const segments = subpath.split('.');
      let current: unknown = metadata;
      for (const seg of segments) {
        if (current === null || current === undefined || typeof current !== 'object') return undefined;
        current = (current as Record<string, unknown>)[seg];
      }
      return current;
    }

    // Unknown field
    return undefined;
  },
};
