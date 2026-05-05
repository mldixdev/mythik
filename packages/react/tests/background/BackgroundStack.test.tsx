import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { BackgroundStack } from '../../src/background/BackgroundStack.js';
import type { LayerBackground } from 'mythik';

describe('BackgroundStack', () => {
  it('renders nothing when background is undefined or empty', () => {
    const { container: c1 } = render(<BackgroundStack background={undefined} />);
    expect(c1.firstChild).toBeNull();
    const { container: c2 } = render(<BackgroundStack background={{}} />);
    expect(c2.firstChild).toBeNull();
  });

  it('renders solid color as single layer', () => {
    const bg: LayerBackground = { color: '#0a0a0a' };
    const { container } = render(<BackgroundStack background={bg} />);
    const div = container.querySelector('div[style*="background-color"]');
    expect(div).toBeTruthy();
  });

  it('renders multiple layers in array order', () => {
    const bg: LayerBackground = {
      color: '#fff',
      layers: [
        { type: 'gradient', kind: 'linear', stops: [{ color: '#000', at: '0%' }, { color: '#fff', at: '100%' }] },
        { type: 'pattern', kind: 'grid', spacing: 40 },
      ],
    };
    const { container } = render(<BackgroundStack background={bg} />);
    expect(container.querySelectorAll('div, svg').length).toBeGreaterThanOrEqual(3);
  });

  it('accepts LayerBackground by recipe string (resolves via BACKGROUND_RECIPES)', () => {
    const { container } = render(<BackgroundStack background="linear-aura" />);
    expect(container.querySelectorAll('div, svg').length).toBeGreaterThanOrEqual(3);
  });

  // Plan 3 Task 16 — verify end-to-end dispatch through BackgroundStack renders
  // the blobs stub when layers[] includes a blob layer and NO palette is
  // provided (fallback path, no tokens available). Task 18 wires BlobLayer for
  // the palette-present case — see "renders real BlobLayer…" test below.
  it('falls back to BackgroundLayer stub when blobs layer has no palette (emits dev-warn)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bg: LayerBackground = {
      color: '#0a0a0a',
      layers: [{ type: 'blobs', preset: 'organic-duo', palette: ['primary'] }],
    };
    const { container } = render(<BackgroundStack background={bg} />);
    const stub = container.querySelector('[data-sv-layer="blobs"]') as HTMLElement;
    expect(stub).toBeTruthy();
    // Stub path: single <div> with no nested <svg> (no palette means no BlobLayer mount).
    expect(stub.querySelector('svg')).toBeNull();
    // Task 18 review M3 — dev-warn fires so Task 20 misuse doesn't fail silently.
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toMatch(/blobs layer rendered without palette/);
    warn.mockRestore();
  });

  // Plan 3 Task 18 — when a palette is provided, the blobs layer mounts the
  // real BlobLayer component, which renders one <svg><path/></svg> per blob.
  // Distinct path from the stub above — pins the integration point where
  // MythikRenderer (Task 20) will thread tokens into the stack.
  it('renders real BlobLayer when palette is provided (Task 18 integration)', () => {
    const bg: LayerBackground = {
      color: '#0a0a0a',
      layers: [{ type: 'blobs', preset: 'organic-duo', palette: ['primary', 'accent'] }],
    };
    const palette = { primary: '#6366f1', accent: '#ec4899' };
    const { container } = render(<BackgroundStack background={bg} palette={palette} />);
    const wrapper = container.querySelector('[data-sv-layer="blobs"]') as HTMLElement;
    expect(wrapper).toBeTruthy();
    // BlobLayer mounts 2 SVG elements for organic-duo preset.
    const svgs = wrapper.querySelectorAll('svg');
    expect(svgs.length).toBe(2);
    // Palette rotates — first blob = primary, second = accent.
    const paths = wrapper.querySelectorAll('svg path');
    expect(paths[0].getAttribute('fill')).toBe('#6366f1');
    expect(paths[1].getAttribute('fill')).toBe('#ec4899');
  });

  // Plan 3 Task 18 — blobOpacity maps to BlobV2Config.opacity (per-blob fill
  // default), distinct from layer-container opacity on the wrapper div. Pins
  // the toBlobV2Config translation inside BackgroundStack.
  it('maps BlobsLayerConfig.blobOpacity to per-blob fill opacity', () => {
    const bg: LayerBackground = {
      color: '#0a0a0a',
      layers: [{
        type: 'blobs',
        preset: 'circle-pair',
        palette: ['primary'],
        blobOpacity: 0.3,        // per-blob fill default
        opacity: 0.8,            // layer-container opacity (LayerCommonProps)
      }],
    };
    const palette = { primary: '#6366f1', accent: '#ec4899' };
    const { container } = render(<BackgroundStack background={bg} palette={palette} />);
    const wrapper = container.querySelector('[data-sv-layer="blobs"]') as HTMLElement;
    // Layer-container opacity on wrapper.
    expect(wrapper.style.opacity).toBe('0.8');
    // Per-blob fill opacity on each <svg>.
    const svg = wrapper.querySelector('svg') as SVGSVGElement;
    expect(svg.getAttribute('opacity')).toBe('0.3');
  });

  // Plan 3 Task 18 review M5 — blendMode + zIndex routing on the blob
  // wrapper div. The lone conditional is `blendMode === 'normal' ? undefined :
  // blendMode` (matches BackgroundLayer.commonStyle). Pin both the normal-case
  // (omitted) and non-normal (passed through) paths.
  it('routes blendMode+zIndex from LayerCommonProps onto the blob wrapper', () => {
    const palette = { primary: '#6366f1', accent: '#ec4899' };

    const { container: c1 } = render(<BackgroundStack
      background={{ layers: [{ type: 'blobs', preset: 'organic-duo', blendMode: 'normal', zIndex: 3 }] }}
      palette={palette}
    />);
    const w1 = c1.querySelector('[data-sv-layer="blobs"]') as HTMLElement;
    // 'normal' collapses to undefined (omitted) to match BackgroundLayer semantics.
    expect(w1.style.mixBlendMode).toBe('');
    expect(w1.style.zIndex).toBe('3');

    const { container: c2 } = render(<BackgroundStack
      background={{ layers: [{ type: 'blobs', preset: 'organic-duo', blendMode: 'screen', zIndex: 7 }] }}
      palette={palette}
    />);
    const w2 = c2.querySelector('[data-sv-layer="blobs"]') as HTMLElement;
    expect(w2.style.mixBlendMode).toBe('screen');
    expect(w2.style.zIndex).toBe('7');
  });
});
