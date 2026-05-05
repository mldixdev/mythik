import type { AppSpec } from '../app/app-engine.js';
import type { ElementsResult } from './types.js';

export function resolveDotPath(obj: unknown, dotPath: string): unknown {
  const segments = dotPath.split('.');
  let current: unknown = obj;
  for (const seg of segments) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[seg];
  }
  return current;
}

export function getAppElements(doc: AppSpec, ids: string[]): ElementsResult {
  const found: Record<string, unknown> = {};
  const notFound: string[] = [];

  for (const id of ids) {
    if (id.includes('.')) {
      const value = resolveDotPath(doc, id);
      if (value !== undefined) {
        found[id] = value;
      } else {
        notFound.push(id);
      }
    } else {
      const el = (doc.layout.elements as Record<string, unknown>)[id];
      if (el !== undefined) {
        found[id] = el;
      } else {
        notFound.push(id);
      }
    }
  }

  return { found, notFound };
}
