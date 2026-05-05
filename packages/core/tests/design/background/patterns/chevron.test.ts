import { describe, it, expect } from 'vitest';
import { chevronPatternSVG } from '../../../../src/design/background/patterns/chevron.js';

describe('chevronPatternSVG', () => {
  it('emits pattern with polyline forming a chevron', () => {
    const svg = chevronPatternSVG({ spacing: 40, thickness: 2, color: '#444' });
    expect(svg).toContain('<polyline');
    expect(svg).toContain('stroke="#444"');
    expect(svg).toContain('stroke-width="2"');
    expect(svg).toContain('fill="none"');
  });
});
