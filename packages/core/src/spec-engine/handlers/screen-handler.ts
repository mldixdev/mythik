import type { Spec } from '../../types.js';
import type { DocumentHandler, ElementsResult, PatchedPathsResult } from '../types.js';
import type { ValidationContext, SpecValidationResult } from '../../security/spec-validator.js';
import type { JsonPatch } from '../../streaming/patch.js';
import { generateManifest } from '../manifest.js';
import { getElements as getElementsPure } from '../elements.js';
import { validateSpec } from '../../security/spec-validator.js';

function extractPatchedElements(patches: JsonPatch[]): string[] {
  const ids = new Set<string>();
  for (const p of patches) {
    const match = p.path.match(/^\/elements\/([^/]+)/);
    if (match) ids.add(match[1]);
  }
  return Array.from(ids);
}

export const screenHandler: DocumentHandler<Spec> = {
  type: 'screen',

  detect(doc: unknown): doc is Spec {
    return doc != null && typeof doc === 'object' && 'root' in doc && 'elements' in doc;
  },

  generateManifest(doc: Spec): string {
    return generateManifest(doc);
  },

  getElements(doc: Spec, ids: string[]): ElementsResult {
    return getElementsPure(doc, ids);
  },

  validate(doc: Spec, context: ValidationContext): SpecValidationResult {
    return validateSpec(doc, context);
  },

  extractPatchedPaths(patches: JsonPatch[]): PatchedPathsResult {
    return { elements: extractPatchedElements(patches), sections: [] };
  },

  countElements(doc: Spec): number {
    return Object.keys(doc.elements).length;
  },
};
