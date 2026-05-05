import type { ContractRule, ContractContext, ContractFinding } from '../types.js';
import { matchEndpoint } from '../matcher.js';

export const endpointsExistRule: ContractRule = {
  name: 'endpoints-exist',
  description: 'Every fetch URL in screen specs must match an endpoint in the api-spec',

  check(context: ContractContext): ContractFinding[] {
    const findings: ContractFinding[] = [];

    for (const fetch of context.fetches) {
      const result = matchEndpoint(
        fetch.path, fetch.method, context.endpoints, context.catalogs, context.authConfigured,
      );

      if (!result.matched) {
        const finding: ContractFinding = {
          level: 'error',
          rule: 'endpoints-exist',
          message: `${fetch.method} ${fetch.path} — no endpoint found`,
          screen: fetch.screen,
          endpoint: fetch.path,
        };

        if (result.suggestion) {
          finding.suggestion = result.suggestion;
        } else if (result.availableCatalogs) {
          finding.suggestion = `Available catalogs: ${result.availableCatalogs.join(', ')}`;
        }

        findings.push(finding);
      }
    }

    return findings;
  },
};
