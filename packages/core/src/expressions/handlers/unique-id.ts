import type { ExpressionHandlerDefinition, ResolveFn } from '../../types.js';

function toPositiveInteger(value: unknown, fallback: number): number {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 1) return fallback;
  return Math.floor(numberValue);
}

function toNonNegativeInteger(value: unknown, fallback: number): number {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) return fallback;
  return Math.floor(numberValue);
}

function formatCandidate(prefix: string, value: number, padding: number): string {
  const suffix = padding > 0 ? String(value).padStart(padding, '0') : String(value);
  return `${prefix}${suffix}`;
}

/**
 * $uniqueId - deterministic, collision-free id generation for JSON specs.
 *
 * The handler scans an existing array and returns the first unused
 * prefix+number candidate. It is intentionally deterministic so specs remain
 * testable and replayable; use backend-generated ids for database primary keys
 * that must be globally unique across clients.
 */
export const uniqueIdHandler: ExpressionHandlerDefinition = {
  key: '$uniqueId',
  resolve(expr: Record<string, unknown>, _context, resolveFn?: ResolveFn): unknown {
    const resolve = resolveFn ?? ((e: unknown) => e);
    const source = resolve(expr.source);
    const items = Array.isArray(source) ? source : [];
    const field = typeof expr.field === 'string' && expr.field.length > 0 ? expr.field : 'id';
    const prefix = String(resolve(expr.prefix) ?? 'item-');
    const start = toPositiveInteger(resolve(expr.start), 1);
    const padding = toNonNegativeInteger(resolve(expr.padding), 0);

    const existing = new Set<string>();
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const value = (item as Record<string, unknown>)[field];
      if (value !== null && value !== undefined) existing.add(String(value));
    }

    const maxAttempts = existing.size + 10_000;
    for (let offset = 0; offset <= maxAttempts; offset += 1) {
      const candidate = formatCandidate(prefix, start + offset, padding);
      if (!existing.has(candidate)) return candidate;
    }

    throw new Error(`$uniqueId could not find an unused id for prefix "${prefix}"`);
  },
};
