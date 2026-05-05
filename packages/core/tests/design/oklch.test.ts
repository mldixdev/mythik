import { describe, it, expect } from 'vitest';
import { hexToOklch, oklchToHex, srgbToLinear, linearToSrgb } from '../../src/design/oklch.js';

describe('OKLCH color math', () => {
  describe('sRGB ↔ linear', () => {
    it('converts 0 to 0', () => {
      expect(srgbToLinear(0)).toBe(0);
    });

    it('converts 1 to 1', () => {
      expect(srgbToLinear(1)).toBeCloseTo(1, 5);
    });

    it('roundtrips mid-value', () => {
      const v = 0.5;
      expect(linearToSrgb(srgbToLinear(v))).toBeCloseTo(v, 4);
    });
  });

  describe('hex ↔ OKLCH', () => {
    it('converts pure white', () => {
      const [L, C] = hexToOklch('#ffffff');
      expect(L).toBeCloseTo(1.0, 2);
      expect(C).toBeCloseTo(0, 2);
    });

    it('converts pure black', () => {
      const [L, C] = hexToOklch('#000000');
      expect(L).toBeCloseTo(0, 2);
      expect(C).toBeCloseTo(0, 2);
    });

    it('converts teal #0D9488', () => {
      const [L, C, H] = hexToOklch('#0D9488');
      expect(L).toBeGreaterThan(0.5);
      expect(L).toBeLessThan(0.7);
      expect(C).toBeGreaterThan(0.05);
      expect(H).toBeGreaterThan(170);
      expect(H).toBeLessThan(190);
    });

    it('roundtrips hex colors', () => {
      const colors = ['#0D9488', '#F97316', '#3B82F6', '#EF4444', '#22C55E', '#1E3A5F'];
      for (const hex of colors) {
        const oklch = hexToOklch(hex);
        const back = oklchToHex(oklch[0], oklch[1], oklch[2]);
        const origR = parseInt(hex.slice(1, 3), 16);
        const origG = parseInt(hex.slice(3, 5), 16);
        const origB = parseInt(hex.slice(5, 7), 16);
        const backR = parseInt(back.slice(1, 3), 16);
        const backG = parseInt(back.slice(3, 5), 16);
        const backB = parseInt(back.slice(5, 7), 16);
        expect(Math.abs(origR - backR)).toBeLessThanOrEqual(1);
        expect(Math.abs(origG - backG)).toBeLessThanOrEqual(1);
        expect(Math.abs(origB - backB)).toBeLessThanOrEqual(1);
      }
    });

    it('clamps out-of-gamut colors to valid sRGB', () => {
      const hex = oklchToHex(0.7, 0.4, 150);
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    });
  });
});
