import { describe, it, expect } from 'vitest';
import { diagonalPatternSVG } from '../../../../src/design/background/patterns/diagonal.js';

describe('diagonalPatternSVG', () => {
  it('emits pattern with line at specified angle', () => {
    const svg = diagonalPatternSVG({ spacing: 20, thickness: 1, color: '#ccc', angle: 45 });
    expect(svg).toContain('<line');
    expect(svg).toContain('patternTransform="rotate(45)"');
    expect(svg).toContain('stroke="#ccc"');
  });

  it('defaults angle to 45', () => {
    const svg = diagonalPatternSVG({ spacing: 20 });
    expect(svg).toContain('patternTransform="rotate(45)"');
  });

  it('supports negative angle', () => {
    const svg = diagonalPatternSVG({ spacing: 20, angle: -45 });
    expect(svg).toContain('patternTransform="rotate(-45)"');
  });
});
