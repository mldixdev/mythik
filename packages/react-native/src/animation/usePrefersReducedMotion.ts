// usePrefersReducedMotion (RN) — subscribes to AccessibilityInfo.
// Returns true when the user has requested reduced motion at the OS level.
// Optional `override` lets consumers force a value (useful for testing and
// app-level opt-ins bypassing the OS setting).

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

type Subscription = { remove?: () => void } | void;

export function usePrefersReducedMotion(override?: boolean): boolean {
  const [reduced, setReduced] = useState(override ?? false);

  useEffect(() => {
    if (override !== undefined) {
      setReduced(override);
      return;
    }
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => {
      if (mounted) setReduced(v);
    });
    const sub: Subscription = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      (v: boolean) => setReduced(v),
    );
    return () => {
      mounted = false;
      if (sub && typeof sub.remove === 'function') sub.remove();
    };
  }, [override]);

  return reduced;
}
