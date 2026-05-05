import { describe, it, expect } from 'vitest';
import {
  validateAnimationCaps,
  validateBackgroundCaps,
} from '../../../src/design/animation/validator.js';
import type { ElementAnimations } from '../../../src/design/animation/types.js';
import type { BlobInstance } from '../../../src/design/background/blobs/types.js';

describe('validateAnimationCaps', () => {
  it('empty animations → no warnings/errors', () => {
    const result = validateAnimationCaps({});
    expect(result.warnings).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it('single animation per trigger → ok', () => {
    const result = validateAnimationCaps({
      mount: { recipe: 'fade' },
      hover: { recipe: 'lift' },
    });
    expect(result.warnings).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it('3 animations in array → soft-cap warning', () => {
    const animations: ElementAnimations = {
      mount: [
        { recipe: 'fade' },
        { recipe: 'scale-in' },
        { recipe: 'fade-up' },
      ],
    };
    const result = validateAnimationCaps(animations);
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0]).toMatch(/mount.*3.*soft/i);
    expect(result.errors).toEqual([]);
  });

  it('6 animations in array → hard-cap error', () => {
    const animations: ElementAnimations = {
      mount: Array.from({ length: 6 }, () => ({ recipe: 'fade' })),
    };
    const result = validateAnimationCaps(animations);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toMatch(/mount.*6.*hard/i);
  });

  it('5 triggers with animations → soft-cap warning', () => {
    const animations: ElementAnimations = {
      mount: { recipe: 'fade' },
      hover: { recipe: 'lift' },
      focus: { recipe: 'fade' },
      active: { recipe: 'pop' },
      ambient: { recipe: 'breathe-subtle' },
    };
    const result = validateAnimationCaps(animations);
    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
    expect(
      result.warnings.some(
        (w) => w.includes('triggers') && w.includes('5') && w.includes('soft'),
      ),
    ).toBe(true);
  });

  it('7 triggers filled → hard-cap error', () => {
    const animations: ElementAnimations = {
      mount: { recipe: 'fade' },
      unmount: { recipe: 'fade-down' },
      hover: { recipe: 'lift' },
      focus: { recipe: 'fade' },
      active: { recipe: 'pop' },
      ambient: { recipe: 'breathe-subtle' },
      stateChange: { watch: '/x', duration: 200 },
    };
    const result = validateAnimationCaps(animations);
    expect(
      result.errors.some(
        (e) => e.includes('triggers') && e.includes('7') && e.includes('hard'),
      ),
    ).toBe(true);
  });

  it('null trigger is not counted', () => {
    const animations: ElementAnimations = {
      mount: { recipe: 'fade' },
      hover: null,
    };
    const result = validateAnimationCaps(animations);
    expect(result.warnings).toEqual([]);
  });

  it('web-only recipe (glow) triggers a discoverability warning', () => {
    const animations: ElementAnimations = {
      hover: { recipe: 'glow' },
    };
    const result = validateAnimationCaps(animations);
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0]).toContain("web-only recipe 'glow'");
    expect(result.warnings[0]).toContain('React Native');
    expect(result.errors).toEqual([]);
  });

  it('web-only recipe inside an array is still flagged', () => {
    const animations: ElementAnimations = {
      mount: [{ recipe: 'fade' }, { recipe: 'glow' }],
    };
    const result = validateAnimationCaps(animations);
    expect(result.warnings.some((w) => w.includes("web-only recipe 'glow'"))).toBe(true);
  });

  it('cross-platform recipe does NOT trigger web-only warning', () => {
    const animations: ElementAnimations = {
      mount: { recipe: 'fade-up' },
      hover: { recipe: 'lift' },
    };
    const result = validateAnimationCaps(animations);
    expect(result.warnings).toEqual([]);
  });

  it('inline animation (no recipe field) is never flagged as web-only', () => {
    const animations: ElementAnimations = {
      mount: {
        keyframes: [
          { at: '0%', opacity: 0 },
          { at: '100%', opacity: 1 },
        ],
        duration: 200,
        easing: 'ease-out',
      },
    };
    const result = validateAnimationCaps(animations);
    expect(result.warnings).toEqual([]);
  });
});

