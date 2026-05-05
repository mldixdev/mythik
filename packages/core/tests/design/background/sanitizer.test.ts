import { describe, it, expect } from 'vitest';
import { sanitizeSVGShapes } from '../../../src/design/background/sanitizer.js';

describe('sanitizeSVGShapes', () => {
  it('allows whitelisted shape elements', () => {
    const input = '<circle cx="5" cy="5" r="2" fill="black"/>';
    const output = sanitizeSVGShapes(input);
    expect(output).toContain('<circle');
    expect(output).toContain('cx="5"');
    expect(output).toContain('fill="black"');
  });

  it('allows rect, path, line, polygon, polyline, ellipse, g, defs', () => {
    const input = '<g><rect x="0" y="0" width="10" height="10"/><path d="M0 0 L10 10"/><line x1="0" y1="0" x2="5" y2="5"/></g>';
    const output = sanitizeSVGShapes(input);
    expect(output).toContain('<g');
    expect(output).toContain('<rect');
    expect(output).toContain('<path');
    expect(output).toContain('<line');
  });

  it('strips script tags entirely', () => {
    const input = '<script>alert(1)</script><circle r="5"/>';
    const output = sanitizeSVGShapes(input);
    expect(output).not.toContain('<script');
    expect(output).not.toContain('alert');
    expect(output).toContain('<circle');
  });

  it('strips on* event attributes', () => {
    const input = '<circle r="5" onclick="alert(1)" onload="x()"/>';
    const output = sanitizeSVGShapes(input);
    expect(output).not.toContain('onclick');
    expect(output).not.toContain('onload');
    expect(output).toContain('r="5"');
  });

  it('strips foreignObject', () => {
    const input = '<foreignObject><iframe src="http://evil.com"/></foreignObject><circle r="5"/>';
    const output = sanitizeSVGShapes(input);
    expect(output).not.toContain('foreignObject');
    expect(output).not.toContain('iframe');
    expect(output).toContain('<circle');
  });

  it('strips external use href', () => {
    const input = '<use href="http://evil.com/x.svg#inject"/><circle r="5"/>';
    const output = sanitizeSVGShapes(input);
    expect(output).not.toContain('evil.com');
    expect(output).toContain('<circle');
  });

  it('strips javascript: URLs', () => {
    const input = '<a href="javascript:alert(1)"><circle r="5"/></a>';
    const output = sanitizeSVGShapes(input);
    expect(output).not.toContain('javascript:');
  });

  it('preserves stroke-dasharray, transform, opacity attributes', () => {
    const input = '<path d="M0 0" stroke-dasharray="2 2" transform="rotate(45)" opacity="0.5"/>';
    const output = sanitizeSVGShapes(input);
    expect(output).toContain('stroke-dasharray');
    expect(output).toContain('transform');
    expect(output).toContain('opacity');
  });
});
