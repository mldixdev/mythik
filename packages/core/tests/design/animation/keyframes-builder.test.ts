import { describe, it, expect } from 'vitest';
import {
  normalizeKeyframeSnapshot,
  parseAtToFraction,
  buildKeyframes,
} from '../../../src/design/animation/keyframes-builder.js';
import type { KeyframeSnapshot } from '../../../src/design/animation/types.js';

describe('parseAtToFraction', () => {
  it('0% → 0', () => {
    expect(parseAtToFraction('0%')).toBe(0);
  });
  it('100% → 1', () => {
    expect(parseAtToFraction('100%')).toBe(1);
  });
  it('50% → 0.5', () => {
    expect(parseAtToFraction('50%')).toBe(0.5);
  });
  it('12.5% → 0.125', () => {
    expect(parseAtToFraction('12.5%')).toBe(0.125);
  });
  it('throws on non-percent', () => {
    expect(() => parseAtToFraction('half')).toThrow(/invalid at/i);
  });
  it('throws on negative percent (out of range)', () => {
    expect(() => parseAtToFraction('-10%')).toThrow(/\[0%, 100%\]/);
  });
  it('throws on percent > 100 (out of range)', () => {
    expect(() => parseAtToFraction('120%')).toThrow(/\[0%, 100%\]/);
  });
});

