import type { JsonPatch } from '../streaming/patch.js';

/**
 * Generate RFC 6902 JSON Patch operations that transform `before` into `after`.
 * Arrays are treated as atomic values (replaced whole, not diffed element-by-element).
 */
export function computePatches(before: unknown, after: unknown): JsonPatch[] {
  const patches: JsonPatch[] = [];
  diffObjects(before, after, '', patches);
  return patches;
}

function diffObjects(before: unknown, after: unknown, basePath: string, patches: JsonPatch[]): void {
  if (before === after) return;
  if (JSON.stringify(before) === JSON.stringify(after)) return;

  if (!isPlainObject(before) || !isPlainObject(after)) {
    if (basePath === '') return;
    patches.push({ op: 'replace', path: basePath, value: after });
    return;
  }

  const beforeObj = before as Record<string, unknown>;
  const afterObj = after as Record<string, unknown>;
  const beforeKeys = Object.keys(beforeObj);
  const afterKeys = Object.keys(afterObj);
  const afterKeySet = new Set(afterKeys);
  const beforeKeySet = new Set(beforeKeys);

  // Removed keys
  for (const key of beforeKeys) {
    if (!afterKeySet.has(key)) {
      patches.push({ op: 'remove', path: `${basePath}/${escapeJsonPointer(key)}` });
    }
  }

  // Added keys
  for (const key of afterKeys) {
    if (!beforeKeySet.has(key)) {
      patches.push({ op: 'add', path: `${basePath}/${escapeJsonPointer(key)}`, value: afterObj[key] });
    }
  }

  // Changed keys — recurse for objects, replace for primitives/arrays
  for (const key of beforeKeys) {
    if (!afterKeySet.has(key)) continue;
    const bVal = beforeObj[key];
    const aVal = afterObj[key];
    const childPath = `${basePath}/${escapeJsonPointer(key)}`;

    if (bVal === aVal) continue;

    if (isPlainObject(bVal) && isPlainObject(aVal)) {
      diffObjects(bVal, aVal, childPath, patches);
    } else {
      patches.push({ op: 'replace', path: childPath, value: aVal });
    }
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function escapeJsonPointer(segment: string): string {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}
