import type { PolicyConfig } from './types.js';

export function evaluatePolicy(
  policy: string | undefined,
  userRoles: string[],
  policies: Record<string, PolicyConfig>,
): boolean {
  if (policy === 'public') return true;
  if (!policy || policy === 'authenticated') return true;

  const policyConfig = policies[policy];
  if (!policyConfig) return false;

  return policyConfig.roles.some(role => userRoles.includes(role));
}
