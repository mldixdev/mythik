import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { createStateStore } from 'mythik';
import { useDeviceContext } from '../src/use-device-context.js';

// Mock Motion for MythikRenderer
vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef((props: Record<string, unknown>, ref: React.Ref<HTMLDivElement>) => {
      const { children, initial, animate, exit, transition, layout, layoutId, whileHover, whileTap, whileFocus, ...rest } = props;
      return React.createElement('div', { ...rest, ref }, children as React.ReactNode);
    }),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  LayoutGroup: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}));

// Helper component that uses the hook
function TestHarness({ store, enabled = true }: { store: ReturnType<typeof createStateStore>; enabled?: boolean }) {
  useDeviceContext(store, enabled);
  return React.createElement('div', { 'data-testid': 'harness' });
}

describe('useDeviceContext', () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 768 });
    // Mock matchMedia (jsdom doesn't have it)
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: originalInnerWidth });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: originalInnerHeight });
    window.matchMedia = originalMatchMedia;
  });

  it('writes initial device values on mount', () => {
    const store = createStateStore({});
    render(React.createElement(TestHarness, { store }));

    expect(store.get('/ui/device/viewportWidth')).toBe(1024);
    expect(store.get('/ui/device/viewportHeight')).toBe(768);
    expect(store.get('/ui/device/platform')).toBe('web');
    expect(store.get('/ui/device/orientation')).toBe('landscape');
  });

  it('does nothing when enabled is false', () => {
    const store = createStateStore({});
    render(React.createElement(TestHarness, { store, enabled: false }));

    expect(store.get('/ui/device/viewportWidth')).toBeUndefined();
    expect(store.get('/ui/device/platform')).toBeUndefined();
  });

  it('platform is web', () => {
    const store = createStateStore({});
    render(React.createElement(TestHarness, { store }));
    expect(store.get('/ui/device/platform')).toBe('web');
  });

  it('orientation is portrait when height > width', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 400 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 800 });
    const store = createStateStore({});
    render(React.createElement(TestHarness, { store }));
    expect(store.get('/ui/device/orientation')).toBe('portrait');
  });

  it('writes colorScheme from matchMedia', () => {
    const store = createStateStore({});
    render(React.createElement(TestHarness, { store }));
    // jsdom matchMedia returns false by default → light
    expect(store.get('/ui/device/colorScheme')).toBe('light');
  });
});
