import { describe, it, expect } from 'vitest';
import { resolveSurfaceStyles } from '../../src/design/identity/index.js';
import { surfaceToRN } from '../../src/design/surface-to-rn.js';

const COLORS = { surface: '#ffffff', background: '#f8fafc', border: '#d1d5db', primary: '#6366f1', text: '#0f172a' };

describe('surfaceToRN', () => {
  // --- Border conversion ---

  it('converts border to RN props', () => {
    const raw = resolveSurfaceStyles('elevated', COLORS);
    const rn = surfaceToRN(raw, 0.5, 0);
    expect(rn.card.borderWidth).toBe(1);
    expect(rn.card.borderStyle).toBe('solid');
    expect(rn.card.borderColor).toBe('#d1d5db');
  });

  it('no border props when border is undefined', () => {
    const raw = resolveSurfaceStyles('flat', COLORS);
    const rn = surfaceToRN(raw, 0.5, 0);
    expect(rn.card.borderWidth).toBeUndefined();
    expect(rn.card.borderColor).toBeUndefined();
  });

  // --- BUG FIX: cardLine side borders ---

  it('cardLine borderTop converts to borderTopWidth/borderTopColor', () => {
    const raw = resolveSurfaceStyles('elevated', COLORS, { accent: '#F59E0B', cardLine: ['top', 'left'] });
    const rn = surfaceToRN(raw, 0.5, 0);
    expect(rn.card.borderTopWidth).toBe(3);
    expect(rn.card.borderTopColor).toBe('#F59E0B');
    expect(rn.card.borderTopStyle).toBe('solid');
    expect(rn.card.borderLeftWidth).toBe(3);
    expect(rn.card.borderLeftColor).toBe('#F59E0B');
  });

  // --- Shadow conversion ---

  it('elevated card uses largest non-inset shadow (magnitude=4, not magnitude=1)', () => {
    const raw = resolveSurfaceStyles('elevated', COLORS);
    const rn = surfaceToRN(raw, 0.5, 0);
    // At depth=0.5, depthScale=1.0, so blur=12*1=12 for the magnitude=4 shadow
    expect(rn.card.shadowRadius).toBe(12);
    expect(rn.card.shadowColor).toBeDefined();
    expect(rn.card.elevation).toBe(4); // Math.round(12/3) = 4
  });

  // --- BUG FIX: neo inset shadows produce outset card shadow ---

  it('neo card has shadow props (non-inset shadows available)', () => {
    const raw = resolveSurfaceStyles('neo', COLORS);
    const rn = surfaceToRN(raw, 0.5, 0);
    expect(rn.card.shadowRadius).toBeGreaterThan(0);
    expect(rn.card.shadowOpacity).toBeGreaterThan(0);
  });

  it('neo input skips inset shadows (RN unsupported)', () => {
    const raw = resolveSurfaceStyles('neo', COLORS);
    const rn = surfaceToRN(raw, 0.5, 0);
    expect(rn.input.shadowRadius).toBeUndefined();
    expect(rn.input.elevation).toBeUndefined();
  });

  // --- BUG FIX: focus ring ---

  it('focus ring appears as focusRing object', () => {
    const raw = resolveSurfaceStyles('elevated', COLORS);
    const rn = surfaceToRN(raw, 0.5, 0);
    expect(rn.inputFocus.focusRing).toBeDefined();
    expect(rn.inputFocus.focusRing!.width).toBe(3);
    expect(rn.inputFocus.focusRing!.color).toMatch(/^rgba\(/);
  });

  // --- Glass blur passthrough ---

  it('glass card passes blur through', () => {
    const raw = resolveSurfaceStyles('glass', COLORS);
    const rn = surfaceToRN(raw, 0.5, 0);
    expect(rn.card.blur).toEqual({ radius: 16 });
  });

  it('non-glass has no blur', () => {
    const raw = resolveSurfaceStyles('elevated', COLORS);
    const rn = surfaceToRN(raw, 0.5, 0);
    expect(rn.card.blur).toBeUndefined();
  });

  // --- backgroundOpacity → rgba ---

  it('glass background uses rgba', () => {
    const raw = resolveSurfaceStyles('glass', COLORS);
    const rn = surfaceToRN(raw, 0.5, 0);
    expect(rn.card.backgroundColor).toContain('rgba');
  });

  // --- Depth + angle applied ---

  it('depth=0 produces minimal shadow', () => {
    const raw = resolveSurfaceStyles('elevated', COLORS);
    const rn = surfaceToRN(raw, 0, 0);
    expect(rn.card.shadowOpacity).toBeLessThan(0.05);
  });

  it('angle=90 changes shadow offset direction', () => {
    const raw = resolveSurfaceStyles('elevated', COLORS);
    const rn0 = surfaceToRN(raw, 0.5, 0);
    const rn90 = surfaceToRN(raw, 0.5, 90);
    expect(rn0.card.shadowOffset).not.toEqual(rn90.card.shadowOffset);
  });

  // --- flat/outlined: no shadow props ---

  it('flat card has no shadow props', () => {
    const raw = resolveSurfaceStyles('flat', COLORS);
    const rn = surfaceToRN(raw, 0.5, 0);
    expect(rn.card.shadowRadius).toBeUndefined();
    expect(rn.card.elevation).toBeUndefined();
  });
});