// Helper — minimal BlobInstance builder for cap tests. Only cap-relevant
// fields vary across the tests; position/size/color defaults are inert.
function blob(overrides: Partial<BlobInstance> = {}): BlobInstance {
  return {
    shape: 'circle',
    position: { x: '0', y: '0' },
    size: { width: '100px', height: '100px' },
    color: 'primary',
    ...overrides,
  };
}

describe('validateBackgroundCaps — blob count', () => {
  it('empty input → no warnings/errors', () => {
    const result = validateBackgroundCaps({});
    expect(result.warnings).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it('8 blobs (at soft cap) → no warning', () => {
    const result = validateBackgroundCaps({
      blobs: Array.from({ length: 8 }, () => blob()),
    });
    expect(result.warnings.filter((w) => /blobs per background/i.test(w))).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('9 blobs → soft-cap warning (over soft, under hard)', () => {
    const result = validateBackgroundCaps({
      blobs: Array.from({ length: 9 }, () => blob()),
    });
    expect(result.warnings.some((w) => /blobs per background/i.test(w))).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('16 blobs (at hard cap) → warning but no error', () => {
    const result = validateBackgroundCaps({
      blobs: Array.from({ length: 16 }, () => blob()),
    });
    expect(result.warnings.some((w) => /blobs per background/i.test(w))).toBe(true);
    expect(result.errors.filter((e) => /blobs per background/i.test(e))).toHaveLength(0);
  });

  it('17 blobs → hard-cap error', () => {
    const result = validateBackgroundCaps({
      blobs: Array.from({ length: 17 }, () => blob()),
    });
    expect(result.errors.some((e) => /blobs per background/i.test(e))).toBe(true);
  });
});

describe('validateBackgroundCaps — layer count', () => {
  it('6 layers (at soft cap) → no warning', () => {
    const result = validateBackgroundCaps({
      layers: Array.from({ length: 6 }, () => ({ type: 'solid' })),
    });
    expect(result.warnings.filter((w) => /layers per background/i.test(w))).toHaveLength(0);
  });

  it('7 layers → soft-cap warning', () => {
    const result = validateBackgroundCaps({
      layers: Array.from({ length: 7 }, () => ({ type: 'solid' })),
    });
    expect(result.warnings.some((w) => /layers per background/i.test(w))).toBe(true);
  });

  it('11 layers → hard-cap error', () => {
    const result = validateBackgroundCaps({
      layers: Array.from({ length: 11 }, () => ({ type: 'solid' })),
    });
    expect(result.errors.some((e) => /layers per background/i.test(e))).toBe(true);
  });
});

describe('validateBackgroundCaps — custom-svg path length', () => {
  it('custom-svg with 400-char path → no warning', () => {
    const result = validateBackgroundCaps({
      blobs: [
        blob({
          shape: 'custom-svg',
          path: 'M0,0 '.repeat(80), // 400 chars
          viewBox: '0 0 100 100',
        }),
      ],
    });
    expect(result.warnings.filter((w) => /custom-svg path length/i.test(w))).toHaveLength(0);
  });

  it('custom-svg with 600-char path → soft-cap warning', () => {
    const result = validateBackgroundCaps({
      blobs: [
        blob({
          shape: 'custom-svg',
          path: 'M0,0 '.repeat(120), // 600 chars
          viewBox: '0 0 100 100',
        }),
      ],
    });
    expect(result.warnings.some((w) => /custom-svg path length/i.test(w))).toBe(true);
  });

  it('custom-svg with 2050-char path → hard-cap error', () => {
    const result = validateBackgroundCaps({
      blobs: [
        blob({
          shape: 'custom-svg',
          path: 'M0,0 '.repeat(410), // 2050 chars
          viewBox: '0 0 100 100',
        }),
      ],
    });
    expect(result.errors.some((e) => /custom-svg path length/i.test(e))).toBe(true);
  });

  it('curated shape with long path string on blob.path is ignored (only custom-svg triggers length cap)', () => {
    const result = validateBackgroundCaps({
      blobs: [
        blob({
          shape: 'organic-1',
          // Curated shapes ignore the path field (it's not used); cap check is
          // only meaningful for custom-svg where consumer authored the path.
          path: 'M0,0 '.repeat(500),
        }),
      ],
    });
    expect(result.warnings.filter((w) => /custom-svg path length/i.test(w))).toHaveLength(0);
    expect(result.errors.filter((e) => /custom-svg path length/i.test(e))).toHaveLength(0);
  });

  it('custom-svg with missing path is silently skipped (resolver enforces presence, not validator)', () => {
    // Spec-time validator runs BEFORE resolver in `mythik validate`. If a
    // malformed spec (custom-svg without path) reaches the validator, we
    // should not crash — the downstream resolver throws in dev / warns in
    // prod. This test pins the non-crash contract.
    const result = validateBackgroundCaps({
      blobs: [blob({ shape: 'custom-svg' })], // path: undefined, viewBox: undefined
    });
    expect(result.warnings.filter((w) => /custom-svg path length/i.test(w))).toHaveLength(0);
    expect(result.errors.filter((e) => /custom-svg path length/i.test(e))).toHaveLength(0);
  });

  it('custom-svg with empty-string path does not warn (0 chars is under soft cap)', () => {
    const result = validateBackgroundCaps({
      blobs: [blob({ shape: 'custom-svg', path: '', viewBox: '0 0 100 100' })],
    });
    expect(result.warnings.filter((w) => /custom-svg path length/i.test(w))).toHaveLength(0);
    expect(result.errors.filter((e) => /custom-svg path length/i.test(e))).toHaveLength(0);
  });
});

describe('validateBackgroundCaps — motion dimensions per blob', () => {
  it('2 motion dimensions (at soft cap) → no warning', () => {
    const result = validateBackgroundCaps({
      blobs: [
        blob({
          motion: {
            drift: { duration: '28s', range: { x: 5, y: 5 } },
            rotate: { duration: '80s', from: '0deg', to: '360deg' },
          },
        }),
      ],
    });
    expect(result.warnings.filter((w) => /motion dimensions/i.test(w))).toHaveLength(0);
  });

  it('3 motion dimensions → soft-cap warning (at hard cap, still warn)', () => {
    const result = validateBackgroundCaps({
      blobs: [
        blob({
          motion: {
            drift: { duration: '28s', range: { x: 5, y: 5 } },
            rotate: { duration: '80s', from: '0deg', to: '360deg' },
            scale: { duration: '20s', from: 1, to: 1.05 },
          },
        }),
      ],
    });
    expect(result.warnings.some((w) => /motion dimensions/i.test(w))).toBe(true);
    // 3 is the hard cap — at 3 we warn but don't error; the hard-cap error
    // fires only for > 3. BlobMotion only has drift/rotate/scale so 3 is
    // actually the max — the hard cap is effectively unreachable via a
    // well-typed input. Kept for consistency with the soft/hard pattern
    // and as a sentinel for a future added dimension.
    expect(result.errors.filter((e) => /motion dimensions/i.test(e))).toHaveLength(0);
  });

  it('single motion dimension → no warning', () => {
    const result = validateBackgroundCaps({
      blobs: [
        blob({
          motion: { drift: { duration: '28s', range: { x: 5, y: 5 } } },
        }),
      ],
    });
    expect(result.warnings.filter((w) => /motion dimensions/i.test(w))).toHaveLength(0);
  });

  it('empty motion object → no warning', () => {
    const result = validateBackgroundCaps({
      blobs: [blob({ motion: {} })],
    });
    expect(result.warnings.filter((w) => /motion dimensions/i.test(w))).toHaveLength(0);
  });
});

describe('validateBackgroundCaps — composition', () => {
  it('violations across categories accumulate independently', () => {
    const result = validateBackgroundCaps({
      blobs: [
        ...Array.from({ length: 9 }, () => blob()), // 9 blobs → blob-count warn
        blob({
          shape: 'custom-svg',
          path: 'M0,0 '.repeat(120), // 600 chars → path-length warn
          viewBox: '0 0 100 100',
          motion: {
            drift: { duration: '28s', range: { x: 5, y: 5 } },
            rotate: { duration: '80s', from: '0deg', to: '360deg' },
            scale: { duration: '20s', from: 1, to: 1.05 },
          }, // 3 dims → motion-dims warn
        }),
      ],
      layers: Array.from({ length: 11 }, () => ({ type: 'solid' })), // 11 layers → layer error
    });
    expect(result.warnings.some((w) => /blobs per background/i.test(w))).toBe(true);
    expect(result.warnings.some((w) => /custom-svg path length/i.test(w))).toBe(true);
    expect(result.warnings.some((w) => /motion dimensions/i.test(w))).toBe(true);
    expect(result.errors.some((e) => /layers per background/i.test(e))).toBe(true);
  });
});
