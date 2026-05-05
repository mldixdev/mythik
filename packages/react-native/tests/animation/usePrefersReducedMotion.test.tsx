import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { AccessibilityInfo } from 'react-native';
import { usePrefersReducedMotion } from '../../src/animation/usePrefersReducedMotion.js';

function Harness({ onValue, override }: { onValue: (v: boolean) => void; override?: boolean }) {
  const v = usePrefersReducedMotion(override);
  onValue(v);
  return null;
}

describe('usePrefersReducedMotion (RN)', () => {
  let originalIsReduce: typeof AccessibilityInfo.isReduceMotionEnabled;
  let originalAddListener: typeof AccessibilityInfo.addEventListener;

  beforeEach(() => {
    originalIsReduce = AccessibilityInfo.isReduceMotionEnabled;
    originalAddListener = AccessibilityInfo.addEventListener;
  });

  afterEach(() => {
    AccessibilityInfo.isReduceMotionEnabled = originalIsReduce;
    AccessibilityInfo.addEventListener = originalAddListener;
  });

  it('override=true immediately returns true', () => {
    const values: boolean[] = [];
    render(<Harness onValue={(v) => values.push(v)} override={true} />);
    expect(values[values.length - 1]).toBe(true);
  });

  it('override=false immediately returns false', () => {
    const values: boolean[] = [];
    render(<Harness onValue={(v) => values.push(v)} override={false} />);
    expect(values[values.length - 1]).toBe(false);
  });

  it('no override: initial state false until AccessibilityInfo resolves', () => {
    const values: boolean[] = [];
    render(<Harness onValue={(v) => values.push(v)} />);
    // Mock default isReduceMotionEnabled returns Promise<false>
    expect(values[0]).toBe(false);
  });

  it('cleanup on unmount removes event listener', () => {
    const removeSpy = vi.fn();
    AccessibilityInfo.addEventListener = vi.fn().mockImplementation(() => ({
      remove: removeSpy,
    })) as unknown as typeof AccessibilityInfo.addEventListener;

    const { unmount } = render(<Harness onValue={() => {}} />);
    unmount();
    expect(removeSpy).toHaveBeenCalled();
  });

  it('handles undefined addEventListener gracefully (older RN)', () => {
    AccessibilityInfo.addEventListener = undefined as unknown as typeof AccessibilityInfo.addEventListener;
    expect(() => {
      const { unmount } = render(<Harness onValue={() => {}} />);
      unmount();
    }).not.toThrow();
  });
});
