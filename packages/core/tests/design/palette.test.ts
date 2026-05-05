import { describe, it, expect } from 'vitest';
import { generateTonalPalette, generateTonalStep, generateSemanticColors, generateNeutralPalette } from '../../src/design/palette.js';

describe('generateTonalPalette', () => {
  it('generates 13 stops from a hex color', () => {
    const palette = generateTonalPalette('#0D9488');
    expect(Object.keys(palette)).toEqual(['5', '10', '20', '30', '40', '50', '60', '70', '80', '90', '95', '99', '100']);
  });

  it('stop 5 is near-black', () => {
    const palette = generateTonalPalette('#0D9488');
    const [r, g, b] = [parseInt(palette['5'].slice(1, 3), 16), parseInt(palette['5'].slice(3, 5), 16), parseInt(palette['5'].slice(5, 7), 16)];
    expect(r + g + b).toBeLessThan(100);
  });

  it('stop 99 is near-white', () => {
    const palette = generateTonalPalette('#0D9488');
    const [r, g, b] = [parseInt(palette['99'].slice(1, 3), 16), parseInt(palette['99'].slice(3, 5), 16), parseInt(palette['99'].slice(5, 7), 16)];
    expect(r + g + b).toBeGreaterThan(700);
  });

  it('stop 100 is pure white', () => {
    const palette = generateTonalPalette('#0D9488');
    expect(palette['100']).toBe('#ffffff');
  });

  it('stops are ordered from dark to light', () => {
    const palette = generateTonalPalette('#3B82F6');
    const keys = Object.keys(palette).map(Number);
    for (let i = 1; i < keys.length; i++) {
      const prev = palette[String(keys[i - 1])];
      const curr = palette[String(keys[i])];
      const prevBrightness = parseInt(prev.slice(1, 3), 16) + parseInt(prev.slice(3, 5), 16) + parseInt(prev.slice(5, 7), 16);
      const currBrightness = parseInt(curr.slice(1, 3), 16) + parseInt(curr.slice(3, 5), 16) + parseInt(curr.slice(5, 7), 16);
      expect(currBrightness).toBeGreaterThanOrEqual(prevBrightness - 5);
    }
  });

  it('all stops are valid hex colors', () => {
    const palette = generateTonalPalette('#F97316');
    for (const hex of Object.values(palette)) {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe('generateTonalStep', () => {
  it('produces same color as generateTonalPalette for predefined stops', () => {
    const palette = generateTonalPalette('#6366f1');
    expect(generateTonalStep('#6366f1', 60)).toBe(palette['60']);
    expect(generateTonalStep('#6366f1', 40)).toBe(palette['40']);
    expect(generateTonalStep('#6366f1', 80)).toBe(palette['80']);
  });

  it('produces valid hex for arbitrary steps', () => {
    const s25 = generateTonalStep('#6366f1', 25);
    const s45 = generateTonalStep('#6366f1', 45);
    const s65 = generateTonalStep('#6366f1', 65);
    expect(s25).toMatch(/^#[0-9a-f]{6}$/);
    expect(s45).toMatch(/^#[0-9a-f]{6}$/);
    expect(s65).toMatch(/^#[0-9a-f]{6}$/);
    expect(s25).not.toBe(s45);
    expect(s45).not.toBe(s65);
  });

  it('step 100 produces white', () => {
    expect(generateTonalStep('#6366f1', 100)).toBe('#ffffff');
  });

  it('works with yellow (high lightness primary)', () => {
    const s25 = generateTonalStep('#eab308', 25);
    const s45 = generateTonalStep('#eab308', 45);
    expect(s25).toMatch(/^#[0-9a-f]{6}$/);
    expect(s25).not.toBe(s45);
  });
});

describe('generateSemanticColors', () => {
  it('generates error, success, warning colors', () => {
    const colors = generateSemanticColors('#0D9488');
    expect(colors.error).toMatch(/^#[0-9a-f]{6}$/);
    expect(colors.success).toMatch(/^#[0-9a-f]{6}$/);
    expect(colors.warning).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('error is reddish (R channel dominant)', () => {
    const colors = generateSemanticColors('#0D9488');
    const r = parseInt(colors.error.slice(1, 3), 16);
    const g = parseInt(colors.error.slice(3, 5), 16);
    expect(r).toBeGreaterThan(g);
  });

  it('success is greenish (G channel dominant)', () => {
    const colors = generateSemanticColors('#0D9488');
    const r = parseInt(colors.success.slice(1, 3), 16);
    const g = parseInt(colors.success.slice(3, 5), 16);
    expect(g).toBeGreaterThan(r);
  });
});

describe('generateNeutralPalette', () => {
  it('generates palette for "warm" neutral', () => {
    const palette = generateNeutralPalette('#0D9488', 'warm');
    expect(Object.keys(palette).length).toBe(13);
  });

  it('generates palette for "cool" neutral', () => {
    const palette = generateNeutralPalette('#0D9488', 'cool');
    expect(Object.keys(palette).length).toBe(13);
  });

  it('generates palette for "natural" neutral', () => {
    const palette = generateNeutralPalette('#0D9488', 'natural');
    expect(Object.keys(palette).length).toBe(13);
  });

  it('neutral 99 is nearly white but not pure white (has tint)', () => {
    const palette = generateNeutralPalette('#0D9488', 'natural');
    expect(palette['99']).not.toBe('#ffffff');
    const r = parseInt(palette['99'].slice(1, 3), 16);
    const g = parseInt(palette['99'].slice(3, 5), 16);
    const b = parseInt(palette['99'].slice(5, 7), 16);
    expect(r + g + b).toBeGreaterThan(730);
  });
});
