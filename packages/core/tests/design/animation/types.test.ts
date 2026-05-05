import { describe, it, expect } from 'vitest';
import type {
  AnimationSpec,
  AnimationRef,
  InlineAnimation,
  KeyframeSnapshot,
  TransformValue,
  FilterValue,
  StaggerConfig,
  StateChangeAnimation,
  ElementAnimations,
  AnimationTrigger,
} from '../../../src/design/animation/types.js';

describe('Animation types', () => {
  it('KeyframeSnapshot accepts at + transform + opacity', () => {
    const kf: KeyframeSnapshot = {
      at: '0%',
      opacity: 0,
      transform: { translateY: 20, scale: 0.95 },
    };
    expect(kf.at).toBe('0%');
    expect(kf.transform?.scale).toBe(0.95);
  });

  it('InlineAnimation requires keyframes + duration', () => {
    const anim: InlineAnimation = {
      keyframes: [
        { at: '0%', opacity: 0 },
        { at: '100%', opacity: 1 },
      ],
      duration: '200ms',
    };
    expect(anim.keyframes.length).toBe(2);
  });

  it('AnimationRef accepts recipe or inline', () => {
    const recipe: AnimationRef = { recipe: 'fade', duration: '200ms' };
    const inline: AnimationRef = {
      keyframes: [{ at: '0%' }, { at: '100%' }],
      duration: 300,
    };
    expect('recipe' in recipe).toBe(true);
    expect('keyframes' in inline).toBe(true);
  });

  it('ElementAnimations accepts null on any trigger', () => {
    const el: ElementAnimations = {
      mount: null,
      hover: { recipe: 'lift' },
      ambient: null,
    };
    expect(el.mount).toBeNull();
    expect(el.ambient).toBeNull();
  });

  it('AnimationTrigger enumerates all 7 triggers', () => {
    const triggers: AnimationTrigger[] = [
      'mount', 'unmount', 'hover', 'focus', 'active', 'ambient', 'stateChange',
    ];
    expect(triggers.length).toBe(7);
  });

  it('StateChangeAnimation accepts watch + on patterns', () => {
    const sc: StateChangeAnimation = {
      watch: '/items/count',
      on: 'increase',
      recipe: 'pop',
      duration: '300ms',
    };
    expect(sc.watch).toBe('/items/count');
    const scEquals: StateChangeAnimation = {
      watch: '/status',
      on: { equals: 'error' },
      recipe: 'shake',
      duration: 300,
    };
    expect(typeof scEquals.on).toBe('object');
  });

  it('StaggerConfig delay + from', () => {
    const s: StaggerConfig = { delay: 80, from: 'center' };
    expect(s.from).toBe('center');
  });

  it('AnimationSpec has all normalized fields', () => {
    const spec: AnimationSpec = {
      keyframes: [{ at: '0%' }, { at: '100%' }],
      duration: 200,
      easing: 'ease-out',
      delay: 0,
      iterations: 1,
      direction: 'normal',
      fillMode: 'both',
      essential: false,
    };
    expect(spec.duration).toBe(200);
    expect(spec.fillMode).toBe('both');
  });

  it('TransformValue supports scalar and {x,y} scale', () => {
    const a: TransformValue = { scale: 1.05 };
    const b: TransformValue = { scale: { x: 1, y: 1.1 } };
    expect(a.scale).toBe(1.05);
    expect(typeof b.scale).toBe('object');
  });

  it('FilterValue accepts blur/brightness/saturate', () => {
    const f: FilterValue = { blur: 4, brightness: 1.2, saturate: 0.8 };
    expect(f.blur).toBe(4);
  });
});
