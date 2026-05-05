import { describe, it, expect } from 'vitest';
import { resolveBlobLayer } from '../../../../src/design/background/blobs/resolver.js';
import { BLOB_CATALOG } from '../../../../src/design/background/blobs/catalog.js';

const palette = { primary: '#6366f1', accent: '#ec4899' };

describe('resolveBlobLayer — explicit blobs[] form', () => {
  describe('happy path', () => {
    it('resolves a single curated blob with all fields defaulted', () => {
      const result = resolveBlobLayer(
        {
          blobs: [
            {
              shape: 'organic-1',
              position: { x: '10%', y: '20%' },
              size: { width: '420px', height: '360px' },
              color: 'primary',
            },
          ],
        },
        palette,
      );

      expect(result).toHaveLength(1);
      const spec = result[0];
      // Shape comes from the catalog
      expect(spec.shape).toEqual(BLOB_CATALOG['organic-1']);
      // Color keyword resolved to hex
      expect(spec.style.color).toBe('#6366f1');
      // Defaults applied
      expect(spec.style.opacity).toBe(1);
      expect(spec.style.blur).toBe(0);
      // Position + size preserved verbatim
      expect(spec.style.position).toEqual({ x: '10%', y: '20%' });
      expect(spec.style.size).toEqual({ width: '420px', height: '360px' });
      // No motion → null animations
      expect(spec.animations).toBeNull();
    });

    it('resolves multiple blobs independently', () => {
      const result = resolveBlobLayer(
        {
          blobs: [
            {
              shape: 'organic-1',
              position: { x: '10%', y: '20%' },
              size: { width: '300px', height: '300px' },
              color: 'primary',
            },
            {
              shape: 'circle',
              position: { x: '60%', y: '70%' },
              size: { width: '200px', height: '200px' },
              color: 'accent',
              opacity: 0.5,
              blur: 40,
            },
          ],
        },
        palette,
      );
      expect(result).toHaveLength(2);
      expect(result[0].shape.name).toBe('organic-1');
      expect(result[0].style.color).toBe('#6366f1');
      expect(result[1].shape.name).toBe('circle');
      expect(result[1].style.color).toBe('#ec4899');
      expect(result[1].style.opacity).toBe(0.5);
      expect(result[1].style.blur).toBe(40);
    });

    it('passes rotation through when provided', () => {
      const result = resolveBlobLayer(
        {
          blobs: [
            {
              shape: 'organic-2',
              position: { x: '0', y: '0' },
              size: { width: '100px', height: '100px' },
              color: 'primary',
              rotation: '-15deg',
            },
          ],
        },
        palette,
      );
      expect(result[0].style.rotation).toBe('-15deg');
    });

    it('leaves rotation undefined when not provided', () => {
      const result = resolveBlobLayer(
        {
          blobs: [
            {
              shape: 'circle',
              position: { x: '0', y: '0' },
              size: { width: '100px', height: '100px' },
              color: 'primary',
            },
          ],
        },
        palette,
      );
      expect(result[0].style.rotation).toBeUndefined();
    });
  });

  describe('color resolution', () => {
    it('palette keyword "primary" resolves to palette.primary', () => {
      const result = resolveBlobLayer(
        {
          blobs: [
            {
              shape: 'circle',
              position: { x: '0', y: '0' },
              size: { width: '100px', height: '100px' },
              color: 'primary',
            },
          ],
        },
        palette,
      );
      expect(result[0].style.color).toBe('#6366f1');
    });

    it('palette keyword "accent" resolves to palette.accent', () => {
      const result = resolveBlobLayer(
        {
          blobs: [
            {
              shape: 'circle',
              position: { x: '0', y: '0' },
              size: { width: '100px', height: '100px' },
              color: 'accent',
            },
          ],
        },
        palette,
      );
      expect(result[0].style.color).toBe('#ec4899');
    });

    it('hex string passes through unchanged', () => {
      const result = resolveBlobLayer(
        {
          blobs: [
            {
              shape: 'circle',
              position: { x: '0', y: '0' },
              size: { width: '100px', height: '100px' },
              color: '#abcdef',
            },
          ],
        },
        palette,
      );
      expect(result[0].style.color).toBe('#abcdef');
    });

    it('rgba string passes through unchanged', () => {
      const result = resolveBlobLayer(
        {
          blobs: [
            {
              shape: 'circle',
              position: { x: '0', y: '0' },
              size: { width: '100px', height: '100px' },
              color: 'rgba(0, 0, 0, 0.5)',
            },
          ],
        },
        palette,
      );
      expect(result[0].style.color).toBe('rgba(0, 0, 0, 0.5)');
    });
  });

  describe('custom-svg handling', () => {
    it('resolves custom-svg with consumer-provided path + viewBox', () => {
      const result = resolveBlobLayer(
        {
          blobs: [
            {
              shape: 'custom-svg',
              path: 'M0,0 L100,0 L50,100 Z',
              viewBox: '0 0 100 100',
              position: { x: '0', y: '0' },
              size: { width: '100px', height: '100px' },
              color: '#ff0000',
            },
          ],
        },
        palette,
      );
      expect(result[0].shape.name).toBe('custom-svg');
      expect(result[0].shape.path).toBe('M0,0 L100,0 L50,100 Z');
      expect(result[0].shape.viewBox).toBe('0 0 100 100');
    });

    it('throws in dev when custom-svg is missing path', () => {
      expect(() =>
        resolveBlobLayer(
          {
            blobs: [
              {
                shape: 'custom-svg',
                // missing path
                viewBox: '0 0 100 100',
                position: { x: '0', y: '0' },
                size: { width: '100px', height: '100px' },
                color: '#ff0000',
              },
            ],
          },
          palette,
        ),
      ).toThrow(/custom-svg[\s\S]*path/i);
    });

    it('throws in dev when custom-svg is missing viewBox', () => {
      expect(() =>
        resolveBlobLayer(
          {
            blobs: [
              {
                shape: 'custom-svg',
                path: 'M0,0 L100,0 L50,100 Z',
                // missing viewBox
                position: { x: '0', y: '0' },
                size: { width: '100px', height: '100px' },
                color: '#ff0000',
              },
            ],
          },
          palette,
        ),
      ).toThrow(/custom-svg[\s\S]*viewBox/i);
    });
  });

  describe('empty and degenerate inputs', () => {
    it('empty config (no preset, no blobs[]) returns empty array', () => {
      const result = resolveBlobLayer({}, palette);
      expect(result).toEqual([]);
    });

    it('empty blobs[] returns empty array', () => {
      const result = resolveBlobLayer({ blobs: [] }, palette);
      expect(result).toEqual([]);
    });
  });

  describe('opacity + blur defaulting', () => {
    it('opacity: 0 is preserved (not treated as missing)', () => {
      const result = resolveBlobLayer(
        {
          blobs: [
            {
              shape: 'circle',
              position: { x: '0', y: '0' },
              size: { width: '100px', height: '100px' },
              color: 'primary',
              opacity: 0,
            },
          ],
        },
        palette,
      );
      expect(result[0].style.opacity).toBe(0);
    });

    it('blur: 0 is preserved (not treated as missing)', () => {
      const result = resolveBlobLayer(
        {
          blobs: [
            {
              shape: 'circle',
              position: { x: '0', y: '0' },
              size: { width: '100px', height: '100px' },
              color: 'primary',
              blur: 0,
            },
          ],
        },
        palette,
      );
      expect(result[0].style.blur).toBe(0);
    });
  });

  // Motion conversion (drift/rotate/scale → ElementAnimations.ambient) is
  // exhaustively covered in motion-conversion.test.ts as of Task 8. The Task
  // 7 pinning tests that previously lived here have been removed — they
  // asserted the stub `animations: null` state that Task 8 was explicitly
  // designed to replace.

  describe('custom-svg empty-string edge (M3 — not just undefined)', () => {
    it('throws in dev when custom-svg path is empty string ""', () => {
      expect(() =>
        resolveBlobLayer(
          {
            blobs: [
              {
                shape: 'custom-svg',
                path: '',
                viewBox: '0 0 100 100',
                position: { x: '0', y: '0' },
                size: { width: '100px', height: '100px' },
                color: '#ff0000',
              },
            ],
          },
          palette,
        ),
      ).toThrow(/custom-svg[\s\S]*path/i);
    });

    it('throws in dev when custom-svg viewBox is empty string ""', () => {
      expect(() =>
        resolveBlobLayer(
          {
            blobs: [
              {
                shape: 'custom-svg',
                path: 'M0,0 L100,0 L50,100 Z',
                viewBox: '',
                position: { x: '0', y: '0' },
                size: { width: '100px', height: '100px' },
                color: '#ff0000',
              },
            ],
          },
          palette,
        ),
      ).toThrow(/custom-svg[\s\S]*viewBox/i);
    });
  });

  describe('ambiguous { preset + blobs }', () => {
    // Preset registry + motion hydration are covered in motion-conversion.test.ts.
    // This describe keeps only the ambiguity-resolution assertion here, since
    // it describes a cross-form contract.
    it('both set → preset wins; blobs[] is ignored (no circle-shaped result from blobs[])', () => {
      const result = resolveBlobLayer(
        {
          preset: 'organic-duo',
          blobs: [
            {
              shape: 'circle',
              position: { x: '0', y: '0' },
              size: { width: '100px', height: '100px' },
              color: 'primary',
            },
          ],
        },
        palette,
      );
      // organic-duo seeds are organic-1 + organic-3 — neither is 'circle'.
      // Asserting the shape-name distribution is a sharper contract than a
      // length check because it would also catch a hypothetical regression
      // where blobs[] was concatenated onto preset output.
      expect(result).toHaveLength(2);
      expect(result.map((s) => s.shape.name)).toEqual(['organic-1', 'organic-3']);
    });
  });
});
