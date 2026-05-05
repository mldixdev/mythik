import { describe, it, expect } from 'vitest';
import { cssToNative } from '../src/css-to-native.js';

describe('cssToNative', () => {
  // === Passthrough ===
  it('passes through basic RN-compatible properties', () => {
    const result = cssToNative({ padding: 16, backgroundColor: '#fff', flex: 1, borderRadius: 8 });
    expect(result.style).toEqual({ padding: 16, backgroundColor: '#fff', flex: 1, borderRadius: 8 });
  });

  // === Unit stripping ===
  it('strips px units from numeric values', () => {
    const result = cssToNative({ padding: '16px', fontSize: '14px', lineHeight: '24px', gap: '12px' });
    expect(result.style).toEqual({ padding: 16, fontSize: 14, lineHeight: 24, gap: 12 });
  });

  it('converts em/rem to approximate px (1em ≈ 16px)', () => {
    const result = cssToNative({ fontSize: '1.5rem', padding: '2em' });
    expect(result.style).toEqual({ fontSize: 24, padding: 32 });
  });

  it('converts vh/vw to numeric via Dimensions', () => {
    // Mock Dimensions: width=390, height=844
    const result = cssToNative({ height: '50vh', width: '100vw' });
    expect(result.style).toEqual({ height: 422, width: 390 });
  });

  // === Box shadow ===
  it('translates boxShadow to RN shadow props + elevation', () => {
    const result = cssToNative({ boxShadow: '0 4px 12px rgba(0,0,0,0.15)' });
    expect(result.style).toMatchObject({
      shadowColor: 'rgba(0,0,0,0.15)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 12,
      elevation: 6,
    });
  });

  it('handles boxShadow with spread radius (4 values)', () => {
    const result = cssToNative({ boxShadow: '0 4px 12px 2px rgba(0,0,0,0.15)' });
    expect(result.style).toMatchObject({
      shadowColor: 'rgba(0,0,0,0.15)',
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 12,
      elevation: 6,
    });
  });

  it('handles boxShadow with inset keyword (strips inset)', () => {
    const result = cssToNative({ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' });
    expect(result.style).toMatchObject({
      shadowColor: 'rgba(0,0,0,0.1)',
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
    });
  });

  // === Web-only property stripping ===
  it('strips web-only properties silently', () => {
    const result = cssToNative({ cursor: 'pointer', userSelect: 'none', outline: 'none', backdropFilter: 'blur(10px)', padding: 8 });
    expect(result.style).toEqual({ padding: 8 });
  });

  it('strips grid and float properties', () => {
    const result = cssToNative({ float: 'left', gridTemplateColumns: '1fr 1fr', clear: 'both', flex: 1 });
    expect(result.style).toEqual({ flex: 1 });
  });

  it('returns empty style when all properties are ignored', () => {
    const result = cssToNative({ cursor: 'pointer', userSelect: 'none', filter: 'blur(5px)' });
    expect(result.style).toEqual({});
  });

  // === Position translation ===
  it('converts position fixed to absolute', () => {
    const result = cssToNative({ position: 'fixed', top: 0, left: 0 });
    expect(result.style).toEqual({ position: 'absolute', top: 0, left: 0 });
  });

  // === Display translation (S3) ===
  it('converts display block/inline to flex', () => {
    expect(cssToNative({ display: 'block' }).style).toEqual({ display: 'flex' });
    expect(cssToNative({ display: 'inline' }).style).toEqual({ display: 'flex' });
    expect(cssToNative({ display: 'inline-block' }).style).toEqual({ display: 'flex' });
  });

  it('preserves valid RN display values (flex, none)', () => {
    expect(cssToNative({ display: 'flex' }).style).toEqual({ display: 'flex' });
    expect(cssToNative({ display: 'none' }).style).toEqual({ display: 'none' });
  });

  // === Property renaming (S2) ===
  it('renames textDecoration to textDecorationLine', () => {
    const result = cssToNative({ textDecoration: 'underline' });
    expect(result.style).toEqual({ textDecorationLine: 'underline' });
  });

  // === Background translation (I5) ===
  it('translates background plain color to backgroundColor', () => {
    const result = cssToNative({ background: '#fff' });
    expect(result.style).toEqual({ backgroundColor: '#fff' });
  });

  it('translates background with rgb() color to backgroundColor', () => {
    const result = cssToNative({ background: 'rgb(255, 0, 0)' });
    expect(result.style).toEqual({ backgroundColor: 'rgb(255, 0, 0)' });
  });

  // === Linear gradient ===
  it('detects linear-gradient and flags for wrapper', () => {
    const result = cssToNative({ background: 'linear-gradient(135deg, #0D9488, #065F56)' });
    expect(result.needsGradient).toBe(true);
    expect(result.gradientConfig?.colors).toEqual(['#0D9488', '#065F56']);
  });

  it('handles linear-gradient with rgba() colors (C1)', () => {
    const result = cssToNative({ background: 'linear-gradient(180deg, rgba(0,0,0,0.5), rgba(255,255,255,0.8))' });
    expect(result.needsGradient).toBe(true);
    expect(result.gradientConfig?.colors).toEqual(['rgba(0,0,0,0.5)', 'rgba(255,255,255,0.8)']);
  });

  it('handles linear-gradient with keyword direction (C2)', () => {
    const result = cssToNative({ background: 'linear-gradient(to right, #0D9488, #065F56)' });
    expect(result.needsGradient).toBe(true);
    expect(result.gradientConfig?.colors).toEqual(['#0D9488', '#065F56']);
    // "to right" = 90deg → start: {x:0, y:0.5}, end: {x:1, y:0.5}
    expect(result.gradientConfig?.start?.x).toBeCloseTo(0, 1);
    expect(result.gradientConfig?.end?.x).toBeCloseTo(1, 1);
  });

  it('handles linear-gradient with negative angle', () => {
    const result = cssToNative({ background: 'linear-gradient(-45deg, #ff0000, #0000ff)' });
    expect(result.needsGradient).toBe(true);
    expect(result.gradientConfig?.colors).toEqual(['#ff0000', '#0000ff']);
  });

  it('computes start/end coordinates from angle (I4)', () => {
    // 0deg = bottom-to-top
    const result = cssToNative({ background: 'linear-gradient(0deg, #000, #fff)' });
    expect(result.gradientConfig?.start).toBeDefined();
    expect(result.gradientConfig?.end).toBeDefined();
    // 0deg: start at bottom, end at top
    expect(result.gradientConfig?.start?.y).toBeGreaterThan(result.gradientConfig?.end?.y ?? 0);
  });

  it('handles gradient with turn/grad/rad angle units', () => {
    // 0.25turn = 90deg
    const turn = cssToNative({ background: 'linear-gradient(0.25turn, #ff0000, #0000ff)' });
    expect(turn.needsGradient).toBe(true);
    expect(turn.gradientConfig?.start?.x).toBeCloseTo(0, 1);
    expect(turn.gradientConfig?.end?.x).toBeCloseTo(1, 1);

    // 100grad = 90deg
    const grad = cssToNative({ background: 'linear-gradient(100grad, red, blue)' });
    expect(grad.needsGradient).toBe(true);
    expect(grad.gradientConfig?.colors).toEqual(['red', 'blue']);
  });

  it('strips decimal percentage color stops from gradient colors', () => {
    const result = cssToNative({ background: 'linear-gradient(180deg, #000 33.3%, #fff 66.7%)' });
    expect(result.gradientConfig?.colors).toEqual(['#000', '#fff']);
  });

  it('handles backgroundImage with gradient', () => {
    const result = cssToNative({ backgroundImage: 'linear-gradient(90deg, red, blue)' });
    expect(result.needsGradient).toBe(true);
    expect(result.gradientConfig?.colors).toEqual(['red', 'blue']);
  });

  it('does not set needsGradient for non-gradient styles', () => {
    const result = cssToNative({ padding: 8, backgroundColor: '#fff' });
    expect(result.needsGradient).toBeUndefined();
    expect(result.gradientConfig).toBeUndefined();
  });

  // === Transform ===
  it('converts CSS transform string to RN transform array', () => {
    const result = cssToNative({ transform: 'rotate(45deg) scale(1.2)' });
    expect(result.style).toMatchObject({
      transform: [{ rotate: '45deg' }, { scale: 1.2 }],
    });
  });

  it('handles translateX/translateY with px in transform', () => {
    const result = cssToNative({ transform: 'translateX(10px) translateY(20px)' });
    expect(result.style).toMatchObject({
      transform: [{ translateX: 10 }, { translateY: 20 }],
    });
  });

  // === Memoization ===
  it('returns cached result for same style reference', () => {
    const style = { padding: 16, backgroundColor: '#fff' };
    const result1 = cssToNative(style);
    const result2 = cssToNative(style);
    expect(result1).toBe(result2);
  });

  // === Percentage conversion ===
  it('converts percentage padding to numeric via Dimensions', () => {
    const result = cssToNative({ paddingHorizontal: '5%' });
    // Mock Dimensions returns width: 390, so 5% = 19.5 → rounded to 20
    expect(typeof (result.style as Record<string, unknown>).paddingHorizontal).toBe('number');
    expect((result.style as Record<string, unknown>).paddingHorizontal).toBe(20);
  });

  it('converts percentage margin to numeric', () => {
    const result = cssToNative({ marginLeft: '10%' });
    // 10% of 390 = 39
    expect((result.style as Record<string, unknown>).marginLeft).toBe(39);
  });

  it('converts vertical percentage props using height', () => {
    const result = cssToNative({ paddingTop: '10%' });
    // 10% of 844 = 84.4 → 84
    expect((result.style as Record<string, unknown>).paddingTop).toBe(84);
  });

  // === Null / undefined / empty ===
  it('handles empty style object', () => {
    const result = cssToNative({});
    expect(result.style).toEqual({});
  });

  it('handles undefined gracefully', () => {
    const result = cssToNative(undefined as unknown as Record<string, unknown>);
    expect(result.style).toEqual({});
  });

  it('handles null gracefully', () => {
    const result = cssToNative(null as unknown as Record<string, unknown>);
    expect(result.style).toEqual({});
  });
});
