import { useEffect, useRef } from 'react';
import type { StateStore } from 'mythik';

/**
 * Auto-tracks device context and writes to /ui/device/* in the store.
 * Platform-specific: this implementation is for React web (uses window + matchMedia).
 * React Native would use Dimensions + Appearance instead.
 */
export function useDeviceContext(store: StateStore, enabled: boolean = true): void {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    function writeContext() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      store.set('/ui/device/viewportWidth', w);
      store.set('/ui/device/viewportHeight', h);
      store.set('/ui/device/platform', 'web');
      store.set('/ui/device/orientation', w > h ? 'landscape' : 'portrait');
      // Legacy path — existing specs may use $state: "/ui/viewportWidth" directly
      store.set('/ui/viewportWidth', w);
    }

    // Write initial values
    writeContext();

    // Detect OS color scheme (matchMedia may not exist in test environments)
    let darkQuery: MediaQueryList | null = null;
    let onColorChange: ((e: MediaQueryListEvent) => void) | null = null;
    if (typeof window.matchMedia === 'function') {
      darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
      store.set('/ui/device/colorScheme', darkQuery.matches ? 'dark' : 'light');
      onColorChange = (e: MediaQueryListEvent) => {
        store.set('/ui/device/colorScheme', e.matches ? 'dark' : 'light');
      };
      darkQuery.addEventListener('change', onColorChange);
    } else {
      store.set('/ui/device/colorScheme', 'light');
    }

    // Debounced resize handler
    const onResize = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(writeContext, 100);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      if (darkQuery && onColorChange) darkQuery.removeEventListener('change', onColorChange);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [store, enabled]);
}
