import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BackgroundLayer } from '../../src/background/BackgroundLayer.js';
import type { LayerSpec } from 'mythik';

describe('BackgroundLayer', () => {
  it('renders solid layer as div with backgroundColor', () => {
    const spec: LayerSpec = {
      kind: 'solid',
      color: '#ff0000',
      common: { opacity: 1, blendMode: 'normal', zIndex: 0 },
    };
    const { container } = render(<BackgroundLayer spec={spec} />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.backgroundColor).toBe('rgb(255, 0, 0)');
    expect(div.style.position).toBe('absolute');
    expect(div.style.inset).toBe('0px');
  });

  it('renders gradient layer using CSS string', () => {
    const spec: LayerSpec = {
      kind: 'gradient',
      css: 'linear-gradient(135deg, #ff0000 0%, #0000ff 100%)',
      svg: { def: '', fill: '' },
      common: { opacity: 0.5, blendMode: 'multiply', zIndex: 1 },
    };
    const { container } = render(<BackgroundLayer spec={spec} />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.backgroundImage).toContain('linear-gradient');
    expect(div.style.opacity).toBe('0.5');
    expect(div.style.mixBlendMode).toBe('multiply');
  });

  it('renders pattern layer as inline SVG', () => {
    const spec: LayerSpec = {
      kind: 'pattern',
      svg: '<pattern id="p1" width="40" height="40" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="40" y2="0" stroke="#ccc"/></pattern>',
      tileSize: 40,
      common: { opacity: 1, blendMode: 'normal', zIndex: 2 },
    };
    const { container } = render(<BackgroundLayer spec={spec} />);
    expect(container.querySelector('svg')).toBeTruthy();
    expect(container.querySelector('pattern')).toBeTruthy();
  });

  it('renders grain layer as inline SVG with filter', () => {
    const spec: LayerSpec = {
      kind: 'grain',
      svg: '<filter id="g1"><feTurbulence baseFrequency="0.9"/></filter><rect width="100%" height="100%" filter="url(#g1)" opacity="0.05"/>',
      common: { opacity: 1, blendMode: 'normal', zIndex: 3 },
    };
    const { container } = render(<BackgroundLayer spec={spec} />);
    expect(container.querySelector('svg')).toBeTruthy();
    expect(container.querySelector('feTurbulence')).toBeTruthy();
  });

  it('renders image layer as div with background-image url', () => {
    const spec: LayerSpec = {
      kind: 'image',
      url: 'https://example.com/bg.jpg',
      size: 'cover',
      position: 'center',
      repeat: 'no-repeat',
      common: { opacity: 0.8, blendMode: 'normal', zIndex: 4 },
    };
    const { container } = render(<BackgroundLayer spec={spec} />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.backgroundImage).toContain('https://example.com/bg.jpg');
    expect(div.style.backgroundSize).toBe('cover');
    expect(div.style.opacity).toBe('0.8');
  });

  // Plan 3 Task 16 stub — BlobLayer (Task 18) replaces this branch with real
  // SVG blob rendering. The stub pins the common-style contract so Task 18
  // has a contract to honor on the enclosing wrapper.
  it('renders blobs layer as stub div with common styles (Task 16 — stub, Task 18 implements)', () => {
    const spec: LayerSpec = {
      kind: 'blobs',
      config: { type: 'blobs', preset: 'organic-duo' },
      common: { opacity: 0.6, blendMode: 'screen', zIndex: 3 },
    };
    const { container } = render(<BackgroundLayer spec={spec} />);
    const el = container.querySelector('[data-sv-layer="blobs"]') as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.style.opacity).toBe('0.6');
    expect(el.style.mixBlendMode).toBe('screen');
    expect(el.style.zIndex).toBe('3');
    expect(el.style.position).toBe('absolute');
  });
});
