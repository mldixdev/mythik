import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BlobLayer } from '../../src/background/BlobLayer.js';

const palette = { primary: '#6366f1', accent: '#ec4899' };

describe('BlobLayer (web)', () => {
  it('renders one <svg><path> per blob in explicit form', () => {
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
    expect(container.querySelectorAll('svg').length).toBe(2);
    expect(container.querySelectorAll('svg path').length).toBe(2);
  });

  it('resolves palette keywords on fill', () => {
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
    const path = container.querySelector('svg path') as SVGPathElement;
    expect(path.getAttribute('fill')).toBe('#6366f1');
  });

  it('forwards literal hex colors unchanged', () => {
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
    const path = container.querySelector('svg path') as SVGPathElement;
    expect(path.getAttribute('fill')).toBe('#00ffcc');
  });

  it('applies opacity to the svg wrapper', () => {
    const { container } = render(
      <BlobLayer
        config={{
          blobs: [
            { shape: 'circle', position: { x: '0', y: '0' }, size: { width: '100px', height: '100px' }, color: 'primary', opacity: 0.4 },
          ],
        }}
        palette={palette}
      />,
    );
    const svg = container.querySelector('svg') as SVGSVGElement;
    expect(svg.getAttribute('opacity')).toBe('0.4');
  });

  it('positions via absolute left/top/width/height from BlobRenderStyle', () => {
    const { container } = render(
      <BlobLayer
        config={{
          blobs: [
            { shape: 'organic-1', position: { x: '25%', y: '40%' }, size: { width: '200px', height: '180px' }, color: 'primary' },
          ],
        }}
        palette={palette}
      />,
    );
    const svg = container.querySelector('svg') as SVGSVGElement;
    expect(svg.style.position).toBe('absolute');
    expect(svg.style.left).toBe('25%');
    expect(svg.style.top).toBe('40%');
    expect(svg.style.width).toBe('200px');
    expect(svg.style.height).toBe('180px');
  });

  it('applies blur via CSS filter when BlobRenderStyle.blur > 0', () => {
    const { container } = render(
      <BlobLayer
        config={{
          blobs: [
            { shape: 'circle', position: { x: '0', y: '0' }, size: { width: '100px', height: '100px' }, color: 'primary', blur: 60 },
          ],
        }}
        palette={palette}
      />,
    );
    const svg = container.querySelector('svg') as SVGSVGElement;
    expect(svg.style.filter).toBe('blur(60px)');
  });

  it('marks blobs aria-hidden (decorative, non-interactive)', () => {
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
    const svg = container.querySelector('svg') as SVGSVGElement;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders nothing when explicit blobs[] is empty', () => {
    const { container } = render(
      <BlobLayer config={{ blobs: [] }} palette={palette} />,
    );
    expect(container.querySelectorAll('svg').length).toBe(0);
  });

  it('resolves preset form via resolveBlobLayer with palette rotation', () => {
    const { container } = render(
      <BlobLayer
        config={{ preset: 'organic-duo', palette: ['primary', 'accent'] }}
        palette={palette}
      />,
    );
    const paths = container.querySelectorAll('svg path');
    expect(paths.length).toBe(2);
    // Preset palette rotates — index 0 = primary, index 1 = accent
    expect(paths[0].getAttribute('fill')).toBe('#6366f1');
    expect(paths[1].getAttribute('fill')).toBe('#ec4899');
  });

  it('does NOT use dangerouslySetInnerHTML anywhere in the rendered subtree', () => {
    // Regression guard: plan 3 replaces legacy blob rendering (box.tsx:127 +
    // resolveBlobStyles) that used dangerouslySetInnerHTML. BlobLayer must
    // render JSX directly so React handles escaping and no XSS surface is
    // opened. Test is negative but meaningful: any future refactor that
    // accidentally emits <style> via dangerouslySetInnerHTML would fail.
    const { container } = render(
      <BlobLayer
        config={{
          blobs: [
            { shape: 'circle', position: { x: '0', y: '0' }, size: { width: '100px', height: '100px' }, color: 'primary', motion: { drift: { duration: '10s', range: { x: 5, y: 5 } } } },
          ],
        }}
        palette={palette}
      />,
    );
    expect(container.innerHTML).not.toContain('<style');
  });
});
