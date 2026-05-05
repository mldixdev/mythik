import { describe, it, expect } from 'vitest';
import { isoPatternSVG } from '../../../../src/design/background/patterns/iso.js';

describe('isoPatternSVG', () => {
  it('emits pattern with 3 lines at isometric angles', () => {
    const svg = isoPatternSVG({ spacing: 30, thickness: 1, color: '#999' });
    expect(svg.match(/<line/g)?.length).toBe(3);
    expect(svg).toContain('stroke="#999"');
  });
});
