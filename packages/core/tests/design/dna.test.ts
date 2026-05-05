import { describe, it, expect } from 'vitest';
import { deriveDna } from '../../src/design/dna.js';
import type { DesignTokens } from '../../src/design/tokens.js';

describe('deriveDna', () => {
  it('derives full tokens from minimal seed (just primary)', () => {
    const result = deriveDna({ primary: '#0D9488' });
    expect(result.colors).toBeDefined();
    expect(result.colors!.primary).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(result.colors!.surface).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(result.colors!.error).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(result.shape).toBeDefined();
    expect(result.shape!.radius!.md).toBeGreaterThan(0);
    expect(result.typography).toBeDefined();
    expect(result.spacing).toBeDefined();
    expect(result.elevation).toBeDefined();
    expect(result.motion).toBeDefined();
    expect(result.opacity).toBeDefined();
  });

  it('derives shape from roundness', () => {
    const sharp = deriveDna({ primary: '#000000', roundness: 0 });
    const round = deriveDna({ primary: '#000000', roundness: 1 });
    expect(sharp.shape!.radius!.md).toBeLessThan(round.shape!.radius!.md);
    expect(round.shape!.radius!.full).toBe(9999);
  });

  it('derives typography from formality', () => {
    const casual = deriveDna({ primary: '#000000', formality: 0.1 });
    const formal = deriveDna({ primary: '#000000', formality: 0.9 });
    expect(casual.typography!.fontFamily!.base).toContain('Inter');
    expect(formal.typography!.fontFamily!.heading).toContain('Playfair Display');
  });

  it('derives spacing from density', () => {
    const airy = deriveDna({ primary: '#000000', density: 0 });
    const dense = deriveDna({ primary: '#000000', density: 1 });
    expect(airy.spacing!.unit!).toBeGreaterThan(dense.spacing!.unit!);
  });

  it('derives elevation from depth', () => {
    const flat = deriveDna({ primary: '#000000', depth: 0 });
    const deep = deriveDna({ primary: '#000000', depth: 1 });
    expect(flat.elevation!.md.shadowOpacity).toBe(0);
    expect(deep.elevation!.md.shadowOpacity).toBeGreaterThan(0.1);
  });

  it('derives motion from preset', () => {
    const snappy = deriveDna({ primary: '#000000', motion: 'snappy' });
    const gentle = deriveDna({ primary: '#000000', motion: 'gentle' });
    expect(snappy.motion!.duration!.fast).toBeLessThan(gentle.motion!.duration!.fast);
    expect(snappy.motion!.spring!.stiffness).toBeGreaterThan(gentle.motion!.spring!.stiffness);
  });

  it('uses harmony to derive accent color', () => {
    const comp = deriveDna({ primary: '#0D9488', harmony: 'complementary' });
    const analog = deriveDna({ primary: '#0D9488', harmony: 'analogous' });
    expect(comp.colors!.accent).not.toBe(analog.colors!.accent);
  });

  it('uses explicit accent when provided — exact hex preserved', () => {
    const result = deriveDna({ primary: '#0D9488', accent: '#F97316' });
    expect(result.colors!.accent).toBe('#F97316');
  });

  it('generates auto dark mode', () => {
    const result = deriveDna({ primary: '#0D9488' });
    expect(result.modes).toBeDefined();
    expect(result.modes!.dark).toBeDefined();
    const dark = result.modes!.dark as Partial<DesignTokens>;
    expect(dark.colors).toBeDefined();
    expect(dark.colors!.surface).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('dark mode surface is dark', () => {
    const result = deriveDna({ primary: '#0D9488' });
    const darkSurface = (result.modes!.dark as Partial<DesignTokens>).colors!.surface!;
    const r = parseInt(darkSurface.slice(1, 3), 16);
    const g = parseInt(darkSurface.slice(3, 5), 16);
    const b = parseInt(darkSurface.slice(5, 7), 16);
    expect(r + g + b).toBeLessThan(200);
  });

  it('uses defaults for omitted seeds', () => {
    const result = deriveDna({ primary: '#0D9488' });
    // Default roundness = 0.5 → radius.md should be ~9
    expect(result.shape!.radius!.md).toBeGreaterThan(5);
    expect(result.shape!.radius!.md).toBeLessThan(12);
  });

  describe('color preservation', () => {
    it('preserves the exact primary color the user chose', () => {
      const amber = deriveDna({ primary: '#F59E0B' });
      expect(amber.colors!.primary).toBe('#F59E0B');

      const teal = deriveDna({ primary: '#0D9488' });
      expect(teal.colors!.primary).toBe('#0D9488');

      const indigo = deriveDna({ primary: '#6366f1' });
      expect(indigo.colors!.primary).toBe('#6366f1');
    });

    it('generates primaryLight lighter than the original', () => {
      const result = deriveDna({ primary: '#F59E0B' });
      // primaryLight should be visually lighter — higher RGB sum
      const lightR = parseInt(result.colors!.primaryLight!.slice(1, 3), 16);
      const lightG = parseInt(result.colors!.primaryLight!.slice(3, 5), 16);
      const lightB = parseInt(result.colors!.primaryLight!.slice(5, 7), 16);
      const origR = parseInt('F5', 16);
      const origG = parseInt('9E', 16);
      const origB = parseInt('0B', 16);
      expect(lightR + lightG + lightB).toBeGreaterThan(origR + origG + origB);
    });

    it('generates primaryDark darker than the original', () => {
      const result = deriveDna({ primary: '#F59E0B' });
      const darkR = parseInt(result.colors!.primaryDark!.slice(1, 3), 16);
      const darkG = parseInt(result.colors!.primaryDark!.slice(3, 5), 16);
      const darkB = parseInt(result.colors!.primaryDark!.slice(5, 7), 16);
      const origR = parseInt('F5', 16);
      const origG = parseInt('9E', 16);
      const origB = parseInt('0B', 16);
      expect(darkR + darkG + darkB).toBeLessThan(origR + origG + origB);
    });

    it('works correctly for naturally dark colors (indigo)', () => {
      const result = deriveDna({ primary: '#6366f1' });
      expect(result.colors!.primary).toBe('#6366f1');
      // Light variant should be lighter
      const lightR = parseInt(result.colors!.primaryLight!.slice(1, 3), 16);
      const lightG = parseInt(result.colors!.primaryLight!.slice(3, 5), 16);
      const lightB = parseInt(result.colors!.primaryLight!.slice(5, 7), 16);
      expect(lightR + lightG + lightB).toBeGreaterThan(0x63 + 0x66 + 0xf1);
    });
  });
});
