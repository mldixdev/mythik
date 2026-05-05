import type { ContractResult, ContractContext, ContractRule, ContractFinding } from './types.js';
import { extractFetchReferences } from './extractor.js';
import { buildEndpointMap } from './endpoint-map.js';
import { endpointsExistRule } from './rules/endpoints-exist.js';
import { fieldsValidRule } from './rules/fields-valid.js';
import { paramsMatchRule } from './rules/params-match.js';
import { permissionsConsistentRule } from './rules/permissions-consistent.js';

const RULES: ContractRule[] = [
  endpointsExistRule,
  fieldsValidRule,
  paramsMatchRule,
  permissionsConsistentRule,
];

export interface RunContractInput {
  app?: Record<string, unknown>;
  screens: Record<string, Record<string, unknown>>;
  apis: Array<{ id: string; spec: Record<string, unknown> }>;
  baseUrl?: string;
}

export function runContract(input: RunContractInput): ContractResult {
  const { app, screens, apis, baseUrl } = input;

  // 1. Build endpoint map from all api-specs
  const { endpoints, catalogs, policies, authConfigured } = buildEndpointMap(apis);

  // 2. Extract fetch references from all screens
  const fetches = Object.entries(screens).flatMap(([screenId, spec]) =>
    extractFetchReferences(screenId, spec, baseUrl),
  );

  // 3. Extract roleAccess from AppSpec
  const nav = app?.navigation as Record<string, unknown> | undefined;
  const auth = nav?.auth as Record<string, unknown> | undefined;
  const roleAccess = auth?.roleAccess as Record<string, string[]> | undefined;

  // 4. Build context
  const context: ContractContext = {
    endpoints,
    catalogs,
    policies,
    fetches,
    roleAccess,
    authConfigured,
  };

  // 5. Collect findings
  const rawFindings: ContractFinding[] = [];

  // 5a. Warn if absolute URLs detected without baseUrl
  if (!baseUrl) {
    const hasAbsoluteUrls = fetches.some(f =>
      (f.rawUrl.startsWith('http://') || f.rawUrl.startsWith('https://')) && !f.rawUrl.includes('${'),
    );
    if (hasAbsoluteUrls) {
      rawFindings.push({
        level: 'warning',
        rule: 'contract',
        message: 'Absolute URLs detected in screen specs but no --base-url provided. Endpoint matching may fail for absolute URLs. Use: mythik contract --base-url http://your-server:port',
      });
    }
  }

  // 5b. Run all rules
  rawFindings.push(...RULES.flatMap(rule => rule.check(context)));

  // 6. Deduplicate findings by rule + screen + message
  const findings = deduplicateFindings(rawFindings);

  const errors = findings.filter(f => f.level === 'error').length;
  const warnings = findings.filter(f => f.level === 'warning').length;

  // Count unique endpoints covered by fetches
  const coveredEndpoints = new Set(fetches.map(f => `${f.method} ${f.path}`));

  return {
    valid: errors === 0,
    findings,
    summary: {
      screens: Object.keys(screens).length,
      fetchReferences: fetches.length,
      endpointsCovered: coveredEndpoints.size,
      rulesRun: RULES.length,
      errors,
      warnings,
    },
  };
}

function deduplicateFindings(findings: ContractFinding[]): ContractFinding[] {
  const seen = new Map<string, ContractFinding>();

  for (const f of findings) {
    const key = `${f.level}|${f.rule}|${f.screen ?? ''}|${f.message}`;
    const existing = seen.get(key);
    if (existing) {
      existing.count = (existing.count ?? 1) + 1;
    } else {
      seen.set(key, { ...f, count: 1 });
    }
  }

  return Array.from(seen.values());
}
