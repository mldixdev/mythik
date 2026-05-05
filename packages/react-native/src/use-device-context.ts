import { useEffect, useRef } from 'react';
import { Dimensions, Platform, Appearance, PixelRatio } from 'react-native';
import type { StateStore } from 'mythik';

/** Status bar height on non-notch devices. Insets above this indicate a notch/Dynamic Island. */
const NOTCH_INSET_THRESHOLD = 20;

/**
 * Write device context to store (extracted for testability).
 * The hook calls this + subscribes to changes.
 */
export function writeDeviceContext(store: StateStore, insets?: { top: number; bottom: number; left: number; right: number }): void {
  const { width, height } = Dimensions.get('window');
  store.set('/ui/device/viewportWidth', width);
  store.set('/ui/device/viewportHeight', height);
  store.set('/ui/device/platform', Platform.OS);
  store.set('/ui/device/orientation', width > height ? 'landscape' : 'portrait');
  store.set('/ui/device/colorScheme', Appearance.getColorScheme() ?? 'light');
  store.set('/ui/device/scale', PixelRatio.get());
  // Legacy path for backwards compat with existing specs
  store.set('/ui/viewportWidth', width);

  if (insets) {
    store.set('/ui/device/insets', insets);
    store.set('/ui/device/hasNotch', insets.top > NOTCH_INSET_THRESHOLD);
  }
}

/**
 * Auto-tracks device context and writes to /ui/device/* in the store.
 * React Native implementation: uses Dimensions, Platform, Appearance, PixelRatio.
 * Subscribes to dimension changes (rotation) and appearance changes (dark mode).
 */
export function useDeviceContext(store: StateStore, enabled: boolean = true): void {
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (!enabled) return;

    // Write initial values (insets come from SafeAreaProvider context, injected separately)
    writeDeviceContext(store);

    // Subscribe to dimension changes (orientation, multitasking resize)
    const dimSub = Dimensions.addEventListener('change', ({ window }) => {
      if (!enabledRef.current) return;
      store.set('/ui/device/viewportWidth', window.width);
      store.set('/ui/device/viewportHeight', window.height);
      store.set('/ui/device/orientation', window.width > window.height ? 'landscape' : 'portrait');
      store.set('/ui/viewportWidth', window.width);
    });

    // Subscribe to appearance changes (dark mode toggle)
    const appearanceSub = Appearance.addChangeListener(({ colorScheme }) => {
      if (!enabledRef.current) return;
      store.set('/ui/device/colorScheme', colorScheme ?? 'light');
    });

    return () => {
      dimSub.remove();
      appearanceSub.remove();
    };
  }, [store, enabled]);
}
