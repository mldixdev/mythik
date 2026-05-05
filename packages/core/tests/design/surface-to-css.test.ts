import { describe, it, expect } from 'vitest';
import { resolveSurfaceStyles } from '../../src/design/identity/index.js';
import { surfaceToCSS } from '../../src/design/surface-to-css.js';

const COLORS = { surface: '#ffffff', background: '#f8fafc', border: '#d1d5db', primary: '#6366f1', text: '#0f172a' };

describe('surfaceToCSS', () => {
  // --- Border serialization ---

  it('serializes border to CSS string', () => {
    const raw = resolveSurfaceStyles('elevated', COLORS);
    const css = surfaceToCSS(raw, 0.5, 0);
    expect(css.card.border).toBe('1px solid #d1d5db');
  });

  it('emits border: none when no border defined (resets browser defaults)', () => {
    const raw = resolveSurfaceStyles('flat', COLORS);
    const css = surfaceToCSS(raw, 0.5, 0);
    expect(css.card.border).toBe('none');
  });

  it('serializes cardLine borderTop', () => {
    const raw = resolveSurfaceStyles('elevated', COLORS, { accent: '#F59E0B', cardLine: ['top'] });
    const css = surfaceToCSS(raw, 0.5, 0);
    expect(css.card.borderTop).toBe('3px solid #F59E0B');
  });

  it('bold border uses text color', () => {
    const raw = resolveSurfaceStyles('bold', { ...COLORS, text: '#111' });
    const css = surfaceToCSS(raw, 0.5, 0);
    expect(css.card.border).toBe('3px solid #111');
  });

  // --- Shadow serialization with depth + angle ---

  it('elevated card: default depth/angle produces downward shadow', () => {
    const raw = resolveSurfaceStyles('elevated', COLORS);
    const css = surfaceToCSS(raw, 0.5, 0);
    // angle=0 → offsetX=0, offsetY=positive. Two shadows comma-separated.
    expect(css.card.boxShadow).toMatch(/^0px \d+px \d+px rgba\(/);
    expect(css.card.boxShadow).toContain(',');
  });

  it('elevated card: depth=0 produces minimal shadows', () => {
    const raw = resolveSurfaceStyles('elevated', COLORS);
    const css = surfaceToCSS(raw, 0, 0);
    const opMatch = css.card.boxShadow!.match(/rgba\(0,0,0,([\d.]+)\)/);
    expect(parseFloat(opMatch![1])).toBeLessThan(0.05);
  });

  it('elevated card: depth=1 produces stronger shadows than depth=0.5', () => {
    const raw = resolveSurfaceStyles('elevated', COLORS);
    const css05 = surfaceToCSS(raw, 0.5, 0);
    const css10 = surfaceToCSS(raw, 1, 0);
    const op05 = parseFloat(css05.card.boxShadow!.match(/rgba\(0,0,0,([\d.]+)\)/)![1]);
    const op10 = parseFloat(css10.card.boxShadow!.match(/rgba\(0,0,0,([\d.]+)\)/)![1]);
    expect(op10).toBeGreaterThan(op05);
  });

  it('angle=90 produces rightward shadow', () => {
    const raw = resolveSurfaceStyles('elevated', COLORS);
    const css = surfaceToCSS(raw, 0.5, 90);
    const match = css.card.boxShadow!.match(/^(-?\d+)px (-?\d+)px/);
    expect(parseInt(match![1])).not.toBe(0);
  });

  it('angle=180 produces upward shadow', () => {
    const raw = resolveSurfaceStyles('elevated', COLORS);
    const css = surfaceToCSS(raw, 0.5, 180);
    const match = css.card.boxShadow!.match(/^(-?\d+)px (-?\d+)px/);
    expect(parseInt(match![2])).toBeLessThan(0);
  });

  it('no boxShadow when shadows is empty', () => {
    const raw = resolveSurfaceStyles('flat', COLORS);
    const css = surfaceToCSS(raw, 0.5, 0);
    expect(css.card.boxShadow).toBe('none');
  });

  // --- Inset shadows ---

  it('elevated input has inset shadow', () => {
    const raw = resolveSurfaceStyles('elevated', COLORS);
    const css = surfaceToCSS(raw, 0.5, 0);
    expect(css.input.boxShadow).toMatch(/^inset /);
  });

  it('neo input has inset shadows', () => {
    const raw = resolveSurfaceStyles('neo', COLORS);
    const css = surfaceToCSS(raw, 0.5, 0);
    expect(css.input.boxShadow).toContain('inset');
  });

  // --- Focus ring with spread ---

  it('focus ring uses spread syntax', () => {
    const raw = resolveSurfaceStyles('elevated', COLORS);
    const css = surfaceToCSS(raw, 0.5, 0);
    expect(css.inputFocus.boxShadow).toMatch(/0px 0px 0px 3px rgba\(/);
  });

  // --- Glass/blur ---

  it('glass card has backdropFilter and rgba background', () => {
    const raw = resolveSurfaceStyles('glass', COLORS);
    const css = surfaceToCSS(raw, 0.5, 0);
    expect(css.card.backdropFilter).toBe('blur(16px)');
    expect((css.card as Record<string, unknown>).WebkitBackdropFilter).toBe('blur(16px)');
    expect(css.card.backgroundColor).toContain('rgba');
  });

  it('glass modal has stronger blur', () => {
    const raw = resolveSurfaceStyles('glass', COLORS);
    const css = surfaceToCSS(raw, 0.5, 0);
    expect(css.modal.backdropFilter).toBe('blur(24px)');
  });

  it('non-glass has no backdropFilter', () => {
    const raw = resolveSurfaceStyles('elevated', COLORS);
    const css = surfaceToCSS(raw, 0.5, 0);
    expect(css.card.backdropFilter).toBeUndefined();
  });

  // --- Neo multi-shadow ---

  it('neo card has dual shadows (dark + white)', () => {
    const raw = resolveSurfaceStyles('neo', COLORS);
    const css = surfaceToCSS(raw, 0.5, 0);
    expect(css.card.boxShadow).toContain('rgba(0,0,0,');
    expect(css.card.boxShadow).toContain('rgba(255,255,255,');
  });

  it('neo inputFocus has inset + focus ring', () => {
    const raw = resolveSurfaceStyles('neo', COLORS);
    const css = surfaceToCSS(raw, 0.5, 0);
    expect(css.inputFocus.boxShadow).toContain('inset');
    expect(css.inputFocus.boxShadow).toMatch(/0px 0px 0px 3px rgba\(/);
  });

  // --- All 6 surface types produce valid CSS ---

  for (const surfaceType of ['elevated', 'flat', 'outlined', 'glass', 'bold', 'neo'] as const) {
    it(`${surfaceType}: all categories have backgroundColor`, () => {
      const raw = resolveSurfaceStyles(surfaceType, COLORS);
      const css = surfaceToCSS(raw, 0.5, 0);
      for (const cat of ['card', 'input', 'buttonPrimary', 'buttonSecondary', 'modal'] as const) {
        expect(css[cat].backgroundColor).toBeTruthy();
      }
    });
  }
});
