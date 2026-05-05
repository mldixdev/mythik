import type { ApiSpec } from './types.js';
import type { DocumentHandler, ElementsResult, PatchedPathsResult } from 'mythik';
import type { ValidationContext, SpecValidationResult } from 'mythik';
import type { JsonPatch } from 'mythik';
import { validateApiSpec } from './validation/spec-validator.js';

function resolveDotPath(obj: unknown, dotPath: string): unknown {
  const segments = dotPath.split('.');
  let current: unknown = obj;
  for (const seg of segments) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[seg];
  }
  return current;
}

export const apiHandler: DocumentHandler<ApiSpec> = {
  type: 'api',

  detect(doc: unknown): doc is ApiSpec {
    return doc != null && typeof doc === 'object' && 'type' in doc && (doc as Record<string, unknown>).type === 'api';
  },

  generateManifest(doc: ApiSpec): string {
    const lines: string[] = [];
    const catalogCount = doc.catalogs ? Object.keys(doc.catalogs).length : 0;
    const endpointCount = doc.endpoints ? Object.keys(doc.endpoints).length : 0;
    const handlerCount = doc.endpoints
      ? Object.values(doc.endpoints).filter(e => e.handler).length
      : 0;

    lines.push(`api: ${doc.name ?? 'unnamed'} (${catalogCount} catalogs, ${endpointCount} endpoints, ${handlerCount} handlers)`);
    lines.push('');

    lines.push('');

    // Catalogs
    if (doc.catalogs && catalogCount > 0) {
      lines.push('catalogs:');
      const catalogIds = Object.keys(doc.catalogs);
      for (let i = 0; i < catalogIds.length; i++) {
        const name = catalogIds[i];
        const cat = doc.catalogs[name];
        const isLast = i === catalogIds.length - 1;
        const connector = isLast ? '└── ' : '├── ';

        if (cat.static) {
          lines.push(`  ${connector}${name} — static (${cat.static.length} items)`);
        } else if (cat.distinct) {
          lines.push(`  ${connector}${name} — ${cat.from} (distinct: ${cat.distinct})`);
        } else {
          const extra = cat.extra ? ` +extra: ${cat.extra.join(', ')}` : '';
          lines.push(`  ${connector}${name} — ${cat.from} (${cat.value} → ${cat.label})${extra}`);
        }
      }
      lines.push('');
    }

    // Endpoints
    if (doc.endpoints && endpointCount > 0) {
      lines.push('endpoints:');
      const endpointIds = Object.keys(doc.endpoints);
      for (let i = 0; i < endpointIds.length; i++) {
        const ep = doc.endpoints[endpointIds[i]];
        const isLast = i === endpointIds.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        const m = (ep.method ?? 'GET').toUpperCase();
        const details: string[] = [];
        if (ep.query) details.push('query');
        if (ep.pagination) details.push(`pagination: ${ep.pagination}`);
        if (ep.totals) details.push(`totals: ${Array.isArray(ep.totals) ? ep.totals.length : 'manual'}`);
        if (ep.handler) details.push(`handler: ${ep.handler}`);
        if (ep.crud) details.push('crud');
        lines.push(`  ${connector}${m.padEnd(6)} ${ep.path} (${details.join(', ')})`);
      }
    }

    return lines.join('\n');
  },

  getElements(doc: ApiSpec, ids: string[]): ElementsResult {
    const found: Record<string, unknown> = {};
    const notFound: string[] = [];

    for (const id of ids) {
      const value = resolveDotPath(doc, id);
      if (value !== undefined) {
        found[id] = value;
      } else {
        notFound.push(id);
      }
    }

    return { found, notFound };
  },

  validate(doc: ApiSpec, _context: ValidationContext): SpecValidationResult {
    const result = validateApiSpec(doc);
    return {
      valid: result.valid,
      errors: result.errors.map(msg => ({ message: msg })),
    };
  },

  extractPatchedPaths(patches: JsonPatch[]): PatchedPathsResult {
    const sections = new Set<string>();
    const topLevel = new Set(['catalogs', 'endpoints', 'auth', 'name', 'type']);

    for (const p of patches) {
      const match = p.path.match(/^\/([^/]+)/);
      if (match && topLevel.has(match[1])) {
        sections.add(match[1]);
      }
    }

    return { elements: [], sections: Array.from(sections) };
  },

  countElements(_doc: ApiSpec): number {
    return 0;
  },
};
