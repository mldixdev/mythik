/** A fetch/dataSource reference found in a screen spec */
export interface FetchReference {
  screen: string;
  path: string;
  method: string;
  queryParams: string[];
  bodyFields: string[];
  rawUrl: string;
  elementId?: string;
}

/** An endpoint declared in an api-spec */
export interface EndpointInfo {
  path: string;
  method: string;
  params: Record<string, { type: string }>;
  crud?: { insertable: string[]; updatable: string[] };
  policy?: string;
  source: string;
}

/** Everything the rules need */
export interface ContractContext {
  endpoints: Map<string, EndpointInfo>;
  catalogs: Set<string>;
  policies: Map<string, { roles: string[] }>;
  fetches: FetchReference[];
  roleAccess?: Record<string, string[]>;
  authConfigured: boolean;
}

/** A single finding from a rule */
export interface ContractFinding {
  level: 'error' | 'warning';
  rule: string;
  message: string;
  screen?: string;
  endpoint?: string;
  suggestion?: string;
  /** Number of duplicate findings collapsed into this one. Default: 1. */
  count?: number;
}

/** A contract rule — independent, pluggable */
export interface ContractRule {
  name: string;
  description: string;
  check(context: ContractContext): ContractFinding[];
}

/** Result of running all contract rules */
export interface ContractResult {
  valid: boolean;
  findings: ContractFinding[];
  summary: {
    screens: number;
    fetchReferences: number;
    endpointsCovered: number;
    rulesRun: number;
    errors: number;
    warnings: number;
  };
}
