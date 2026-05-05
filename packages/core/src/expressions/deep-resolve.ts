import type { ResolveFn } from '../types.js';

/** Resolve expressions inside structured JSON values without resolving expression results again. */
export function deepResolveExpressionValue(value: unknown, resolve: ResolveFn): unknown {
  if (value === null || value === undefined || typeof value !== 'object') return value;
  // Preserve binary objects (File extends Blob): their properties are prototype getters, not JSON fields.
  if (typeof Blob !== 'undefined' && value instanceof Blob) return value;
  if (Array.isArray(value)) return value.map((item) => deepResolveExpressionValue(item, resolve));

  const obj = value as Record<string, unknown>;
  const hasExprKey = Object.keys(obj).some((key) => key.startsWith('$'));
  if (hasExprKey) return resolve(obj);

  const resolved: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(obj)) {
    resolved[key] = deepResolveExpressionValue(nestedValue, resolve);
  }
  return resolved;
}
