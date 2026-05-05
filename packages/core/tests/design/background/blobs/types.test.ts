import { describe, it, expect } from 'vitest';
import type {
  BlobShapeName,
  CuratedBlobName,
  BlobShapeDef,
  BlobPreset,
  BlobMotionPreset,
  BlobMotion,
  BlobInstance,
  BlobV2Config,
  BlobRenderStyle,
  BlobSpec,
} from '../../../../src/design/background/blobs/types.js';
import { BLOB_CATALOG } from '../../../../src/design/background/blobs/catalog.js';

// Compile-time contract tests — if these files don't compile, the type
// surface shifted. Runtime assertions serve as a smoke sanity check.

describe('Blob v2 types — compile-time contract', () => {
  it('BlobShapeName accepts all 5 organic + circle + custom-svg', () => {
    const names: BlobShapeName[] = [
      'organic-1', 'organic-2', 'organic-3', 'organic-4', 'organic-5',
      'circle', 'custom-svg',
    ];
    expect(names).toHaveLength(7);
  });

  it('CuratedBlobName excludes custom-svg', () => {
    const curated: CuratedBlobName[] = [
      'organic-1', 'organic-2', 'organic-3', 'organic-4', 'organic-5', 'circle',
    ];
    // @ts-expect-error — 'custom-svg' must not be assignable to CuratedBlobName
    const invalid: CuratedBlobName = 'custom-svg';
    void invalid;
    expect(curated).toHaveLength(6);
  });

  it('BlobShapeDef shape from catalog satisfies the type', () => {
    const def: BlobShapeDef = BLOB_CATALOG['organic-1'];
    expect(def).toMatchObject({
      name: 'organic-1',
      viewBox: expect.any(String),
      path: expect.any(String),
    });
  });

  it('BlobPreset accepts the three curated presets', () => {
    const presets: BlobPreset[] = ['organic-duo', 'organic-trio', 'circle-pair'];
    expect(presets).toHaveLength(3);
  });

  it('BlobMotionPreset accepts drift variants + static', () => {
    const presets: BlobMotionPreset[] = [
      'drift-gentle', 'drift-fluid', 'drift-snappy', 'static',
    ];
    expect(presets).toHaveLength(4);
  });

  it('BlobMotion dimensions are independently optional', () => {
    const driftOnly: BlobMotion = {
      drift: { duration: '28s', range: { x: 8, y: 5 } },
    };
    const rotateOnly: BlobMotion = {
      rotate: { duration: '80s', from: '-15deg', to: '12deg' },
    };
    const scaleOnly: BlobMotion = {
      scale: { duration: '20s', from: 1, to: 1.04 },
    };
    const allThree: BlobMotion = { ...driftOnly, ...rotateOnly, ...scaleOnly };
    expect(driftOnly.drift).toBeDefined();
    expect(rotateOnly.rotate).toBeDefined();
    expect(scaleOnly.scale).toBeDefined();
    expect(Object.keys(allThree)).toEqual(['drift', 'rotate', 'scale']);
  });

  it('BlobInstance requires shape + position + size + color; path/viewBox conditional on custom-svg', () => {
    const curatedInstance: BlobInstance = {
      shape: 'organic-1',
      position: { x: '10%', y: '20%' },
      size: { width: '420px', height: '360px' },
      color: 'primary',
    };
    const customSvgInstance: BlobInstance = {
      shape: 'custom-svg',
      path: 'M0,0 L100,0 L50,100 Z',
      viewBox: '0 0 100 100',
      position: { x: '0', y: '0' },
      size: { width: '100px', height: '100px' },
      color: '#ff0000',
    };
    expect(curatedInstance.shape).toBe('organic-1');
    expect(customSvgInstance.path).toBeDefined();
    expect(customSvgInstance.viewBox).toBeDefined();
  });

  it('BlobV2Config supports both preset form and blobs[] form', () => {
    const presetForm: BlobV2Config = {
      preset: 'organic-duo',
      palette: ['primary', 'accent'],
      opacity: 0.35,
      motion: 'drift-gentle',
    };
    const explicitForm: BlobV2Config = {
      blobs: [
        {
          shape: 'circle',
          position: { x: '0', y: '0' },
          size: { width: '100px', height: '100px' },
          color: '#abc',
        },
      ],
    };
    expect(presetForm.preset).toBe('organic-duo');
    expect(explicitForm.blobs).toHaveLength(1);
  });

  it('BlobV2Config ambiguous { preset + blobs } combination type-checks — precedence handled by resolver (design choice)', () => {
    // Documents the deliberate runtime-over-type discipline. A discriminated
    // union would reject this, but JSON specs lose ergonomics.
    // resolveBlobLayer (Task 7/8) prefers preset and warns in dev.
    const ambiguous: BlobV2Config = {
      preset: 'organic-duo',
      blobs: [{
        shape: 'circle',
        position: { x: '0', y: '0' },
        size: { width: '100px', height: '100px' },
        color: '#abc',
      }],
    };
    expect(ambiguous.preset).toBe('organic-duo');
    expect(ambiguous.blobs).toHaveLength(1);
  });

  it('palette literal autocomplete preserved via (string & {}) branding (I1)', () => {
    // Without the branding, `Array<'primary' | 'accent' | string>` collapses
    // to `string[]` and autocomplete loses the literals. The branded type
    // keeps them. Runtime proxy: assigning literals + arbitrary strings works.
    const cfg: BlobV2Config = {
      preset: 'organic-duo',
      palette: ['primary', 'accent', '#6366f1', 'rgba(0,0,0,0.5)'],
    };
    expect(cfg.palette).toHaveLength(4);
  });

  it('BlobRenderStyle mandates resolved opacity + blur (no optional)', () => {
    const style: BlobRenderStyle = {
      position: { x: '0', y: '0' },
      size: { width: '100px', height: '100px' },
      color: '#abc',
      opacity: 1, // REQUIRED — post-resolution, no undefined
      blur: 0, // REQUIRED — post-resolution
    };
    expect(style.opacity).toBe(1);
    expect(style.blur).toBe(0);
  });

  it('BlobSpec pairs shape + style + animations (nullable)', () => {
    const spec: BlobSpec = {
      shape: BLOB_CATALOG['organic-1'],
      style: {
        position: { x: '0', y: '0' },
        size: { width: '100px', height: '100px' },
        color: '#6366f1',
        opacity: 1,
        blur: 0,
      },
      animations: null, // no motion → null
    };
    expect(spec.animations).toBeNull();
  });
});
