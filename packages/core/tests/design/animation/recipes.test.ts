import { describe, it, expect } from 'vitest';
import { ANIMATION_RECIPES } from '../../../src/design/recipes/animations.js';

describe('ANIMATION_RECIPES', () => {
  it('ships all 15 curated recipes', () => {
    const names = Object.keys(ANIMATION_RECIPES);
    expect(names).toEqual(expect.arrayContaining([
      'fade', 'fade-up', 'fade-down', 'scale-in',
      'slide-left', 'slide-right',
      'lift', 'glow',
      'pulse-primary', 'breathe-subtle', 'shimmer', 'float',
      'pop', 'shake', 'spin',
    ]));
    expect(names.length).toBe(15);
  });

  it('every recipe has keyframes + duration', () => {
    for (const [name, recipe] of Object.entries(ANIMATION_RECIPES)) {
      expect(recipe.keyframes.length, `${name} must have keyframes`).toBeGreaterThan(0);
      expect(recipe.duration, `${name} must have duration`).toBeDefined();
    }
  });

  it('fade animates opacity 0→1', () => {
    const r = ANIMATION_RECIPES.fade;
    expect(r.keyframes[0].opacity).toBe(0);
    expect(r.keyframes[r.keyframes.length - 1].opacity).toBe(1);
  });

  it('fade-up animates opacity + translateY 20→0', () => {
    const r = ANIMATION_RECIPES['fade-up'];
    expect(r.keyframes[0].opacity).toBe(0);
    expect(r.keyframes[0].transform?.translateY).toBe(20);
    expect(r.keyframes[r.keyframes.length - 1].opacity).toBe(1);
    expect(r.keyframes[r.keyframes.length - 1].transform?.translateY).toBe(0);
  });

  it('scale-in uses scale 0.95→1', () => {
    const r = ANIMATION_RECIPES['scale-in'];
    expect(r.keyframes[0].transform?.scale).toBe(0.95);
    expect(r.keyframes[r.keyframes.length - 1].transform?.scale).toBe(1);
  });

  it('slide-left enters from +40 translateX', () => {
    const r = ANIMATION_RECIPES['slide-left'];
    expect(r.keyframes[0].transform?.translateX).toBe(40);
    expect(r.keyframes[r.keyframes.length - 1].transform?.translateX).toBe(0);
  });

  it('slide-right enters from -40 translateX, ends at 0', () => {
    const r = ANIMATION_RECIPES['slide-right'];
    expect(r.keyframes[0].transform?.translateX).toBe(-40);
    expect(r.keyframes[r.keyframes.length - 1].transform?.translateX).toBe(0);
  });

  it('lift uses fillMode=forwards', () => {
    const r = ANIMATION_RECIPES.lift;
    expect(r.fillMode).toBe('forwards');
    expect(r.keyframes[r.keyframes.length - 1].transform?.translateY).toBe(-2);
    expect(r.keyframes[r.keyframes.length - 1].transform?.scale).toBe(1.01);
  });

  it('glow uses fillMode=forwards', () => {
    const r = ANIMATION_RECIPES.glow;
    expect(r.fillMode).toBe('forwards');
  });

  it('ambient recipes loop infinite', () => {
    for (const name of ['pulse-primary', 'breathe-subtle', 'shimmer', 'float', 'spin']) {
      expect(ANIMATION_RECIPES[name].iterations, `${name} must loop infinite`).toBe('infinite');
    }
  });

  it('spin uses linear easing and rotates 0→360', () => {
    const r = ANIMATION_RECIPES.spin;
    expect(r.easing).toBe('linear');
    expect(r.keyframes[0].transform?.rotate).toBe(0);
    expect(r.keyframes[r.keyframes.length - 1].transform?.rotate).toBe(360);
  });

  it('pulse-primary has 3 stops: 1 → 1.05 → 1', () => {
    const r = ANIMATION_RECIPES['pulse-primary'];
    expect(r.keyframes.length).toBe(3);
    expect(r.keyframes[0].transform?.scale).toBe(1);
    expect(r.keyframes[1].transform?.scale).toBe(1.05);
    expect(r.keyframes[2].transform?.scale).toBe(1);
  });

  it('breathe-subtle scale 1 → 1.025 → 1 (Task 21 tuning — 1.5% → 2.5% for perceptibility)', () => {
    const r = ANIMATION_RECIPES['breathe-subtle'];
    expect(r.keyframes[1].transform?.scale).toBe(1.025);
    expect(r.duration).toBe(2800);
  });

  it('float translateY oscillates', () => {
    const r = ANIMATION_RECIPES.float;
    expect(r.keyframes.length).toBe(3);
    expect(r.keyframes[1].transform?.translateY).toBe(-6);
  });

  it('pop scale 1 → 1.1 → 1', () => {
    const r = ANIMATION_RECIPES.pop;
    expect(r.keyframes[1].transform?.scale).toBe(1.1);
  });

  it('shake oscillates translateX with at least 5 stops', () => {
    const r = ANIMATION_RECIPES.shake;
    expect(r.keyframes.length).toBeGreaterThanOrEqual(5);
  });

  // Recipe parity sanity (regression prevention for C1/C2):
  // Every non-web-only recipe must resolve AND produce ≥1 animated prop
  // on RN. If a recipe is static on RN without being in WEB_ONLY_RECIPES,
  // the extractor (reanimated-spec) is broken.
  it('every cross-platform recipe resolves and animates ≥1 prop on RN', async () => {
    const { WEB_ONLY_RECIPES } = await import('../../../src/design/recipes/animations.js');
    const { resolveAnimation } = await import('../../../src/design/animation/resolver.js');
    const { buildReanimatedSpec } = await import('../../../src/design/animation/reanimated-spec.js');
    for (const [name, recipe] of Object.entries(ANIMATION_RECIPES)) {
      if (WEB_ONLY_RECIPES.has(name)) continue;
      const spec = resolveAnimation(recipe, ANIMATION_RECIPES);
      const rn = buildReanimatedSpec(spec);
      const hasAnimated =
        rn.animatedProps.length > 0 || Object.keys(rn.animatedColorProps).length > 0;
      expect(hasAnimated, `recipe '${name}' produces no animated props on RN`).toBe(true);
    }
  });

  it('every web-only recipe does NOT animate on RN (policy audit)', async () => {
    const { WEB_ONLY_RECIPES } = await import('../../../src/design/recipes/animations.js');
    const { resolveAnimation } = await import('../../../src/design/animation/resolver.js');
    const { buildReanimatedSpec } = await import('../../../src/design/animation/reanimated-spec.js');
    for (const name of WEB_ONLY_RECIPES) {
      const recipe = ANIMATION_RECIPES[name];
      expect(recipe, `web-only recipe '${name}' must exist`).toBeDefined();
      const spec = resolveAnimation(recipe, ANIMATION_RECIPES);
      const rn = buildReanimatedSpec(spec);
      const hasAnimated =
        rn.animatedProps.length > 0 || Object.keys(rn.animatedColorProps).length > 0;
      expect(hasAnimated, `web-only recipe '${name}' unexpectedly animates on RN`).toBe(false);
    }
  });
});