describe('normalizeKeyframeSnapshot', () => {
  it('empty snapshot yields fraction only', () => {
    const kf: KeyframeSnapshot = { at: '0%' };
    const norm = normalizeKeyframeSnapshot(kf);
    expect(norm.fraction).toBe(0);
    expect(norm.opacity).toBeUndefined();
    expect(norm.transformCSS).toBeUndefined();
  });

  it('opacity passes through', () => {
    const norm = normalizeKeyframeSnapshot({ at: '0%', opacity: 0.5 });
    expect(norm.opacity).toBe(0.5);
  });

  it('translateY number → px', () => {
    const norm = normalizeKeyframeSnapshot({
      at: '0%',
      transform: { translateY: 20 },
    });
    expect(norm.transformCSS).toBe('translateY(20px)');
    expect(norm.transformRN?.translateY).toBe(20);
  });

  it('translateX number → px', () => {
    const norm = normalizeKeyframeSnapshot({
      at: '0%',
      transform: { translateX: -40 },
    });
    expect(norm.transformCSS).toBe('translateX(-40px)');
    expect(norm.transformRN?.translateX).toBe(-40);
  });

  it('translateY string passthrough', () => {
    const norm = normalizeKeyframeSnapshot({
      at: '0%',
      transform: { translateY: '2rem' },
    });
    expect(norm.transformCSS).toBe('translateY(2rem)');
  });

  it('scale number → scale(<n>)', () => {
    const norm = normalizeKeyframeSnapshot({
      at: '0%',
      transform: { scale: 0.95 },
    });
    expect(norm.transformCSS).toBe('scale(0.95)');
    expect(norm.transformRN?.scale).toBe(0.95);
  });

  it('scale {x,y} → scale(<x>, <y>)', () => {
    const norm = normalizeKeyframeSnapshot({
      at: '0%',
      transform: { scale: { x: 1, y: 1.1 } },
    });
    expect(norm.transformCSS).toBe('scale(1, 1.1)');
    expect(norm.transformRN?.scaleX).toBe(1);
    expect(norm.transformRN?.scaleY).toBe(1.1);
  });

  it('rotate number → CSS deg + RN rotateDeg numeric', () => {
    const norm = normalizeKeyframeSnapshot({
      at: '0%',
      transform: { rotate: 45 },
    });
    expect(norm.transformCSS).toBe('rotate(45deg)');
    expect(norm.transformRN?.rotateDeg).toBe(45);
  });

  it('rotate "45deg" string → CSS passthrough + RN rotateDeg numeric', () => {
    const norm = normalizeKeyframeSnapshot({
      at: '0%',
      transform: { rotate: '45deg' },
    });
    expect(norm.transformCSS).toBe('rotate(45deg)');
    expect(norm.transformRN?.rotateDeg).toBe(45);
  });

  it('rotate "0.25turn" string → CSS passthrough, RN omitted (non-deg unit)', () => {
    const norm = normalizeKeyframeSnapshot({
      at: '0%',
      transform: { rotate: '0.25turn' },
    });
    expect(norm.transformCSS).toBe('rotate(0.25turn)');
    expect(norm.transformRN?.rotateDeg).toBeUndefined();
  });

  it('skewX number → CSS deg + RN skewXDeg numeric', () => {
    const norm = normalizeKeyframeSnapshot({
      at: '0%',
      transform: { skewX: 10 },
    });
    expect(norm.transformCSS).toBe('skewX(10deg)');
    expect(norm.transformRN?.skewXDeg).toBe(10);
  });

  it('skewY number → CSS deg + RN skewYDeg numeric', () => {
    const norm = normalizeKeyframeSnapshot({
      at: '0%',
      transform: { skewY: 5 },
    });
    expect(norm.transformCSS).toBe('skewY(5deg)');
    expect(norm.transformRN?.skewYDeg).toBe(5);
  });

  it('combined transform in order translate → scale → rotate → skew', () => {
    const norm = normalizeKeyframeSnapshot({
      at: '50%',
      transform: { translateY: 10, scale: 1.05, rotate: 5, skewX: 2 },
    });
    expect(norm.transformCSS).toBe('translateY(10px) scale(1.05) rotate(5deg) skewX(2deg)');
  });

  it('colors pass through', () => {
    const norm = normalizeKeyframeSnapshot({
      at: '0%',
      backgroundColor: '#ff0000',
      borderColor: 'rgb(0,0,0)',
      color: 'white',
    });
    expect(norm.backgroundColor).toBe('#ff0000');
    expect(norm.borderColor).toBe('rgb(0,0,0)');
    expect(norm.color).toBe('white');
  });

  it('borderRadius number → px, string passthrough (including decimals)', () => {
    expect(normalizeKeyframeSnapshot({ at: '0%', borderRadius: 8 }).borderRadius).toBe('8px');
    expect(normalizeKeyframeSnapshot({ at: '0%', borderRadius: 8.5 }).borderRadius).toBe('8.5px');
    expect(normalizeKeyframeSnapshot({ at: '0%', borderRadius: '50%' }).borderRadius).toBe('50%');
  });

  it('filter object → CSS string', () => {
    const norm = normalizeKeyframeSnapshot({
      at: '0%',
      filter: { blur: 4, brightness: 1.2 },
    });
    expect(norm.filterCSS).toBe('blur(4px) brightness(1.2)');
  });

  it('boxShadow string → passthrough on the normalized keyframe (web-only field)', () => {
    const norm = normalizeKeyframeSnapshot({
      at: '0%',
      boxShadow: '0 0 20px 4px rgba(99,102,241,0.45)',
    });
    expect(norm.boxShadow).toBe('0 0 20px 4px rgba(99,102,241,0.45)');
  });

  it('boxShadow "none" passes through literally', () => {
    const norm = normalizeKeyframeSnapshot({ at: '0%', boxShadow: 'none' });
    expect(norm.boxShadow).toBe('none');
  });

  it('absent boxShadow leaves the field undefined', () => {
    const norm = normalizeKeyframeSnapshot({ at: '0%', opacity: 1 });
    expect(norm.boxShadow).toBeUndefined();
  });
});

describe('buildKeyframes', () => {
  it('maps a keyframe array to normalized keyframes', () => {
    const out = buildKeyframes([
      { at: '0%', opacity: 0 },
      { at: '100%', opacity: 1 },
    ]);
    expect(out.length).toBe(2);
    expect(out[0].fraction).toBe(0);
    expect(out[1].fraction).toBe(1);
    expect(out[0].opacity).toBe(0);
    expect(out[1].opacity).toBe(1);
  });

  it('empty array → empty output', () => {
    expect(buildKeyframes([])).toEqual([]);
  });
});
