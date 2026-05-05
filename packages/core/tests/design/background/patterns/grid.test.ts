import { describe, it, expect } from 'vitest';
import { gridPatternSVG } from '../../../../src/design/background/patterns/grid.js';

describe('gridPatternSVG', () => {
  it('emits SVG pattern with 2 line elements', () => {
    const svg = gridPatternSVG({ spacing: 48, thickness: 1, color: '#e5e7eb' });
    expect(svg).toContain('<line');
    expect(svg.match(/<line/g)?.length).toBe(2);
    expect(svg).toContain('stroke="#e5e7eb"');
    expect(svg).toContain('stroke-width="1"');
  });

  it('uses spacing as tile size', () => {
    const svg = gridPatternSVG({ spacing: 80 });
    expect(svg).toContain('width="80"');
    expect(svg).toContain('height="80"');
  });

  it('defaults thickness to 1 and color to currentColor', () => {
    const svg = gridPatternSVG({ spacing: 40 });
    expect(svg).toContain('stroke-width="1"');
    expect(svg).toContain('stroke="currentColor"');
  });
});
