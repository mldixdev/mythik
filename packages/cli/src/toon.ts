import { encode, decode } from '@toon-format/toon';

const ENCODE_OPTIONS = { keyFolding: 'safe' as const };
const DECODE_OPTIONS = { expandPaths: 'safe' as const };

/** Encode a JSON-serializable value to TOON format. */
export function toToon(value: unknown): string {
  return encode(value as import('@toon-format/toon').JsonValue, ENCODE_OPTIONS);
}

/** Decode a TOON string to a JSON value. */
export function fromToon(input: string): unknown {
  return decode(input, DECODE_OPTIONS);
}

/**
 * Autodetect format and parse.
 * Tries JSON.parse first — if it succeeds, it's JSON.
 * If JSON.parse fails, tries TOON decode.
 * This handles edge cases where TOON tabular arrays start with `{` (column headers).
 */
export function autoparse(input: string): unknown {
  const trimmed = input.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    return fromToon(trimmed);
  }
}
