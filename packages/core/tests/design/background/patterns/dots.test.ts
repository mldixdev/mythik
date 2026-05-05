import { describe, it, expect } from 'vitest';
import { dotsPatternSVG } from '../../../../src/design/background/patterns/dots.js';

describe('dotsPatternSVG', () => {
  it('emits SVG pattern with a circle element', () => {
    const svg = dotsPatternSVG({ spacing: 20, dotRadius: 2, color: '#ccc' });
    expect(svg).toContain('<circle');
    expect(svg).toContain('r="2"');
    expect(svg).toContain('fill="#ccc"');
  });

  it('centers the dot in the tile', () => {
    const svg = dotsPatternSVG({ spacing: 40, dotRadius: 3 });
    expect(svg).toContain('cx="20"');
    expect(svg).toContain('cy="20"');
  });

  it('defaults dotRadius to 2 and color to currentColor', () => {
    const svg = dotsPatternSVG({ spacing: 20 });
    expect(svg).toContain('r="2"');
    expect(svg).toContain('fill="currentColor"');
  });
});
