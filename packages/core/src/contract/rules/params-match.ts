import type { ContractRule, ContractContext, ContractFinding } from '../types.js';
import { matchEndpoint } from '../matcher.js';
import { suggest } from '../../utils/levenshtein.js';

const ALWAYS_VALID_PARAMS = new Set(['page', 'pageSize']);

export const paramsMatchRule: ContractRule = {
  name: 'params-match',
  description: 'Query params in fetch URLs must match endpoint param definitions',

  check(context: ContractContext): ContractFinding[] {
    const findings: ContractFinding[] = [];

    for (const fetch of context.fetches) {
      if (fetch.queryParams.length === 0) continue;

      const result = matchEndpoint(
        fetch.path, fetch.method, context.endpoints, context.catalogs, context.authConfigured,
      );
      if (!result.matched || !result.endpoint) continue;

      const declaredParams = Object.keys(result.endpoint.params);
      if (declaredParams.length === 0) continue;

      for (const param of fetch.queryParams) {
        if (ALWAYS_VALID_PARAMS.has(param)) continue;
        if (declaredParams.includes(param)) continue;

        const suggested = suggest(param, declaredParams);
        const paramList = declaredParams.map(p => `${p} (${result.endpoint!.params[p].type})`).join(', ');

        findings.push({
          level: 'warning',
          rule: 'params-match',
          message: `${fetch.method} ${fetch.path} sends param "${param}" — not declared in endpoint`,
          screen: fetch.screen,
          endpoint: fetch.path,
          suggestion: suggested
            ? `Did you mean "${suggested}"? Available: ${paramList}`
            : `Available params: ${paramList}`,
        });
      }
    }

    return findings;
  },
};
