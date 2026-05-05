import type { AppSpec } from '../../app/app-engine.js';
import type { DocumentHandler, ElementsResult, PatchedPathsResult } from '../types.js';
import type { ValidationContext, SpecValidationResult } from '../../security/spec-validator.js';
import type { JsonPatch } from '../../streaming/patch.js';
import { generateAppManifest } from '../app-manifest.js';
import { getAppElements } from '../app-elements.js';
import { validateAppSpec } from '../../security/app-spec-validator.js';

export const appHandler: DocumentHandler<AppSpec> = {
  type: 'app',

  detect(doc: unknown): doc is AppSpec {
    return doc != null && typeof doc === 'object' && 'type' in doc && (doc as Record<string, unknown>).type === 'app';
  },

  generateManifest(doc: AppSpec): string {
    return generateAppManifest(doc);
  },

  getElements(doc: AppSpec, ids: string[]): ElementsResult {
    return getAppElements(doc, ids);
  },

  validate(doc: AppSpec, context: ValidationContext): SpecValidationResult {
    return validateAppSpec(doc, context);
  },

  extractPatchedPaths(patches: JsonPatch[]): PatchedPathsResult {
    const elements = new Set<string>();
    const sections = new Set<string>();
    const topLevelSections = new Set(['tokens', 'screens', 'navigation', 'translations', 'sharedState', 'templates', 'layout', 'name', 'type']);

    for (const p of patches) {
      // /layout/elements/{id}/... → element
      const layoutMatch = p.path.match(/^\/layout\/elements\/([^/]+)/);
      if (layoutMatch) {
        elements.add(layoutMatch[1]);
        continue;
      }
      // /tokens/... → section "tokens", /screens/... → section "screens", etc.
      const sectionMatch = p.path.match(/^\/([^/]+)/);
      if (sectionMatch && topLevelSections.has(sectionMatch[1])) {
        sections.add(sectionMatch[1]);
      }
    }

    return { elements: Array.from(elements), sections: Array.from(sections) };
  },

  countElements(doc: AppSpec): number {
    return Object.keys(doc.layout.elements).length;
  },
};
