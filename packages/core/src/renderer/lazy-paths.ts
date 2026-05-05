/**
 * Path-tracking + matching infrastructure for primitive-declared lazy paths.
 * Used by the renderer engine (resolveDeep skip) and dependency scanner
 * (scanDeps skip). Internal-only — not re-exported from `core/index.ts`.
 *
 * Notation: `'columns[].actions[].onPress'` parses to segments
 * `['columns', '[]', 'actions', '[]', 'onPress']` where `'[]'` matches any
 * numeric array index during walk-time.
 */

export type ParsedLazyPath = (string | '[]')[];

export function parseLazyPath(path: string): ParsedLazyPath {
  // 'columns[].actions[].onPress' → split('.') → ['columns[]', 'actions[]', 'onPress']
  // each part: extract name + count of '[]' suffixes
  const segments: ParsedLazyPath = [];
  for (const part of path.split('.')) {
    const match = part.match(/^([^\[]+)((?:\[\])*)$/);
    if (!match) continue;
    segments.push(match[1]);
    const brackets = match[2].length / 2;
    for (let i = 0; i < brackets; i++) segments.push('[]');
  }
  return segments;
}

export function isOnLazyPath(
  currentPath: (string | number)[],
  lazyPaths: ParsedLazyPath[],
): boolean {
  if (lazyPaths.length === 0) return false; // zero-cost guard
  for (const lazy of lazyPaths) {
    if (currentPath.length !== lazy.length) continue;
    let matched = true;
    for (let i = 0; i < currentPath.length; i++) {
      const seg = lazy[i];
      const cur = currentPath[i];
      if (seg === '[]') {
        if (typeof cur !== 'number') { matched = false; break; }
      } else if (cur !== seg) {
        matched = false; break;
      }
    }
    if (matched) return true;
  }
  return false;
}

const EMPTY: ParsedLazyPath[] = [];
const parseCache = new Map<string, ParsedLazyPath[]>();

export function getParsedLazyPaths(
  primitiveType: string,
  raw: string[] | undefined,
): ParsedLazyPath[] {
  if (!raw || raw.length === 0) return EMPTY;
  let cached = parseCache.get(primitiveType);
  if (!cached) {
    cached = raw.map(parseLazyPath);
    parseCache.set(primitiveType, cached);
  }
  return cached;
}
