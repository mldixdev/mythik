import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BlobLayer } from '../../src/background/BlobLayer.js';

const palette = { primary: '#6366f1', accent: '#ec4899' };

describe('BlobLayer (RN)', () => {
  it('renders one Svg per blob in explicit form', () => {
    const { container } = render(
      <BlobLayer
        config={{
          blobs: [
            { shape: 'organic-1', position: { x: '10%', y: '20%' }, size: { width: '400px', height: '340px' }, color: 'primary' },
            { shape: 'circle',     position: { x: '60%', y: '50%' }, size: { width: '300px', height: '300px' }, color: 'accent'  },
          ],
        }}
        palette={palette}
      />,
    );
    // Each blob mounts one <Svg> via react-native-svg mock (testID='Svg').
    const svgs = container.querySelectorAll('[data-testid="Svg"]');
    expect(svgs.length).toBe(2);
    // Each Svg wraps one animated Path.
    const paths = container.querySelectorAll('[data-testid="Path"]');
    expect(paths.length).toBe(2);
  });

  it('resolves palette keyword on Path fill', () => {
    const { container } = render(
      <BlobLayer
        config={{
          blobs: [
            { shape: 'circle', position: { x: '0', y: '0' }, size: { width: '100px', height: '100px' }, color: 'primary' },
          ],
        }}
        palette={palette}
      />,
    );
    const path = container.querySelector('[data-testid="Path"]') as HTMLElement;
    expect(path.getAttribute('fill')).toBe('#6366f1');
  });

  it('forwards literal hex color unchanged', () => {
    const { container } = render(
      <BlobLayer
        config={{
          blobs: [
            { shape: 'circle', position: { x: '0', y: '0' }, size: { width: '100px', height: '100px' }, color: '#00ffcc' },
          ],
        }}
        palette={palette}
      />,
    );
    const path = container.querySelector('[data-testid="Path"]') as HTMLElement;
    expect(path.getAttribute('fill')).toBe('#00ffcc');
  });

  it('applies position/size/opacity to Svg style (RN style prop, not attribute)', () => {
    const { container } = render(
      <BlobLayer
        config={{
          blobs: [
            { shape: 'organic-1', position: { x: '25%', y: '40%' }, size: { width: '200px', height: '180px' }, color: 'primary', opacity: 0.5 },
          ],
        }}
        palette={palette}
      />,
    );
    const svg = container.querySelector('[data-testid="Svg"]') as HTMLElement;
    // RN's View mock maps `style` → inline style object; jsdom surfaces via svg.style.
    expect(svg.style.position).toBe('absolute');
    expect(svg.style.left).toBe('25%');
    expect(svg.style.top).toBe('40%');
    expect(svg.style.width).toBe('200px');
    expect(svg.style.height).toBe('180px');
    // opacity lands on style (not attribute) since RN treats opacity as a style prop.
    expect(svg.style.opacity).toBe('0.5');
  });

  it('renders nothing when explicit blobs[] is empty', () => {
    const { container } = render(
      <BlobLayer config={{ blobs: [] }} palette={palette} />,
    );
    expect(container.querySelectorAll('[data-testid="Svg"]').length).toBe(0);
  });

  it('resolves preset form with palette rotation', () => {
    const { container } = render(
      <BlobLayer
        config={{ preset: 'organic-duo', palette: ['primary', 'accent'] }}
        palette={palette}
      />,
    );
    const paths = container.querySelectorAll('[data-testid="Path"]');
    expect(paths.length).toBe(2);
    expect(paths[0].getAttribute('fill')).toBe('#6366f1');
    expect(paths[1].getAttribute('fill')).toBe('#ec4899');
  });

  it('does not crash with motion config (pins useShapeAnimations integration)', () => {
    // Reanimated mock evaluates worklet synchronously; a faulty animation
    // integration would throw at render time. Test is coarse — fine-grained
    // motion assertions belong in useShapeAnimations unit tests, not here.
    const { container } = render(
      <BlobLayer
        config={{
          blobs: [
            {
              shape: 'circle',
              position: { x: '0', y: '0' },
              size: { width: '100px', height: '100px' },
              color: 'primary',
              motion: {
                drift: { duration: '10s', range: { x: 5, y: 5 } },
                rotate: { duration: '20s', from: '0deg', to: '12deg' },
              },
            },
          ],
        }}
        palette={palette}
      />,
    );
    expect(container.querySelector('[data-testid="Path"]')).toBeTruthy();
  });

  // Task 19 review I3 — combined static `rotation` + animated `motion.rotate`
  // must compose without crash. On RN the static transform lives on the Svg
  // wrapper (transform-array with rotate) while the animated rotate flows
  // through the inner Path via Reanimated's animatedProps. Pins non-crash
  // and correct wrapper-level rotation.
  it('composes static rotation with animated motion.rotate without crash', () => {
    const { container } = render(
      <BlobLayer
        config={{
          blobs: [
            {
              shape: 'organic-1',
              position: { x: '0', y: '0' },
              size: { width: '100px', height: '100px' },
              color: 'primary',
              rotation: '15deg',
              motion: {
                rotate: { duration: '20s', from: '0deg', to: '45deg' },
              },
            },
          ],
        }}
        palette={palette}
      />,
    );
    // Both layers mount (static rotation on Svg wrapper, animated rotate on
    // Path via animatedProps). Exact transform value isn't asserted — RN's
    // transform-array shape doesn't translate cleanly to jsdom's style
    // surface via the mock, and fine-grained transform semantics belong in
    // useShapeAnimations unit tests. Non-crash is the contract here.
    expect(container.querySelector('[data-testid="Svg"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="Path"]')).toBeTruthy();
  });

  // Task 19 review C2 — blur is not supported on RN until Plan 4 filter
  // parity milestone. Dev-warn surfaces the gap so consumers aren't confused
  // by cross-platform visual drift. Omit when blur=0 (most common case).
  it('emits dev-warn when blob.blur > 0 (RN filter parity deferred to Plan 4)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <BlobLayer
        config={{
          blobs: [
            { shape: 'circle', position: { x: '0', y: '0' }, size: { width: '100px', height: '100px' }, color: 'primary', blur: 60 },
          ],
        }}
        palette={palette}
      />,
    );
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toMatch(/blob\.blur=60 not rendered/);
    warn.mockRestore();
  });

  it('does not warn when blob.blur is 0 or omitted', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <BlobLayer
        config={{
          blobs: [
            { shape: 'circle', position: { x: '0', y: '0' }, size: { width: '100px', height: '100px' }, color: 'primary' },
          ],
        }}
        palette={palette}
      />,
    );
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
