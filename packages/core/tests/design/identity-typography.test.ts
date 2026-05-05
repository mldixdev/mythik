import { describe, it, expect } from 'vitest';
import { resolveTypographyHierarchy, resolveTextDecoration, resolveTextDecorations, resolveLabelStyle } from '../../src/design/identity/index.js';

describe('resolveTypographyHierarchy', () => {
  it('dramatic: heading scale multiplier is 3x', () => {
    const h = resolveTypographyHierarchy('dramatic');
    expect(h.headingScale).toBeGreaterThanOrEqual(2.5);
    expect(h.headingWeight).toBe(800);
  });

  it('uniform: heading scale multiplier is close to 1x', () => {
    const h = resolveTypographyHierarchy('uniform');
    expect(h.headingScale).toBeLessThanOrEqual(1.5);
    expect(h.headingWeight).toBe(600);
  });

  it('editorial: uses wider letter-spacing and moderate scale', () => {
    const h = resolveTypographyHierarchy('editorial');
    expect(h.headingLetterSpacing).toBeDefined();
    expect(h.headingScale).toBeGreaterThan(1.5);
    expect(h.headingScale).toBeLessThan(3);
    expect(h.headingWeight).toBe(700);
  });

  it('display: massive scale 4x, weight 900', () => {
    const h = resolveTypographyHierarchy('display');
    expect(h.headingScale).toBe(4);
    expect(h.headingWeight).toBe(900);
    expect(h.headingLetterSpacing).toBe('-0.03em');
  });

  it('mono: uses mono font family, moderate scale', () => {
    const h = resolveTypographyHierarchy('mono');
    expect(h.headingFontFamily).toBe('mono');
    expect(h.headingScale).toBe(1.5);
    expect(h.headingWeight).toBe(600);
  });

  it('contrast: large scale with ultra-thin weight', () => {
    const h = resolveTypographyHierarchy('contrast');
    expect(h.headingScale).toBe(2.5);
    expect(h.headingWeight).toBe(300);
  });
});

describe('resolveTextDecoration', () => {
  it('none: returns empty object', () => {
    expect(resolveTextDecoration('none')).toEqual({});
  });

  it('stroke: returns WebkitTextStroke', () => {
    const d = resolveTextDecoration('stroke', '#000');
    expect(d.WebkitTextStroke).toBeDefined();
    expect(d.paintOrder).toBe('stroke fill');
  });

  it('underline-accent: returns borderBottom with accent color', () => {
    const d = resolveTextDecoration('underline-accent', '#0D9488');
    expect(d.borderBottom).toContain('#0D9488');
    expect(d.width).toBe('fit-content');
  });

  it('stroke uses fallback color when none provided', () => {
    const d = resolveTextDecoration('stroke');
    expect(d.WebkitTextStroke).toContain('#000');
  });

  it('highlight: background tint with accent color', () => {
    const d = resolveTextDecoration('highlight', '#0D9488');
    expect(d.backgroundColor).toContain('0D9488');
    expect(d.width).toBe('fit-content');
  });

  it('overline: top border with accent color', () => {
    const d = resolveTextDecoration('overline', '#0D9488');
    expect(d.borderTop).toContain('#0D9488');
    expect(d.paddingTop).toBeDefined();
  });

  it('shadow: text shadow with accent color', () => {
    const d = resolveTextDecoration('shadow', '#0D9488');
    expect(d.textShadow).toContain('0D9488');
  });
});

describe('resolveTextDecorations (multi-select)', () => {
  it('single string works like resolveTextDecoration', () => {
    const d = resolveTextDecorations('stroke', '#000');
    expect(d.WebkitTextStroke).toBeDefined();
  });

  it('array merges multiple decorations', () => {
    const d = resolveTextDecorations(['underline-accent', 'shadow'], '#0D9488');
    expect(d.borderBottom).toContain('#0D9488');
    expect(d.textShadow).toContain('0D9488');
  });

  it('empty array returns empty', () => {
    expect(resolveTextDecorations([], '#000')).toEqual({});
  });

  it('array with only none returns empty', () => {
    expect(resolveTextDecorations(['none'], '#000')).toEqual({});
  });

  it('three decorations merge', () => {
    const d = resolveTextDecorations(['highlight', 'overline', 'shadow'], '#0D9488');
    expect(d.backgroundColor).toBeDefined();
    expect(d.borderTop).toBeDefined();
    expect(d.textShadow).toBeDefined();
  });
});

describe('resolveLabelStyle', () => {
  it('normal: returns empty', () => {
    expect(resolveLabelStyle('normal')).toEqual({});
  });

  it('uppercase: returns textTransform and letterSpacing', () => {
    const s = resolveLabelStyle('uppercase');
    expect(s.textTransform).toBe('uppercase');
    expect(s.letterSpacing).toBeDefined();
  });

  it('accent-colored: returns color', () => {
    const s = resolveLabelStyle('accent-colored', '#0D9488');
    expect(s.color).toBe('#0D9488');
  });

  it('accent-colored without color uses inherit', () => {
    const s = resolveLabelStyle('accent-colored');
    expect(s.color).toBe('inherit');
  });
});
