import { describe, it, expect } from 'vitest';
import { breakpointHandler } from '../../src/expressions/handlers/breakpoint.js';
import { createStateStore } from '../../src/state/store.js';
import type { ResolverContext } from '../../src/types.js';

describe('$breakpoint handler', () => {
  function makeContext(viewportWidth: number, customBreakpoints?: Record<string, number>): ResolverContext {
    const store = createStateStore({ ui: { viewportWidth } });
    return {
      getState: (path) => store.get(path),
      setState: (path, value) => store.set(path, value),
      tokens: customBreakpoints ? { breakpoints: customBreakpoints } : undefined,
    };
  }

  it('resolves lg value for large viewport', () => {
    const ctx = makeContext(1200);
    expect(breakpointHandler.resolve({ $breakpoint: { sm: 1, md: 2, lg: 3 } }, ctx)).toBe(3);
  });

  it('resolves md value for medium viewport', () => {
    const ctx = makeContext(800);
    expect(breakpointHandler.resolve({ $breakpoint: { sm: 1, md: 2, lg: 3 } }, ctx)).toBe(2);
  });

  it('resolves sm value for small viewport', () => {
    const ctx = makeContext(400);
    expect(breakpointHandler.resolve({ $breakpoint: { sm: 1, md: 2, lg: 3 } }, ctx)).toBe(1);
  });

  it('uses custom breakpoints from tokens', () => {
    const ctx = makeContext(600, { small: 0, large: 900 });
    expect(breakpointHandler.resolve({ $breakpoint: { small: 'mobile', large: 'desktop' } }, ctx)).toBe('mobile');
  });

  it('resolves xl for very large viewport', () => {
    const ctx = makeContext(1400);
    expect(breakpointHandler.resolve({ $breakpoint: { sm: 1, md: 2, lg: 3, xl: 4 } }, ctx)).toBe(4);
  });

  it('works with non-numeric values', () => {
    const ctx = makeContext(1200);
    expect(breakpointHandler.resolve({ $breakpoint: { sm: '100%', md: '50%', lg: '33%' } }, ctx)).toBe('33%');
  });

  it('has the correct key', () => {
    expect(breakpointHandler.key).toBe('$breakpoint');
  });

  it('reads from /ui/device/viewportWidth (new path)', () => {
    const store = createStateStore({ ui: { device: { viewportWidth: 900 } } });
    const ctx: ResolverContext = {
      getState: (path) => store.get(path),
      setState: (path, value) => store.set(path, value),
    };
    expect(breakpointHandler.resolve({ $breakpoint: { sm: 1, md: 2, lg: 3 } }, ctx)).toBe(2);
  });

  it('falls back to /ui/viewportWidth (legacy path)', () => {
    const store = createStateStore({ ui: { viewportWidth: 500 } });
    const ctx: ResolverContext = {
      getState: (path) => store.get(path),
      setState: (path, value) => store.set(path, value),
    };
    expect(breakpointHandler.resolve({ $breakpoint: { sm: 1, md: 2, lg: 3 } }, ctx)).toBe(1);
  });

  it('/ui/device/viewportWidth takes priority over /ui/viewportWidth', () => {
    const store = createStateStore({ ui: { viewportWidth: 500, device: { viewportWidth: 1200 } } });
    const ctx: ResolverContext = {
      getState: (path) => store.get(path),
      setState: (path, value) => store.set(path, value),
    };
    expect(breakpointHandler.resolve({ $breakpoint: { sm: 1, md: 2, lg: 3 } }, ctx)).toBe(3);
  });
});
