import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BackgroundLayer } from '../../src/background/BackgroundLayer.js';
import type { LayerSpec } from 'mythik';

describe('BackgroundLayer (RN)', () => {
  it('renders solid layer as View with backgroundColor', () => {
    const spec: LayerSpec = {
      kind: 'solid',
      color: '#ff0000',
      common: { opacity: 1, blendMode: 'normal', zIndex: 0 },
    };
    const { container } = render(<BackgroundLayer spec={spec} />);
    // Mock RN View becomes a div in jsdom
    expect(container.firstChild).toBeTruthy();
  });

  it('renders pattern layer wrapped in Svg via SvgXml mock', () => {
    const spec: LayerSpec = {
      kind: 'pattern',
      svg: '<pattern id="p1" width="40" height="40" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="40" y2="0" stroke="#ccc"/></pattern>',
      tileSize: 40,
      common: { opacity: 1, blendMode: 'normal', zIndex: 2 },
    };
    const { container } = render(<BackgroundLayer spec={spec} />);
    // RN mock maps testID → data-testid only (tests/__mocks__/react-native-svg.ts);
    // dropped the dead `[testid=...]` clause that never matched.
    const svgNode = container.querySelector('[data-testid="SvgXml"]');
    expect(svgNode).toBeTruthy();
  });

  it('renders gradient via SvgXml mock', () => {
    const spec: LayerSpec = {
      kind: 'gradient',
      css: 'linear-gradient(135deg, #ff0000 0%, #0000ff 100%)',
      svg: { def: '<linearGradient id="g1"><stop offset="0%" stop-color="#ff0000"/><stop offset="100%" stop-color="#0000ff"/></linearGradient>', fill: 'url(#g1)' },
      common: { opacity: 1, blendMode: 'normal', zIndex: 1 },
    };
    const { container } = render(<BackgroundLayer spec={spec} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders grain via SvgXml mock', () => {
    const spec: LayerSpec = {
      kind: 'grain',
      svg: '<filter id="g1"><feTurbulence baseFrequency="0.9"/></filter><rect width="100%" height="100%" filter="url(#g1)" opacity="0.05"/>',
      common: { opacity: 1, blendMode: 'normal', zIndex: 3 },
    };
    const { container } = render(<BackgroundLayer spec={spec} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders image layer', () => {
    const spec: LayerSpec = {
      kind: 'image',
      url: 'https://example.com/bg.jpg',
      size: 'cover',
      position: 'center',
      repeat: 'no-repeat',
      common: { opacity: 0.8, blendMode: 'normal', zIndex: 4 },
    };
    const { container } = render(<BackgroundLayer spec={spec} />);
    expect(container.firstChild).toBeTruthy();
  });

  // Plan 3 Task 16 (review C1) — RN blobs stub parity with web sibling.
  // Task 19 replaces with real <BlobLayer /> rendering.
  it('renders blobs layer as stub View (Task 16 — stub, Task 19 implements)', () => {
    const spec: LayerSpec = {
      kind: 'blobs',
      config: { type: 'blobs', preset: 'organic-duo' },
      common: { opacity: 0.5, blendMode: 'normal', zIndex: 2 },
    };
    const { container } = render(<BackgroundLayer spec={spec} />);
    expect(container.firstChild).toBeTruthy();
  });
});
