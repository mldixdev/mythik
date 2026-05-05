import type { ContractRule, ContractContext, ContractFinding } from '../types.js';
import { matchEndpoint } from '../matcher.js';
import { suggest } from '../../utils/levenshtein.js';

export const fieldsValidRule: ContractRule = {
  name: 'fields-valid',
  description: 'POST/PUT body fields must exist in crud insertable/updatable definitions',

  check(context: ContractContext): ContractFinding[] {
    const findings: ContractFinding[] = [];

    for (const fetch of context.fetches) {
      if (fetch.method !== 'POST' && fetch.method !== 'PUT') continue;
      if (fetch.bodyFields.length === 0) continue;

      const result = matchEndpoint(
        fetch.path, fetch.method, context.endpoints, context.catalogs, context.authConfigured,
      );
      if (!result.matched || !result.endpoint?.crud) continue;

      const allowedFields = fetch.method === 'POST'
        ? result.endpoint.crud.insertable
        : result.endpoint.crud.updatable;

      for (const field of fetch.bodyFields) {
        if (!allowedFields.includes(field)) {
          const fieldList = fetch.method === 'POST' ? 'insertable' : 'updatable';
          const suggested = suggest(field, allowedFields);

          findings.push({
            level: 'error',
            rule: 'fields-valid',
            message: `${fetch.method} ${fetch.path} body field "${field}" not in ${fieldList}`,
            screen: fetch.screen,
            endpoint: fetch.path,
            suggestion: suggested
              ? `Did you mean "${suggested}"? ${fieldList}: ${allowedFields.join(', ')}`
              : `${fieldList}: ${allowedFields.join(', ')}`,
          });
        }
      }
    }

    return findings;
  },
};
