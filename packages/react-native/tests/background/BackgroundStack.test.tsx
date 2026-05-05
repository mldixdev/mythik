import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BackgroundStack } from '../../src/background/BackgroundStack.js';
import type { LayerBackground } from 'mythik';

describe('BackgroundStack (RN)', () => {
  it('returns null for empty background', () => {
    const { container } = render(<BackgroundStack background={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders solid color', () => {
    const bg: LayerBackground = { color: '#0a0a0a' };
    const { container } = render(<BackgroundStack background={bg} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('resolves recipe name via BACKGROUND_RECIPES', () => {
    const { container } = render(<BackgroundStack background="linear-aura" />);
    expect(container.firstChild).toBeTruthy();
  });

  // Plan 3 Task 17 — RN parity for blob-layer dispatch chain without palette.
  // Falls through to BackgroundLayer stub (plan 3 Task 16 fix f2fc6e5 added
  // the stub; Task 19 wired the palette-present path to real BlobLayer).
  it('falls back to BackgroundLayer stub when blobs layer has no palette (emits dev-warn)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bg: LayerBackground = {
      color: '#0a0a0a',
      layers: [{ type: 'blobs', preset: 'organic-duo', palette: ['primary'] }],
    };
    const { container } = render(<BackgroundStack background={bg} />);
    const stub = container.querySelector('[data-testid="sv-layer-blobs"]');
    expect(stub).toBeTruthy();
    // No nested Svg (palette absent means no BlobLayer mount).
    expect(stub?.querySelector('[data-testid="Svg"]')).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toMatch(/blobs layer rendered without palette/);
    warn.mockRestore();
  });

  // Plan 3 Task 19 — when palette is provided, BackgroundStack mounts the real
  // BlobLayer (RN), which emits one <Svg><Path/></Svg> per blob via the
  // react-native-svg mock. Matches the web sibling's Task 18 integration
  // test. Task 20 threads tokens through MythikRenderer on both platforms.
  it('renders real BlobLayer when palette is provided (Task 19 integration)', () => {
    const bg: LayerBackground = {
      color: '#0a0a0a',
      layers: [{ type: 'blobs', preset: 'organic-duo', palette: ['primary', 'accent'] }],
    };
    const palette = { primary: '#6366f1', accent: '#ec4899' };
    const { container } = render(<BackgroundStack background={bg} palette={palette} />);
    const wrapper = container.querySelector('[data-testid="sv-layer-blobs"]');
    expect(wrapper).toBeTruthy();
    // BlobLayer mounts 2 Svg elements for organic-duo preset.
    const svgs = wrapper?.querySelectorAll('[data-testid="Svg"]');
    expect(svgs?.length).toBe(2);
    // Palette rotates — first blob = primary, second = accent.
    const paths = wrapper?.querySelectorAll('[data-testid="Path"]');
    expect(paths?.[0].getAttribute('fill')).toBe('#6366f1');
    expect(paths?.[1].getAttribute('fill')).toBe('#ec4899');
  });

  // Plan 3 Task 19 — blobOpacity → BlobV2Config.opacity promotion (RN parity
  // with web Task 18). Pins toBlobV2Config translation inside BackgroundStack.
  it('maps BlobsLayerConfig.blobOpacity to per-blob fill opacity (RN)', () => {
    const bg: LayerBackground = {
      color: '#0a0a0a',
      layers: [{
        type: 'blobs',
        preset: 'circle-pair',
        palette: ['primary'],
        blobOpacity: 0.3,   // per-blob fill default
        opacity: 0.8,       // layer-container opacity
      }],
    };
    const palette = { primary: '#6366f1', accent: '#ec4899' };
    const { container } = render(<BackgroundStack background={bg} palette={palette} />);
    const wrapper = container.querySelector('[data-testid="sv-layer-blobs"]') as HTMLElement;
    expect(wrapper.style.opacity).toBe('0.8');
    const svg = wrapper.querySelector('[data-testid="Svg"]') as HTMLElement;
    expect(svg.style.opacity).toBe('0.3');
  });

  // Task 19 review I2 — dev-warn when a blob layer requests non-normal
  // blendMode (RN has no mixBlendMode equivalent on View). Warn surfaces the
  // cross-platform visual drift instead of silent drop.
  it('emits dev-warn when blobs layer has non-normal blendMode (RN compositing gap)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bg: LayerBackground = {
      layers: [{ type: 'blobs', preset: 'organic-duo', blendMode: 'screen' }],
    };
    const palette = { primary: '#6366f1', accent: '#ec4899' };
    render(<BackgroundStack background={bg} palette={palette} />);
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toMatch(/blendMode="screen" not supported on RN/);
    warn.mockRestore();
  });

  it('does NOT warn on normal blendMode (default path)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bg: LayerBackground = {
      layers: [{ type: 'blobs', preset: 'organic-duo' }], // blendMode defaults to 'normal'
    };
    const palette = { primary: '#6366f1', accent: '#ec4899' };
    render(<BackgroundStack background={bg} palette={palette} />);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
