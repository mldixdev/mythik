export function cloneEditorValue<T>(value: T): T {
  if (typeof globalThis.structuredClone !== 'function') {
    throw new Error('Editor sessions require structuredClone support');
  }
  return globalThis.structuredClone(value);
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function fingerprint(value: unknown): string {
  return stableStringify(value);
}

function canonicalize(value: unknown, stack = new WeakSet<object>()): unknown {
  if (value === null) return ['null'];
  if (value === undefined) return ['undefined'];
  if (typeof value === 'string') return ['string', value];
  if (typeof value === 'number') return ['number', Number.isNaN(value) ? 'NaN' : value];
  if (typeof value === 'boolean') return ['boolean', value];
  if (typeof value === 'function') return ['function', value.name || ''];
  if (typeof value === 'symbol') return ['symbol', String(value)];
  if (typeof value === 'bigint') return ['bigint', value.toString()];
  if (Array.isArray(value)) {
    if (stack.has(value)) return ['circular'];
    stack.add(value);
    const result = value.map((item) => canonicalize(item, stack));
    stack.delete(value);
    return ['array', result];
  }
  if (value && typeof value === 'object') {
    if (stack.has(value)) return ['circular'];
    stack.add(value);
    const entries: Array<[string, unknown]> = [];
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      entries.push([key, canonicalize((value as Record<string, unknown>)[key], stack)]);
    }
    stack.delete(value);
    const proto = Object.getPrototypeOf(value);
    const objectKind = proto === Object.prototype || proto === null
      ? 'plain'
      : value.constructor?.name ?? 'object';
    return ['object', objectKind, entries];
  }
  return value;
}
