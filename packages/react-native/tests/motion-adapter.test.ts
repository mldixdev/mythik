import { describe, it, expect } from 'vitest';
import { toMotionViewProps, mergeInteractionStyles } from '../src/motion-adapter.js';

describe('toMotionViewProps', () => {
  // === Core mapping ===
  it('maps motion.initial to from and motion.animate to animate', () => {
    const result = toMotionViewProps({ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } });
    expect(result.from).toEqual({ opacity: 0, translateY: 20 });
    expect(result.animate).toEqual({ opacity: 1, translateY: 0 });
  });

  it('maps x/y to translateX/translateY', () => {
    const result = toMotionViewProps({ initial: { x: -50, y: 30 }, animate: { x: 0, y: 0 } });
    expect(result.from).toEqual({ translateX: -50, translateY: 30 });
    expect(result.animate).toEqual({ translateX: 0, translateY: 0 });
  });

  it('maps exit props', () => {
    const result = toMotionViewProps({ exit: { opacity: 0, y: -10 } });
    expect(result.exit).toEqual({ opacity: 0, translateY: -10 });
  });

  it('passes through non-x/y props unchanged', () => {
    const result = toMotionViewProps({
      initial: { opacity: 0, scale: 0.8, rotate: '45deg' },
      animate: { opacity: 1, scale: 1, rotate: '0deg' },
    });
    expect(result.from).toEqual({ opacity: 0, scale: 0.8, rotate: '45deg' });
    expect(result.animate).toEqual({ opacity: 1, scale: 1, rotate: '0deg' });
  });

  it('returns empty object for undefined input', () => {
    const result = toMotionViewProps(undefined);
    expect(result).toEqual({});
  });

  it('handles motion with only animate (no initial)', () => {
    const result = toMotionViewProps({ animate: { opacity: 1 } });
    expect(result.from).toBeUndefined();
    expect(result.animate).toEqual({ opacity: 1 });
  });

  it('handles motion with empty objects', () => {
    const result = toMotionViewProps({ initial: {}, animate: {} });
    expect(result.from).toEqual({});
    expect(result.animate).toEqual({});
  });

  // === Duration conversion (always seconds → ms) ===
  it('converts duration from seconds to ms', () => {
    const result = toMotionViewProps({ transition: { duration: 0.3 } });
    expect(result.transition).toMatchObject({ type: 'timing', duration: 300 });
  });

  it('converts duration of 10 seconds correctly (no heuristic)', () => {
    const result = toMotionViewProps({ transition: { duration: 10 } });
    expect(result.transition).toMatchObject({ type: 'timing', duration: 10000 });
  });

  it('converts delay from seconds to ms', () => {
    const result = toMotionViewProps({ transition: { duration: 0.5, delay: 0.2 } });
    expect(result.transition).toMatchObject({ type: 'timing', duration: 500, delay: 200 });
  });

  // === Spring transitions ===
  it('preserves spring type with physics config', () => {
    const result = toMotionViewProps({ transition: { type: 'spring', damping: 15, stiffness: 150 } });
    expect(result.transition).toEqual({ type: 'spring', damping: 15, stiffness: 150 });
  });

  it('converts duration/delay in spring transitions (not bypassed)', () => {
    const result = toMotionViewProps({ transition: { type: 'spring', damping: 15, duration: 0.5, delay: 0.1 } });
    expect(result.transition).toMatchObject({ type: 'spring', damping: 15, duration: 500, delay: 100 });
  });

  it('handles spring with mass', () => {
    const result = toMotionViewProps({ transition: { type: 'spring', mass: 2, stiffness: 100, damping: 10 } });
    expect(result.transition).toEqual({ type: 'spring', mass: 2, stiffness: 100, damping: 10 });
  });

  // === Easing ===
  it('maps ease string to easing', () => {
    const result = toMotionViewProps({ transition: { duration: 0.3, ease: 'easeInOut' } });
    expect(result.transition).toMatchObject({ type: 'timing', duration: 300, easing: 'easeInOut' });
  });

  it('maps ease as cubic-bezier array to structured object', () => {
    const result = toMotionViewProps({ transition: { duration: 0.3, ease: [0.42, 0, 0.58, 1] } });
    expect(result.transition?.easing).toEqual({ type: 'bezier', x1: 0.42, y1: 0, x2: 0.58, y2: 1 });
  });

  it('maps linear ease correctly', () => {
    const result = toMotionViewProps({ transition: { duration: 0.5, ease: 'linear' } });
    expect(result.transition).toMatchObject({ easing: 'linear' });
  });

  it('passes through unknown ease values as string', () => {
    const result = toMotionViewProps({ transition: { duration: 0.3, ease: 'customEase' } });
    expect(result.transition?.easing).toBe('customEase');
  });

  // === Stagger support ===
  it('converts staggerChildren from seconds to ms', () => {
    const result = toMotionViewProps({ transition: { staggerChildren: 0.05 } });
    expect(result.transition?.staggerChildren).toBe(50);
  });

  it('converts delayChildren from seconds to ms', () => {
    const result = toMotionViewProps({ transition: { delayChildren: 0.2 } });
    expect(result.transition?.delayChildren).toBe(200);
  });

  it('handles stagger with other transition props', () => {
    const result = toMotionViewProps({ transition: { duration: 0.3, staggerChildren: 0.1, delayChildren: 0.5 } });
    expect(result.transition).toMatchObject({ type: 'timing', duration: 300, staggerChildren: 100, delayChildren: 500 });
  });

  // === layoutId ===
  it('passes through layoutId', () => {
    const result = toMotionViewProps({ layoutId: 'card-1', animate: { opacity: 1 } });
    expect(result.layoutId).toBe('card-1');
  });

  it('does not set layoutId when not present', () => {
    const result = toMotionViewProps({ animate: { opacity: 1 } });
    expect(result.layoutId).toBeUndefined();
  });

  // === null handling ===
  it('handles null transition gracefully', () => {
    const result = toMotionViewProps({ initial: { opacity: 0 }, transition: null } as Record<string, unknown>);
    expect(result.transition).toBeUndefined();
    expect(result.from).toEqual({ opacity: 0 });
  });
});

describe('mergeInteractionStyles', () => {
  it('merges hover and active into pressed styles', () => {
    const hover = { backgroundColor: '#E0F2F1' };
    const active = { transform: [{ scale: 0.97 }] };
    const result = mergeInteractionStyles(hover, active);
    expect(result).toEqual({ backgroundColor: '#E0F2F1', transform: [{ scale: 0.97 }] });
  });

  it('handles hover only', () => {
    const result = mergeInteractionStyles({ opacity: 0.8 }, undefined);
    expect(result).toEqual({ opacity: 0.8 });
  });

  it('handles active only', () => {
    const result = mergeInteractionStyles(undefined, { transform: [{ scale: 0.95 }] });
    expect(result).toEqual({ transform: [{ scale: 0.95 }] });
  });

  it('returns undefined when neither provided', () => {
    const result = mergeInteractionStyles(undefined, undefined);
    expect(result).toBeUndefined();
  });

  it('active overrides hover for conflicting keys', () => {
    const hover = { backgroundColor: '#E0F2F1', opacity: 0.9 };
    const active = { backgroundColor: '#B2DFDB', transform: [{ scale: 0.97 }] };
    const result = mergeInteractionStyles(hover, active);
    expect(result).toEqual({ backgroundColor: '#B2DFDB', opacity: 0.9, transform: [{ scale: 0.97 }] });
  });
});
