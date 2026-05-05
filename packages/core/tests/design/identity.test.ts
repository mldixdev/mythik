import { describe, it, expect } from 'vitest';
import { resolveSurfaceStyles } from '../../src/design/identity/index.js';

const COLORS = { surface: '#ffffff', background: '#f8fafc', border: '#d1d5db', primary: '#6366f1', text: '#0f172a' };

describe('resolveSurfaceStyles', () => {
  it('elevated: card has 2 shadows and a border', () => {
    const s = resolveSurfaceStyles('elevated', COLORS);
    expect(s.card.shadows).toHaveLength(2);
    expect(s.card.shadows[0].inset).toBe(false);
    expect(s.card.shadows[1].inset).toBe(false);
    expect(s.card.border).toEqual({ width: 1, style: 'solid', color: '#d1d5db' });
    expect(s.card.backgroundColor).toBe('#ffffff');
    expect(s.card.color).toBe('#0f172a');
  });

  it('elevated: input has 1 inset shadow', () => {
    const s = resolveSurfaceStyles('elevated', COLORS);
    expect(s.input.shadows).toHaveLength(1);
    expect(s.input.shadows[0].inset).toBe(true);
  });

  it('elevated: inputFocus has focus ring shadow with spread', () => {
    const s = resolveSurfaceStyles('elevated', COLORS);
    expect(s.inputFocus.shadows).toHaveLength(1);
    expect(s.inputFocus.shadows[0].spread).toBe(3);
    expect(s.inputFocus.shadows[0].magnitude).toBe(0);
    expect(s.inputFocus.shadows[0].blur).toBe(0);
    expect(s.inputFocus.shadows[0].color).toEqual({ r: 99, g: 102, b: 241 }); // #6366f1
  });

  it('elevated: buttonPrimary has 1 shadow, no border', () => {
    const s = resolveSurfaceStyles('elevated', COLORS);
    expect(s.buttonPrimary.shadows).toHaveLength(1);
    expect(s.buttonPrimary.border).toBeUndefined();
    expect(s.buttonPrimary.backgroundColor).toBe('#6366f1');
    expect(s.buttonPrimary.color).toBe('#fff');
  });

  it('elevated: modal has 2 larger shadows', () => {
    const s = resolveSurfaceStyles('elevated', COLORS);
    expect(s.modal.shadows).toHaveLength(2);
    expect(s.modal.shadows[0].magnitude).toBe(8);
    expect(s.modal.shadows[1].magnitude).toBe(2);
  });

  it('outlined: card has border, transparent bg, no shadows', () => {
    const s = resolveSurfaceStyles('outlined', COLORS);
    expect(s.card.border).toEqual({ width: 1, style: 'solid', color: '#d1d5db' });
    expect(s.card.backgroundColor).toBe('transparent');
    expect(s.card.shadows).toHaveLength(0);
  });

  it('glass: card has blur, backgroundOpacity, and semi-transparent border', () => {
    const s = resolveSurfaceStyles('glass', COLORS);
    expect(s.card.blur).toEqual({ radius: 16 });
    expect(s.card.backgroundOpacity).toBe(0.6);
    expect(s.card.backgroundColor).toBe('#ffffff');
    expect(s.card.border).toBeDefined();
    expect(s.card.border!.color).toContain('rgba(');
  });

  it('glass: modal has stronger blur than card', () => {
    const s = resolveSurfaceStyles('glass', COLORS);
    expect(s.modal.blur!.radius).toBe(24);
    expect(s.card.blur!.radius).toBe(16);
  });

  it('glass: input has blur', () => {
    const s = resolveSurfaceStyles('glass', COLORS);
    expect(s.input.blur).toEqual({ radius: 8 });
    expect(s.input.backgroundOpacity).toBe(0.4);
  });

  it('glass: buttonPrimary has blur, no border', () => {
    const s = resolveSurfaceStyles('glass', COLORS);
    expect(s.buttonPrimary.blur).toEqual({ radius: 8 });
    expect(s.buttonPrimary.border).toBeUndefined();
  });

  it('bold: card has thick border using text color', () => {
    const s = resolveSurfaceStyles('bold', { ...COLORS, text: '#111' });
    expect(s.card.border).toEqual({ width: 3, style: 'solid', color: '#111' });
    expect(s.card.shadows).toHaveLength(0);
  });

  it('flat: card has no border and no shadows', () => {
    const s = resolveSurfaceStyles('flat', COLORS);
    expect(s.card.border).toBeUndefined();
    expect(s.card.shadows).toHaveLength(0);
    expect(s.card.backgroundColor).toBe('#ffffff');
  });

  it('flat: input uses background color', () => {
    const s = resolveSurfaceStyles('flat', COLORS);
    expect(s.input.backgroundColor).toBe('#f8fafc');
    expect(s.input.border).toBeUndefined();
  });

  it('flat: buttonSecondary uses background, no border', () => {
    const s = resolveSurfaceStyles('flat', COLORS);
    expect(s.buttonSecondary.backgroundColor).toBe('#f8fafc');
    expect(s.buttonSecondary.border).toBeUndefined();
  });

  it('neo: card has 2 outset shadows (dark + light), no border', () => {
    const s = resolveSurfaceStyles('neo', COLORS);
    expect(s.card.shadows).toHaveLength(2);
    expect(s.card.shadows[0].color).toEqual({ r: 0, g: 0, b: 0 });
    expect(s.card.shadows[1].color).toEqual({ r: 255, g: 255, b: 255 });
    expect(s.card.border).toBeUndefined();
  });

  it('neo: input has 2 inset shadows (pressed feel)', () => {
    const s = resolveSurfaceStyles('neo', COLORS);
    expect(s.input.shadows).toHaveLength(2);
    expect(s.input.shadows[0].inset).toBe(true);
    expect(s.input.shadows[1].inset).toBe(true);
  });

  it('neo: inputFocus has 3 shadows (2 inset + 1 focus ring)', () => {
    const s = resolveSurfaceStyles('neo', COLORS);
    expect(s.inputFocus.shadows).toHaveLength(3);
    expect(s.inputFocus.shadows[0].inset).toBe(true);
    expect(s.inputFocus.shadows[1].inset).toBe(true);
    expect(s.inputFocus.shadows[2].inset).toBe(false);
    expect(s.inputFocus.shadows[2].spread).toBe(3);
  });

  it('all 6 component categories are present', () => {
    const s = resolveSurfaceStyles('elevated', COLORS);
    expect(s.card).toBeDefined();
    expect(s.input).toBeDefined();
    expect(s.inputFocus).toBeDefined();
    expect(s.buttonPrimary).toBeDefined();
    expect(s.buttonSecondary).toBeDefined();
    expect(s.modal).toBeDefined();
  });

  it('bold inputFocus maintains 2px border', () => {
    const s = resolveSurfaceStyles('bold', COLORS);
    expect(s.inputFocus.border).toEqual({ width: 2, style: 'solid', color: '#6366f1' });
  });

  it('flat inputFocus has no border, only focus ring', () => {
    const s = resolveSurfaceStyles('flat', COLORS);
    expect(s.inputFocus.border).toBeUndefined();
    expect(s.inputFocus.shadows).toHaveLength(1);
    expect(s.inputFocus.shadows[0].spread).toBe(3);
  });

  it('outlined buttonPrimary has primary color text and border', () => {
    const s = resolveSurfaceStyles('outlined', { ...COLORS, primary: '#0D9488' });
    expect(s.buttonPrimary.color).toBe('#0D9488');
    expect(s.buttonPrimary.border).toEqual({ width: 1, style: 'solid', color: '#0D9488' });
    expect(s.buttonPrimary.backgroundColor).toBe('transparent');
  });

  it('bold buttonSecondary is transparent with thick border', () => {
    const s = resolveSurfaceStyles('bold', COLORS);
    expect(s.buttonSecondary.backgroundColor).toBe('transparent');
    expect(s.buttonSecondary.border).toEqual({ width: 2, style: 'solid', color: '#0f172a' });
  });

  // --- cardLine ---

  it('cardLine adds structured border to specific sides', () => {
    const s = resolveSurfaceStyles('elevated', COLORS, { accent: '#F59E0B', cardLine: ['top', 'left'] });
    expect(s.card.borderTop).toEqual({ width: 3, style: 'solid', color: '#F59E0B' });
    expect(s.card.borderLeft).toEqual({ width: 3, style: 'solid', color: '#F59E0B' });
    expect(s.card.borderBottom).toBeUndefined();
    expect(s.card.borderRight).toBeUndefined();
  });

  // --- accentButtons ---

  it('accentButtons uses accent for buttonPrimary', () => {
    const s = resolveSurfaceStyles('elevated', COLORS, { accent: '#F59E0B', accentButtons: true });
    expect(s.buttonPrimary.backgroundColor).toBe('#F59E0B');
  });

  // --- Shadow structure (raw, no depth/angle applied) ---

  it('elevated card shadow defs have correct magnitudes', () => {
    const s = resolveSurfaceStyles('elevated', COLORS);
    expect(s.card.shadows[0].magnitude).toBe(1);
    expect(s.card.shadows[0].blur).toBe(3);
    expect(s.card.shadows[1].magnitude).toBe(4);
    expect(s.card.shadows[1].blur).toBe(12);
  });

  it('neo card shadow defs have correct structure', () => {
    const s = resolveSurfaceStyles('neo', COLORS);
    expect(s.card.shadows[0].magnitude).toBe(4);
    expect(s.card.shadows[0].blur).toBe(8);
    expect(s.card.shadows[0].color).toEqual({ r: 0, g: 0, b: 0 });
    expect(s.card.shadows[1].magnitude).toBe(4);
    expect(s.card.shadows[1].color).toEqual({ r: 255, g: 255, b: 255 });
    expect(s.card.shadows[1].opacity).toBe(0.7);
  });

  // --- focusColor ---

  it('focusColor overrides primary for focus ring', () => {
    const s = resolveSurfaceStyles('elevated', COLORS, { focusColor: '#f59e0b' });
    const ringColor = s.inputFocus.shadows[0].color;
    expect(ringColor).toEqual({ r: 245, g: 158, b: 11 }); // #f59e0b
  });

  it('without focusColor, focus ring uses primary (default)', () => {
    const s = resolveSurfaceStyles('elevated', COLORS);
    const ringColor = s.inputFocus.shadows[0].color;
    expect(ringColor).toEqual({ r: 99, g: 102, b: 241 }); // #6366f1
  });
});
