import { describe, it, expect } from 'vitest';
import type { Element, ElementAnimations } from '../../src/index.js';

describe('Element.animations field', () => {
  it('accepts an ElementAnimations value', () => {
    const animations: ElementAnimations = { mount: { recipe: 'fade-up' } };
    const el = {
      type: 'box',
      animations,
    } satisfies Element;
    expect(el.animations).toBe(animations);
  });

  it('accepts null per-trigger (disables inherited animations from cascade)', () => {
    const el = {
      type: 'box',
      animations: { mount: null, hover: { recipe: 'lift' } },
    } satisfies Element;
    expect(el.animations?.mount).toBeNull();
    expect(el.animations?.hover).toEqual({ recipe: 'lift' });
  });

  it('omits animations (field is optional)', () => {
    const el = { type: 'box' } satisfies Element;
    expect((el as Element).animations).toBeUndefined();
  });

  it('accepts an array of AnimationRef for parallel animations on one trigger', () => {
    const el = {
      type: 'box',
      animations: {
        mount: [{ recipe: 'fade' }, { recipe: 'scale-in' }],
      },
    } satisfies Element;
    expect(Array.isArray(el.animations?.mount)).toBe(true);
    expect((el.animations?.mount as unknown[]).length).toBe(2);
  });

  it('accepts null for the whole animations field (explicit disable)', () => {
    const el = {
      type: 'box',
      animations: null,
    } satisfies Element;
    expect(el.animations).toBeNull();
  });

  it('accepts StateChangeAnimation on stateChange trigger (distinct shape from AnimationRef)', () => {
    const el = {
      type: 'box',
      animations: {
        stateChange: {
          watch: '/cart/count',
          on: 'increase',
          recipe: 'pop',
          duration: 300,
        },
      },
    } satisfies Element;
    const sc = el.animations?.stateChange as { watch: string; on: string; recipe: string };
    expect(sc.watch).toBe('/cart/count');
    expect(sc.on).toBe('increase');
    expect(sc.recipe).toBe('pop');
  });
});
