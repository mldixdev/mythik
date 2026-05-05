import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Dimensions, Appearance } from 'react-native';
import { writeDeviceContext } from '../src/use-device-context.js';

describe('writeDeviceContext', () => {
  let store: { set: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    store = { set: vi.fn() };
  });

  it('writes viewport dimensions', () => {
    writeDeviceContext(store as any);
    expect(store.set).toHaveBeenCalledWith('/ui/device/viewportWidth', 390);
    expect(store.set).toHaveBeenCalledWith('/ui/device/viewportHeight', 844);
  });

  it('writes platform', () => {
    writeDeviceContext(store as any);
    expect(store.set).toHaveBeenCalledWith('/ui/device/platform', 'ios');
  });

  it('writes orientation as portrait when height > width', () => {
    writeDeviceContext(store as any);
    expect(store.set).toHaveBeenCalledWith('/ui/device/orientation', 'portrait');
  });

  it('writes orientation as landscape when width > height', () => {
    const origGet = Dimensions.get;
    Dimensions.get = () => ({ width: 844, height: 390 }) as any;
    try {
      writeDeviceContext(store as any);
      expect(store.set).toHaveBeenCalledWith('/ui/device/orientation', 'landscape');
    } finally {
      Dimensions.get = origGet;
    }
  });

  it('writes colorScheme', () => {
    writeDeviceContext(store as any);
    expect(store.set).toHaveBeenCalledWith('/ui/device/colorScheme', 'light');
  });

  it('defaults colorScheme to light when Appearance returns null', () => {
    const origGetColorScheme = Appearance.getColorScheme;
    Appearance.getColorScheme = () => null as any;
    try {
      writeDeviceContext(store as any);
      expect(store.set).toHaveBeenCalledWith('/ui/device/colorScheme', 'light');
    } finally {
      Appearance.getColorScheme = origGetColorScheme;
    }
  });

  it('writes scale', () => {
    writeDeviceContext(store as any);
    expect(store.set).toHaveBeenCalledWith('/ui/device/scale', 3);
  });

  it('writes legacy viewportWidth for backwards compat', () => {
    writeDeviceContext(store as any);
    expect(store.set).toHaveBeenCalledWith('/ui/viewportWidth', 390);
  });

  it('writes insets and hasNotch when insets provided', () => {
    const insets = { top: 47, bottom: 34, left: 0, right: 0 };
    writeDeviceContext(store as any, insets);
    expect(store.set).toHaveBeenCalledWith('/ui/device/insets', insets);
    expect(store.set).toHaveBeenCalledWith('/ui/device/hasNotch', true);
  });

  it('writes hasNotch as false when insets.top <= 20', () => {
    const insets = { top: 20, bottom: 0, left: 0, right: 0 };
    writeDeviceContext(store as any, insets);
    expect(store.set).toHaveBeenCalledWith('/ui/device/hasNotch', false);
  });

  it('does not write insets when not provided', () => {
    writeDeviceContext(store as any);
    const insetsCalls = store.set.mock.calls.filter(
      (call: unknown[]) => call[0] === '/ui/device/insets' || call[0] === '/ui/device/hasNotch'
    );
    expect(insetsCalls).toHaveLength(0);
  });
});
