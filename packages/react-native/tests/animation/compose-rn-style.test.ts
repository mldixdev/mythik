import { describe, it, expect } from 'vitest';
import {
  composeRNStyle,
  type TriggerContribution,
  type InterpolateFn,
  type InterpolateColorFn,
} from '../../src/animation/compose-rn-style.js';
import { buildReanimatedSpec, resolveAnimation, ANIMATION_RECIPES } from 'mythik';
import type { AnimationSpec } from 'mythik';

// Simple linear interpolate matching Reanimated's end-state semantics.
const interp: InterpolateFn = (value, inputRange, outputRange) => {
  if (value <= inputRange[0]) return outputRange[0];
  const last = inputRange.length - 1;
  if (value >= inputRange[last]) return outputRange[last];
  for (let i = 0; i < last; i++) {
    if (value >= inputRange[i] && value <= inputRange[i + 1]) {
      const t = (value - inputRange[i]) / (inputRange[i + 1] - inputRange[i]);
      return outputRange[i] + t * (outputRange[i + 1] - outputRange[i]);
    }
  }
  return outputRange[0];
};

// Color interp placeholder: returns last color at value >= 1.
const interpColor: InterpolateColorFn = (value, inputRange, outputRange) => {
  if (value <= inputRange[0]) return outputRange[0];
  const last = inputRange.length - 1;
  if (value >= inputRange[last]) return outputRange[last];
  return outputRange[0];
};

function specForRecipe(name: string): AnimationSpec {
  return resolveAnimation({ recipe: name }, ANIMATION_RECIPES);
}

