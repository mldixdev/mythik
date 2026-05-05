import type { ContractRule, ContractContext, ContractFinding } from '../types.js';
import { matchEndpoint } from '../matcher.js';

export const permissionsConsistentRule: ContractRule = {
  name: 'permissions-consistent',
  description: 'If AppSpec grants a role access to a screen, endpoints used by that screen must allow that role',

  check(context: ContractContext): ContractFinding[] {
    if (!context.roleAccess) return [];

    const findings: ContractFinding[] = [];

    // Build screen → fetches map
    const screenFetches = new Map<string, typeof context.fetches>();
    for (const fetch of context.fetches) {
      if (!screenFetches.has(fetch.screen)) {
        screenFetches.set(fetch.screen, []);
      }
      screenFetches.get(fetch.screen)!.push(fetch);
    }

    // For each role, check that its screens' endpoints allow the role
    for (const [role, screens] of Object.entries(context.roleAccess)) {
      const accessibleScreens = screens.includes('*')
        ? Array.from(screenFetches.keys())
        : screens;

      for (const screenId of accessibleScreens) {
        const fetches = screenFetches.get(screenId);
        if (!fetches) continue;

        for (const fetch of fetches) {
          const result = matchEndpoint(
            fetch.path, fetch.method, context.endpoints, context.catalogs, context.authConfigured,
          );
          if (!result.matched || !result.endpoint) continue;

          const policy = result.endpoint.policy;
          if (!policy || policy === 'public' || policy === 'authenticated') continue;

          const policyConfig = context.policies.get(policy);
          if (!policyConfig) continue;

          if (!policyConfig.roles.includes(role)) {
            findings.push({
              level: 'warning',
              rule: 'permissions-consistent',
              message: `Role "${role}" can access screen "${screenId}" but ${fetch.method} ${fetch.path} requires policy "${policy}" (roles: [${policyConfig.roles.join(', ')}])`,
              screen: screenId,
              endpoint: fetch.path,
              suggestion: `Role "${role}" can see the screen but API will deny the action (403)`,
            });
          }
        }
      }
    }

    return findings;
  },
};
