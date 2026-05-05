import type { Spec } from '../types.js';
import type { ElementsResult } from './types.js';

/**
 * Extract specific elements from a spec by their IDs.
 * Returns found elements and a list of IDs that don't exist.
 */
export function getElements(spec: Spec, elementIds: string[]): ElementsResult {
  const found: Record<string, import('../types.js').Element> = {};
  const notFound: string[] = [];

  for (const id of elementIds) {
    if (id in spec.elements) {
      found[id] = spec.elements[id];
    } else {
      notFound.push(id);
    }
  }

  return { found, notFound };
}
