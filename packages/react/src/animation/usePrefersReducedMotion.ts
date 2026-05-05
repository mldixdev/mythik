// usePrefersReducedMotion — subscribes to OS reduced-motion preference.
// Returns `true` when the user has requested reduced motion at the OS level.
// The optional `override` parameter lets the consumer force a value (useful
// for testing and for app-level opt-ins that bypass the OS setting).
// SSR-safe: returns false when window is undefined.

import { useEffect, useState } from 'react';

export function usePrefersReducedMotion(override?: boolean): boolean {
  const [reduced, setReduced] = useState(() => {
    if (override !== undefined) return override;
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (override !== undefined) {
      setReduced(override);
      return;
    }
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setReduced(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [override]);

  return reduced;
}
