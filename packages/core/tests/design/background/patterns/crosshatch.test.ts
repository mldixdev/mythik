import { describe, it, expect } from 'vitest';
import { crosshatchPatternSVG } from '../../../../src/design/background/patterns/crosshatch.js';

describe('crosshatchPatternSVG', () => {
  it('emits 2 lines at +angle and -angle', () => {
    const svg = crosshatchPatternSVG({ spacing: 20, thickness: 1, color: '#999', angle: 45 });
    expect(svg.match(/<line/g)?.length).toBe(2);
    expect(svg).toContain('rotate(45');
    expect(svg).toContain('rotate(-45');
  });

  it('defaults angle to 45', () => {
    const svg = crosshatchPatternSVG({ spacing: 20 });
    expect(svg).toContain('rotate(45');
    expect(svg).toContain('rotate(-45');
  });
});
