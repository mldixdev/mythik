// Task 8 — Blob motion → ElementAnimations.ambient conversion + preset path.
//
// These tests pin the contract that `resolveBlobLayer` converts each of the
// three motion dimensions (drift / rotate / scale) into an InlineAnimation on
// the `ambient` trigger, and that the preset-form entry point hydrates curated
// blob compositions from `BlobPreset` + `BlobMotionPreset` identifiers.

import { describe, it, expect, vi } from 'vitest';
import { resolveBlobLayer } from '../../../../src/design/background/blobs/resolver.js';
import type { InlineAnimation } from '../../../../src/design/animation/types.js';

const palette = { primary: '#6366f1', accent: '#ec4899' };

// Narrow `ambient` (AnimationRef | AnimationRef[] | null | undefined) to a
// single InlineAnimation. Keeps tests type-clean; the runtime contract is that
// motion conversion always emits InlineAnimation entries (never recipe refs).
function asInline(
  ambient: unknown,
  index = 0,
): InlineAnimation {
  const item = Array.isArray(ambient) ? ambient[index] : ambient;
  if (!item || typeof item !== 'object' || !('keyframes' in item)) {
    throw new Error(`expected ambient[${index}] to be an InlineAnimation`);
  }
  return item as InlineAnimation;
}

describe('blob motion → ElementAnimations.ambient', () => {
  it('drift becomes an ambient animation with translate keyframes', () => {
    const result = resolveBlobLayer(
      {
        blobs: [
          {
            shape: 'organic-1',
            position: { x: '0', y: '0' },
            size: { width: '100px', height: '100px' },
            color: 'primary',
            motion: {
              drift: { duration: '28s', range: { x: 8, y: 5 }, easing: 'ease-in-out' },
            },
          },
        ],
      },
      palette,
    );

    const ambient = result[0].animations?.ambient;
    expect(ambient).toBeDefined();
    const first = asInline(ambient);
    expect(first.keyframes).toHaveLength(3);
    expect(first.keyframes[0].at).toBe('0%');
    expect(first.keyframes[0].transform).toEqual({ translateX: 0, translateY: 0 });
    expect(first.keyframes[1].at).toBe('50%');
    expect(first.keyframes[1].transform).toEqual({ translateX: 8, translateY: 5 });
    expect(first.keyframes[2].at).toBe('100%');
    expect(first.keyframes[2].transform).toEqual({ translateX: 0, translateY: 0 });
    expect(first.duration).toBe('28s');
    expect(first.easing).toBe('ease-in-out');
    expect(first.direction).toBe('alternate');
    expect(first.iterations).toBe('infinite');
  });

  it('drift uses default easing "ease-in-out" when not specified', () => {
    const result = resolveBlobLayer(
      {
        blobs: [
          {
            shape: 'organic-1',
            position: { x: '0', y: '0' },
            size: { width: '100px', height: '100px' },
            color: 'primary',
            motion: { drift: { duration: '28s', range: { x: 4, y: 3 } } },
          },
        ],
      },
      palette,
    );
    const first = asInline(result[0].animations?.ambient);
    expect(first.easing).toBe('ease-in-out');
  });

  it('rotate becomes an ambient animation with rotate keyframes', () => {
    const result = resolveBlobLayer(
      {
        blobs: [
          {
            shape: 'organic-1',
            position: { x: '0', y: '0' },
            size: { width: '100px', height: '100px' },
            color: 'primary',
            motion: {
              rotate: { duration: '80s', from: '-15deg', to: '12deg' },
            },
          },
        ],
      },
      palette,
    );

    const first = asInline(result[0].animations?.ambient);
    expect(first.keyframes).toHaveLength(2);
    expect(first.keyframes[0].transform).toEqual({ rotate: '-15deg' });
    expect(first.keyframes[1].transform).toEqual({ rotate: '12deg' });
    expect(first.duration).toBe('80s');
    expect(first.direction).toBe('alternate');
  });

  it('scale becomes an ambient animation with scale keyframes', () => {
    const result = resolveBlobLayer(
      {
        blobs: [
          {
            shape: 'organic-1',
            position: { x: '0', y: '0' },
            size: { width: '100px', height: '100px' },
            color: 'primary',
            motion: { scale: { duration: '20s', from: 1, to: 1.04 } },
          },
        ],
      },
      palette,
    );

    const first = asInline(result[0].animations?.ambient);
    expect(first.keyframes).toHaveLength(2);
    expect(first.keyframes[0].transform).toEqual({ scale: 1 });
    expect(first.keyframes[1].transform).toEqual({ scale: 1.04 });
    expect(first.duration).toBe('20s');
  });

  it('drift + rotate + scale produces 3 ambient animations as an array', () => {
    const result = resolveBlobLayer(
      {
        blobs: [
          {
            shape: 'organic-1',
            position: { x: '0', y: '0' },
            size: { width: '100px', height: '100px' },
            color: 'primary',
            motion: {
              drift: { duration: '28s', range: { x: 8, y: 5 } },
              rotate: { duration: '80s', from: '-15deg', to: '12deg' },
              scale: { duration: '20s', from: 1, to: 1.04 },
            },
          },
        ],
      },
      palette,
    );

    const ambient = result[0].animations?.ambient;
    expect(Array.isArray(ambient)).toBe(true);
    expect((ambient as unknown[]).length).toBe(3);
    // Emission order: drift, rotate, scale (matches spec "single pipeline")
    expect(asInline(ambient, 0).keyframes[0].transform).toEqual({ translateX: 0, translateY: 0 });
    expect(asInline(ambient, 1).keyframes[0].transform).toEqual({ rotate: '-15deg' });
    expect(asInline(ambient, 2).keyframes[0].transform).toEqual({ scale: 1 });
  });

  it('single-dimension motion returns a scalar (not an array) for ergonomics', () => {
    const result = resolveBlobLayer(
      {
        blobs: [
          {
            shape: 'organic-1',
            position: { x: '0', y: '0' },
            size: { width: '100px', height: '100px' },
            color: 'primary',
            motion: { drift: { duration: '28s', range: { x: 4, y: 3 } } },
          },
        ],
      },
      palette,
    );

    expect(Array.isArray(result[0].animations?.ambient)).toBe(false);
  });

  it('no motion → animations is null', () => {
    const result = resolveBlobLayer(
      {
        blobs: [
          {
            shape: 'organic-1',
            position: { x: '0', y: '0' },
            size: { width: '100px', height: '100px' },
            color: 'primary',
          },
        ],
      },
      palette,
    );

    expect(result[0].animations).toBeNull();
  });

  it('empty motion object → animations is null (no dimensions set)', () => {
    const result = resolveBlobLayer(
      {
        blobs: [
          {
            shape: 'organic-1',
            position: { x: '0', y: '0' },
            size: { width: '100px', height: '100px' },
            color: 'primary',
            motion: {},
          },
        ],
      },
      palette,
    );

    expect(result[0].animations).toBeNull();
  });
});