describe('composeRNStyle', () => {
  it('empty contributions → empty style', () => {
    expect(composeRNStyle([], interp, interpColor)).toEqual({});
  });

  it('fade-up at progress=1 → opacity 1 + translateY 0', () => {
    const spec = buildReanimatedSpec(specForRecipe('fade-up'));
    const style = composeRNStyle(
      [{ progress: 1, spec }],
      interp,
      interpColor,
    );
    expect(style.opacity).toBe(1);
    expect(style.transform).toEqual([{ translateY: 0 }]);
  });

  it('fade-up at progress=0 → opacity 0 + translateY 20', () => {
    const spec = buildReanimatedSpec(specForRecipe('fade-up'));
    const style = composeRNStyle(
      [{ progress: 0, spec }],
      interp,
      interpColor,
    );
    expect(style.opacity).toBe(0);
    expect(style.transform).toEqual([{ translateY: 20 }]);
  });

  it('spin at progress=1 → transform rotate 360deg (C1 regression)', () => {
    const spec = buildReanimatedSpec(specForRecipe('spin'));
    const style = composeRNStyle(
      [{ progress: 1, spec }],
      interp,
      interpColor,
    );
    expect(style.transform).toEqual([{ rotate: '360deg' }]);
  });

  it('pulse-primary at progress=0.5 → scale 1.05 (peak)', () => {
    const spec = buildReanimatedSpec(specForRecipe('pulse-primary'));
    const style = composeRNStyle(
      [{ progress: 0.5, spec }],
      interp,
      interpColor,
    );
    expect(style.transform).toEqual([{ scale: 1.05 }]);
  });

  it('lift hover at progress=1 → translateY -2 + scale 1.01', () => {
    const spec = buildReanimatedSpec(specForRecipe('lift'));
    const style = composeRNStyle(
      [{ progress: 1, spec }],
      interp,
      interpColor,
    );
    const transforms = style.transform as Array<Record<string, unknown>>;
    expect(transforms.find((t) => 'translateY' in t)?.translateY).toBe(-2);
    expect(transforms.find((t) => 'scale' in t)?.scale).toBe(1.01);
  });

  it('glow on RN: no animated style contributions (boxShadow is web-only)', () => {
    const spec = buildReanimatedSpec(specForRecipe('glow'));
    const style = composeRNStyle(
      [{ progress: 1, spec }],
      interp,
      interpColor,
    );
    // Glow migrated to boxShadow keyframes (Task 21). RN omits boxShadow
    // (same policy as filter) → no style produced. Hover stays a no-op.
    expect(Object.keys(style).length).toBe(0);
  });

  it('mount + ambient composed: both contributions present', () => {
    const fadeUp = buildReanimatedSpec(specForRecipe('fade-up'));
    const breathe = buildReanimatedSpec(specForRecipe('breathe-subtle'));
    const style = composeRNStyle(
      [
        { progress: 1, spec: fadeUp },
        { progress: 0.5, spec: breathe },
      ],
      interp,
      interpColor,
    );
    expect(style.opacity).toBe(1);
    const transforms = style.transform as Array<Record<string, unknown>>;
    expect(transforms).toContainEqual({ translateY: 0 });
    expect(transforms).toContainEqual({ scale: 1.025 });
  });

  it('later trigger scalar wins: opacity override', () => {
    const fadeUp = buildReanimatedSpec(specForRecipe('fade-up'));
    const shimmer = buildReanimatedSpec(specForRecipe('shimmer'));
    const style = composeRNStyle(
      [
        { progress: 1, spec: fadeUp },
        { progress: 0.5, spec: shimmer },
      ],
      interp,
      interpColor,
    );
    expect(style.opacity).toBe(0.85);
  });

  it('shake at progress=0.2 → translateX -8 (first oscillation peak)', () => {
    const spec = buildReanimatedSpec(specForRecipe('shake'));
    const style = composeRNStyle(
      [{ progress: 0.2, spec }],
      interp,
      interpColor,
    );
    expect(style.transform).toEqual([{ translateX: -8 }]);
  });

  it('duplicate scale transforms: last wins (C2 merge-by-key)', () => {
    const ambient = buildReanimatedSpec(specForRecipe('breathe-subtle'));
    const hover = buildReanimatedSpec(specForRecipe('lift'));
    // Both recipes animate scale at peak progress. After the merge,
    // only the LAST contribution's scale survives (hover's 1.01).
    const style = composeRNStyle(
      [
        { progress: 0.5, spec: ambient },  // scale 1.025 at peak (breathe-subtle retuned in Task 21)
        { progress: 1, spec: hover },      // scale 1.01 end
      ],
      interp,
      interpColor,
    );
    const transforms = style.transform as Array<Record<string, unknown>>;
    const scaleEntries = transforms.filter((t) => 'scale' in t);
    expect(scaleEntries.length).toBe(1);
    expect(scaleEntries[0].scale).toBe(1.01);
  });

  it('duplicate translateX transforms: last wins', () => {
    const shake = buildReanimatedSpec(specForRecipe('shake'));
    const slideLeft = buildReanimatedSpec(specForRecipe('slide-left'));
    const style = composeRNStyle(
      [
        { progress: 0.2, spec: shake },     // translateX -8
        { progress: 0.5, spec: slideLeft }, // translateX 20
      ],
      interp,
      interpColor,
    );
    const transforms = style.transform as Array<Record<string, unknown>>;
    const txEntries = transforms.filter((t) => 'translateX' in t);
    expect(txEntries.length).toBe(1);
    expect(txEntries[0].translateX).toBe(20);
  });

  it('different transform keys coexist (non-overlapping merge)', () => {
    const fadeUp = buildReanimatedSpec(specForRecipe('fade-up'));        // translateY
    const slideLeft = buildReanimatedSpec(specForRecipe('slide-left'));  // translateX
    const style = composeRNStyle(
      [
        { progress: 1, spec: fadeUp },
        { progress: 0.5, spec: slideLeft },
      ],
      interp,
      interpColor,
    );
    const transforms = style.transform as Array<Record<string, unknown>>;
    expect(transforms.filter((t) => 'translateX' in t).length).toBe(1);
    expect(transforms.filter((t) => 'translateY' in t).length).toBe(1);
  });

  it('transforms emitted in deterministic order', () => {
    // mixed keys; composer emits in TRANSFORM_KEYS_ORDER regardless of input order
    const mixed = buildReanimatedSpec({
      keyframes: [
        { at: '0%', transform: { rotate: 0, translateY: 0, scale: 1, translateX: 0 } },
        { at: '100%', transform: { rotate: 45, translateY: 10, scale: 1.1, translateX: 20 } },
      ],
      duration: 300,
      easing: 'ease-out',
      delay: 0,
      iterations: 1,
      direction: 'normal',
      fillMode: 'both',
      essential: false,
    });
    const style = composeRNStyle(
      [{ progress: 1, spec: mixed }],
      interp,
      interpColor,
    );
    const transforms = style.transform as Array<Record<string, unknown>>;
    const keys = transforms.map((t) => Object.keys(t)[0]);
    // Expected order: translateX, translateY, scale, rotate (from TRANSFORM_KEYS_ORDER)
    expect(keys.indexOf('translateX')).toBeLessThan(keys.indexOf('translateY'));
    expect(keys.indexOf('translateY')).toBeLessThan(keys.indexOf('scale'));
    expect(keys.indexOf('scale')).toBeLessThan(keys.indexOf('rotate'));
  });

  it('skew transforms emit deg strings', () => {
    const skewSpec = buildReanimatedSpec({
      keyframes: [
        { at: '0%', transform: { skewX: 0, skewY: 0 } },
        { at: '100%', transform: { skewX: 10, skewY: 5 } },
      ],
      duration: 300,
      easing: 'ease-out',
      delay: 0,
      iterations: 1,
      direction: 'normal',
      fillMode: 'both',
      essential: false,
    });
    const style = composeRNStyle(
      [{ progress: 1, spec: skewSpec }],
      interp,
      interpColor,
    );
    const transforms = style.transform as Array<Record<string, unknown>>;
    expect(transforms).toContainEqual({ skewX: '10deg' });
    expect(transforms).toContainEqual({ skewY: '5deg' });
  });
});
