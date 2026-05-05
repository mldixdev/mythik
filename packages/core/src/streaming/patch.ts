import type { Spec } from '../types.js';

/**
 * RFC 6902 JSON Patch operation.
 */
export interface JsonPatch {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string;
  value?: unknown;
  from?: string;
}

/**
 * Apply a single JSON Patch operation to a Spec.
 * Paths use JSON Pointer (RFC 6901): "/elements/card-1/props/title"
 */
export function applyPatch(spec: Record<string, unknown>, patch: JsonPatch): Record<string, unknown> {
  const result = structuredClone(spec);

  switch (patch.op) {
    case 'add':
      setAtPath(result, patch.path, patch.value, true);
      break;
    case 'replace':
      setAtPath(result, patch.path, patch.value, false);
      break;

    case 'remove':
      removeAtPath(result, patch.path);
      break;

    case 'move': {
      if (!patch.from) throw new Error('move operation requires "from" field');
      const value = getAtPath(result, patch.from);
      removeAtPath(result, patch.from);
      setAtPath(result, patch.path, value);
      break;
    }

    case 'copy': {
      if (!patch.from) throw new Error('copy operation requires "from" field');
      const value = getAtPath(result, patch.from);
      setAtPath(result, patch.path, structuredClone(value));
      break;
    }

    case 'test': {
      const actual = getAtPath(result, patch.path);
      if (JSON.stringify(actual) !== JSON.stringify(patch.value)) {
        throw new Error(`test failed: value at "${patch.path}" does not match expected`);
      }
      break;
    }
  }

  return result;
}

/**
 * Apply multiple patches sequentially to build up a Spec.
 */
export function applyPatches(initial: Record<string, unknown>, patches: JsonPatch[]): Record<string, unknown> {
  let result = initial;
  for (const patch of patches) {
    result = applyPatch(result, patch);
  }
  return result;
}

// --- Path helpers ---

function parsePath(path: string): string[] {
  if (path === '' || path === '/') return [];
  if (!path.startsWith('/')) throw new Error(`Invalid path: "${path}"`);
  return path.slice(1).split('/').map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function getAtPath(obj: unknown, path: string): unknown {
  const segments = parsePath(path);
  let current: unknown = obj;
  for (const seg of segments) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      if (seg === '-') return undefined;
      current = current[Number(seg)];
    } else if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  return current;
}

function setAtPath(obj: Record<string, unknown>, path: string, value: unknown, isInsert = false): void {
  const segments = parsePath(path);
  if (segments.length === 0) return;

  let current: unknown = obj;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (Array.isArray(current)) {
      current = current[Number(seg)];
    } else if (typeof current === 'object' && current !== null) {
      const record = current as Record<string, unknown>;
      if (!(seg in record)) {
        // Auto-create intermediate objects
        record[seg] = {};
      }
      current = record[seg];
    }
  }

  const lastSeg = segments[segments.length - 1];
  if (Array.isArray(current)) {
    if (lastSeg === '-') {
      current.push(value);
    } else if (isInsert) {
      // RFC 6902: "add" on array index inserts before that index
      current.splice(Number(lastSeg), 0, value);
    } else {
      // "replace" overwrites at that index
      current[Number(lastSeg)] = value;
    }
  } else if (typeof current === 'object' && current !== null) {
    (current as Record<string, unknown>)[lastSeg] = value;
  }
}

function removeAtPath(obj: Record<string, unknown>, path: string): void {
  const segments = parsePath(path);
  if (segments.length === 0) return;

  let current: unknown = obj;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (Array.isArray(current)) {
      current = current[Number(seg)];
    } else if (typeof current === 'object' && current !== null) {
      current = (current as Record<string, unknown>)[seg];
    }
  }

  const lastSeg = segments[segments.length - 1];
  if (Array.isArray(current)) {
    current.splice(Number(lastSeg), 1);
  } else if (typeof current === 'object' && current !== null) {
    delete (current as Record<string, unknown>)[lastSeg];
  }
}
