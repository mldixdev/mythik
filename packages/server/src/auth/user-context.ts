import type { UserContext } from '../types.js';
import type { ClaimsMapping } from './types.js';

export function buildUserContext(claims: Record<string, unknown>, mapping: ClaimsMapping): UserContext {
  const usernameKey = mapping.username ?? 'sub';
  const nameKey = mapping.name;
  const rolesKey = mapping.roles ?? 'roles';
  const scopeKey = mapping.scope;

  const username = String(claims[usernameKey] ?? '');
  const name = nameKey ? (claims[nameKey] as string | null) ?? null : null;

  const rolesRaw = claims[rolesKey];
  const roles: string[] = Array.isArray(rolesRaw)
    ? rolesRaw
    : typeof rolesRaw === 'string'
      ? [rolesRaw]
      : [];

  const scopeRaw = scopeKey ? claims[scopeKey] : undefined;
  const scope: unknown[] = Array.isArray(scopeRaw) ? scopeRaw : [];

  return { username, name, roles, scope, raw: claims };
}