describe('resolveBlobLayer — preset form', () => {
  it('preset "organic-duo" produces 2 blobs', () => {
    const result = resolveBlobLayer(
      {
        preset: 'organic-duo',
        palette: ['primary', 'accent'],
        opacity: 0.35,
        motion: 'drift-gentle',
      },
      palette,
    );

    expect(result).toHaveLength(2);
    expect(result[0].style.color).toBe('#6366f1');
    expect(result[1].style.color).toBe('#ec4899');
    expect(result[0].style.opacity).toBe(0.35);
    expect(result[1].style.opacity).toBe(0.35);
    // drift-gentle → drift motion → ambient present (single-dimension scalar form)
    expect(result[0].animations?.ambient).toBeDefined();
    expect(result[1].animations?.ambient).toBeDefined();
    expect(asInline(result[0].animations?.ambient).duration).toBe('28s');
  });

  it('preset "organic-trio" produces 3 blobs', () => {
    const result = resolveBlobLayer(
      {
        preset: 'organic-trio',
        palette: ['primary', 'accent'],
      },
      palette,
    );
    expect(result).toHaveLength(3);
    // Palette cycles: primary, accent, primary
    expect(result[0].style.color).toBe('#6366f1');
    expect(result[1].style.color).toBe('#ec4899');
    expect(result[2].style.color).toBe('#6366f1');
  });

  it('preset "circle-pair" uses circle shapes', () => {
    const result = resolveBlobLayer(
      {
        preset: 'circle-pair',
        palette: ['primary'],
      },
      palette,
    );

    expect(result).toHaveLength(2);
    expect(result[0].shape.name).toBe('circle');
    expect(result[1].shape.name).toBe('circle');
  });

  it('preset defaults to ["primary"] palette when not specified (cycles accordingly)', () => {
    const result = resolveBlobLayer({ preset: 'organic-duo' }, palette);
    expect(result).toHaveLength(2);
    expect(result[0].style.color).toBe('#6366f1');
    expect(result[1].style.color).toBe('#6366f1');
  });

  it('preset with motion "static" → ambient animations null', () => {
    const result = resolveBlobLayer(
      {
        preset: 'organic-duo',
        motion: 'static',
      },
      palette,
    );

    expect(result[0].animations).toBeNull();
    expect(result[1].animations).toBeNull();
  });

  it('preset with no motion field → ambient animations null', () => {
    const result = resolveBlobLayer(
      { preset: 'organic-duo', palette: ['primary'] },
      palette,
    );
    expect(result[0].animations).toBeNull();
  });

  it('motion preset "drift-fluid" hydrates a faster, wider drift', () => {
    const result = resolveBlobLayer(
      { preset: 'circle-pair', motion: 'drift-fluid' },
      palette,
    );
    const first = asInline(result[0].animations?.ambient);
    expect(first.duration).toBe('20s');
  });

  it('motion preset "drift-snappy" uses linear easing', () => {
    const result = resolveBlobLayer(
      { preset: 'circle-pair', motion: 'drift-snappy' },
      palette,
    );
    const first = asInline(result[0].animations?.ambient);
    expect(first.duration).toBe('14s');
    expect(first.easing).toBe('linear');
  });

  it('preset-form blobs preserve explicit opacity 0', () => {
    const result = resolveBlobLayer(
      { preset: 'circle-pair', opacity: 0 },
      palette,
    );
    expect(result[0].style.opacity).toBe(0);
  });

  it('preset-form blobs default opacity to 1 when not specified', () => {
    const result = resolveBlobLayer({ preset: 'circle-pair' }, palette);
    expect(result[0].style.opacity).toBe(1);
  });

  it('empty palette array falls back to primary + emits dev warn (M1)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const result = resolveBlobLayer(
      { preset: 'organic-duo', palette: [] },
      palette,
    );
    expect(result).toHaveLength(2);
    expect(result[0].style.color).toBe('#6366f1');
    expect(result[1].style.color).toBe('#6366f1');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringMatching(/palette.*empty array/i),
    );
    warnSpy.mockRestore();
  });
});
