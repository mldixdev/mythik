import type { DocumentHandler, ElementsResult, PatchedPathsResult } from '../types.js';
import type { ValidationContext, SpecValidationResult } from '../../security/spec-validator.js';
import type { JsonPatch } from '../../streaming/patch.js';
import { validateApiSpec } from '../../security/api-spec-validator.js';

type ApiSpecDoc = Record<string, unknown>;

export const apiHandler: DocumentHandler<ApiSpecDoc> = {
  type: 'api',

  detect(doc: unknown): doc is ApiSpecDoc {
    return doc != null && typeof doc === 'object' && 'type' in doc && (doc as Record<string, unknown>).type === 'api';
  },

  generateManifest(doc: ApiSpecDoc): string {
    const lines: string[] = [];
    lines.push(`API: ${(doc.name as string) ?? '(unnamed)'}`);
    lines.push('');

    const catalogs = doc.catalogs as Record<string, Record<string, unknown>> | undefined;
    if (catalogs) {
      const entries = Object.entries(catalogs);
      lines.push(`Catalogs (${entries.length}):`);
      for (const [name, config] of entries) {
        const detail = config.static
          ? '(static)'
          : config.distinct
            ? `(distinct: ${config.distinct})`
            : `(${config.value} → ${config.label})`;
        lines.push(`  ${name} ${detail}`);
      }
      lines.push('');
    }

    const endpoints = doc.endpoints as Record<string, Record<string, unknown>> | undefined;
    if (endpoints) {
      const entries = Object.entries(endpoints);
      lines.push(`Endpoints (${entries.length}):`);
      for (const [name, ep] of entries) {
        const method = ((ep.method as string) ?? 'GET').toUpperCase();
        const details: string[] = [];
        if (ep.query) details.push('query');
        if (ep.handler) details.push(`handler: ${ep.handler}`);
        if (ep.crud) details.push('crud');
        if (ep.pagination) details.push(`pagination: ${ep.pagination}`);
        if (ep.policy) details.push(`policy: ${ep.policy}`);
        lines.push(`  ${name}: ${method} ${ep.path} (${details.join(', ')})`);
      }
      lines.push('');
    }

    const auth = doc.auth as Record<string, unknown> | undefined;
    if (auth) {
      lines.push('Auth:');
      lines.push(`  Strategy: ${auth.strategy ?? 'jwt'}`);
      if (auth.policies) {
        const policyNames = Object.keys(auth.policies as Record<string, unknown>);
        lines.push(`  Policies (${policyNames.length}): ${policyNames.join(', ')}`);
      }
      if (auth.scopeFilter) {
        const sf = auth.scopeFilter as Record<string, unknown>;
        lines.push(`  Scope filter: ${sf.mode ?? 'all'} on ${sf.column}`);
      }
    }

    return lines.join('\n');
  },

  getElements(doc: ApiSpecDoc, ids: string[]): ElementsResult {
    const found: Record<string, unknown> = {};
    const notFound: string[] = [];

    for (const id of ids) {
      const parts = id.split('.');
      let current: unknown = doc;
      for (const part of parts) {
        if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
          current = (current as Record<string, unknown>)[part];
        } else {
          current = undefined;
          break;
        }
      }
      if (current !== undefined) {
        found[id] = current;
      } else {
        notFound.push(id);
      }
    }

    return { found, notFound };
  },

  validate(doc: ApiSpecDoc, _context: ValidationContext): SpecValidationResult {
    const result = validateApiSpec(doc);
    return {
      valid: result.valid,
      errors: result.errors.map(msg => ({ message: msg, path: '' })),
      warnings: [],
      lintWarnings: result.lintWarnings,
    };
  },

  extractPatchedPaths(patches: JsonPatch[]): PatchedPathsResult {
    const sections = new Set<string>();
    const topLevelSections = new Set(['catalogs', 'endpoints', 'auth', 'name', 'type']);

    for (const p of patches) {
      const sectionMatch = p.path.match(/^\/([^/]+)/);
      if (sectionMatch && topLevelSections.has(sectionMatch[1])) {
        sections.add(sectionMatch[1]);
      }
    }

    return { elements: [], sections: Array.from(sections) };
  },

  countElements(doc: ApiSpecDoc): number {
    const catalogCount = doc.catalogs ? Object.keys(doc.catalogs as Record<string, unknown>).length : 0;
    const endpointCount = doc.endpoints ? Object.keys(doc.endpoints as Record<string, unknown>).length : 0;
    return catalogCount + endpointCount;
  },
};
