import { describe, it, expect } from 'vitest';
import {
  BLOB_CATALOG,
  type BlobShapeName,
  type CuratedBlobName,
} from '../../../../src/design/background/blobs/catalog.js';

const CURATED_NAMES: ReadonlyArray<CuratedBlobName> = [
  'organic-1',
  'organic-2',
  'organic-3',
  'organic-4',
  'organic-5',
  'circle',
];

// Legal SVG path-data character set. Guards against accidental typos like
// `MQ50,10` that would technically match "starts with M" but be unparseable.
const LEGAL_SVG_PATH_CHARS = /^[MmLlHhVvCcSsQqTtAaZz0-9\s,.\-+eE]+$/;

/**
 * Extracts every numeric token from an SVG path data string.
 * Handles exponents, negatives, decimals. Does NOT pair them into (x,y);
 * used only for aggregate bounds / shape comparisons.
 */
function extractNumbers(path: string): number[] {
  const matches = path.match(/-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?/g);
  return matches ? matches.map(Number) : [];
}

describe('BLOB_CATALOG', () => {
  it('contains exactly 6 curated entries (5 organic + circle)', () => {
    const keys = Object.keys(BLOB_CATALOG).sort();
    const expected = [...CURATED_NAMES].sort();
    expect(keys).toEqual(expected);
  });

  it('does NOT contain a custom-svg entry (user-provided, not curated)', () => {
    expect('custom-svg' in BLOB_CATALOG).toBe(false);
  });

  describe('per-entry invariants', () => {
    for (const name of CURATED_NAMES) {
      describe(name, () => {
        it('has matching name field', () => {
          expect(BLOB_CATALOG[name].name).toBe(name);
        });

        it('has viewBox in canonical form "0 0 <positive-w> <positive-h>"', () => {
          // M1 tighter regex — rejects zero-dimensional "0 0 0 0".
          expect(BLOB_CATALOG[name].viewBox).toMatch(/^0 0 [1-9]\d* [1-9]\d*$/);
        });

        it('has a non-empty SVG path', () => {
          expect(BLOB_CATALOG[name].path.length).toBeGreaterThan(0);
        });

        it('path starts with a Move command (M|m)', () => {
          expect(BLOB_CATALOG[name].path.trimStart().charAt(0).toLowerCase())
            .toBe('m');
        });

        it('path is closed (ends with Z or z)', () => {
          expect(BLOB_CATALOG[name].path.trimEnd().slice(-1).toLowerCase())
            .toBe('z');
        });

        it('path contains only legal SVG command characters (M5)', () => {
          expect(BLOB_CATALOG[name].path).toMatch(LEGAL_SVG_PATH_CHARS);
        });

        it('all numeric tokens stay within a viewBox-scaled envelope (I3)', () => {
          const numbers = extractNumbers(BLOB_CATALOG[name].path);
          const [, , widthStr, heightStr] = BLOB_CATALOG[name].viewBox.split(' ');
          const width = parseInt(widthStr, 10);
          const height = parseInt(heightStr, 10);
          // Path d-strings interleave heterogeneous numbers: absolute
          // coordinates, RELATIVE offsets (lowercase commands like `a45,45 0
          // 1,0 -90,0`), arc radii, sweep/large-arc flags (0 or 1). Absolute
          // coords should fit in [0, W or H]; relative offsets can swing
          // fully negative up to -max(W,H). We use a generous envelope
          // [-max(W,H), max(W,H) + slack] to catch the main regression
          // target: "someone pasted a 200×200 design" would overflow here.
          const maxDim = Math.max(width, height);
          const slack = 5;
          for (const n of numbers) {
            expect(n).toBeGreaterThanOrEqual(-maxDim - slack);
            expect(n).toBeLessThanOrEqual(maxDim + slack);
          }
        });
      });
    }
  });

  it('all 5 organic shape paths are distinct (no accidental duplication)', () => {
    const paths = [
      BLOB_CATALOG['organic-1'].path,
      BLOB_CATALOG['organic-2'].path,
      BLOB_CATALOG['organic-3'].path,
      BLOB_CATALOG['organic-4'].path,
      BLOB_CATALOG['organic-5'].path,
    ];
    const unique = new Set(paths);
    expect(unique.size).toBe(5);
  });

  it('organic paths have pairwise-distinct numeric token sequences (I4 proxy for visual distinctness)', () => {
    // Proxy: no two curated organic shapes should have IDENTICAL numeric
    // coordinate sequences, only different command letters. Catches the
    // "copied organic-1 and only changed command letters" mistake.
    const organicNumbers: Array<[string, number[]]> = (['organic-1', 'organic-2', 'organic-3', 'organic-4', 'organic-5'] as const)
      .map((n) => [n, extractNumbers(BLOB_CATALOG[n].path)]);
    for (let i = 0; i < organicNumbers.length; i++) {
      for (let j = i + 1; j < organicNumbers.length; j++) {
        const [aName, a] = organicNumbers[i];
        const [bName, b] = organicNumbers[j];
        const sameLength = a.length === b.length;
        const sameSequence = sameLength && a.every((v, k) => v === b[k]);
        expect(
          sameSequence,
          `${aName} and ${bName} have identical numeric coordinate sequences`,
        ).toBe(false);
      }
    }
  });

  it('circle path differs from every organic path', () => {
    const circle = BLOB_CATALOG.circle.path;
    for (const name of ['organic-1', 'organic-2', 'organic-3', 'organic-4', 'organic-5'] as const) {
      expect(circle).not.toBe(BLOB_CATALOG[name].path);
    }
  });

  it('circle path uses arc (A|a) commands (characterizes a circle)', () => {
    expect(BLOB_CATALOG.circle.path).toMatch(/[Aa]/);
  });

  it('entries freeze their name invariant (name === map key)', () => {
    for (const [key, def] of Object.entries(BLOB_CATALOG)) {
      expect(def.name).toBe(key);
    }
  });

  it('CuratedBlobName type alias matches the catalog key set (type-level sanity)', () => {
    // Runtime proxy: every CURATED_NAMES entry is a key of BLOB_CATALOG.
    // If the type alias drifts from the catalog, TypeScript catches it at
    // the CURATED_NAMES declaration site above.
    for (const name of CURATED_NAMES) {
      expect(name in BLOB_CATALOG).toBe(true);
    }
  });

  it('BlobShapeName union contains all catalog names + custom-svg (exhaustiveness)', () => {
    // Compile-time: assign each curated name to BlobShapeName to prove
    // inclusion. The `custom-svg` literal is the known-extra member.
    const allNames: BlobShapeName[] = [
      ...CURATED_NAMES,
      'custom-svg',
    ];
    expect(allNames).toHaveLength(7);
  });
});
