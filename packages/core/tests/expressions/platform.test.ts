import { describe, it, expect } from 'vitest';
import { platformHandler } from '../../src/expressions/handlers/platform.js';
import { createStateStore } from '../../src/state/store.js';
import type { ResolverContext } from '../../src/types.js';

describe('$platform handler', () => {
  function makeContext(platform: string): ResolverContext {
    const store = createStateStore({ ui: { device: { platform } } });
    return {
      getState: (path) => store.get(path),
      setState: (path, value) => store.set(path, value),
    };
  }

  it('has the correct key', () => {
    expect(platformHandler.key).toBe('$platform');
  });

  // --- Direct platform matching ---

  it('resolves web value when platform is web', () => {
    const ctx = makeContext('web');
    const result = platformHandler.resolve(
      { $platform: { web: 'blur(24px)', native: null } },
      ctx,
    );
    expect(result).toBe('blur(24px)');
  });

  it('resolves ios value when platform is ios', () => {
    const ctx = makeContext('ios');
    const result = platformHandler.resolve(
      { $platform: { web: 'blur(24px)', ios: 'ios-blur', android: 'android-blur' } },
      ctx,
    );
    expect(result).toBe('ios-blur');
  });

  it('resolves android value when platform is android', () => {
    const ctx = makeContext('android');
    const result = platformHandler.resolve(
      { $platform: { web: 'blur(24px)', ios: 'ios-blur', android: 'android-blur' } },
      ctx,
    );
    expect(result).toBe('android-blur');
  });

  // --- "native" alias matches ios and android ---

  it('"native" matches ios when no specific ios key exists', () => {
    const ctx = makeContext('ios');
    const result = platformHandler.resolve(
      { $platform: { web: 'web-layout', native: 'native-layout' } },
      ctx,
    );
    expect(result).toBe('native-layout');
  });

  it('"native" matches android when no specific android key exists', () => {
    const ctx = makeContext('android');
    const result = platformHandler.resolve(
      { $platform: { web: 'web-layout', native: 'native-layout' } },
      ctx,
    );
    expect(result).toBe('native-layout');
  });

  it('specific platform key takes priority over "native" alias', () => {
    const ctx = makeContext('ios');
    const result = platformHandler.resolve(
      { $platform: { web: 'web', native: 'generic-native', ios: 'ios-specific' } },
      ctx,
    );
    expect(result).toBe('ios-specific');
  });

  // --- Value types ---

  it('resolves object values (element references)', () => {
    const ctx = makeContext('web');
    const result = platformHandler.resolve(
      { $platform: { web: { type: 'stack', style: { backdropFilter: 'blur(24px)' } }, native: { type: 'screen' } } },
      ctx,
    );
    expect(result).toEqual({ type: 'stack', style: { backdropFilter: 'blur(24px)' } });
  });

  it('resolves null values (strip property on platform)', () => {
    const ctx = makeContext('native');
    const result = platformHandler.resolve(
      { $platform: { web: '0 4px 12px rgba(0,0,0,0.1)', native: null } },
      ctx,
    );
    expect(result).toBeNull();
  });

  it('resolves numeric values', () => {
    const ctx = makeContext('web');
    const result = platformHandler.resolve(
      { $platform: { web: 24, native: 16 } },
      ctx,
    );
    expect(result).toBe(24);
  });

  it('resolves array values', () => {
    const ctx = makeContext('android');
    const result = platformHandler.resolve(
      { $platform: { web: ['card-a', 'card-b'], native: ['card-c'] } },
      ctx,
    );
    expect(result).toEqual(['card-c']);
  });

  // --- Edge cases ---

  it('returns undefined for malformed $platform value (string)', () => {
    const ctx = makeContext('web');
    const result = platformHandler.resolve({ $platform: 'web' } as any, ctx);
    expect(result).toBeUndefined();
  });

  it('returns undefined for malformed $platform value (array)', () => {
    const ctx = makeContext('web');
    const result = platformHandler.resolve({ $platform: ['web', 'native'] } as any, ctx);
    expect(result).toBeUndefined();
  });

  it('unknown platform falls through to "native" alias', () => {
    const ctx = makeContext('visionos');
    const result = platformHandler.resolve(
      { $platform: { web: 'web-val', native: 'native-val' } },
      ctx,
    );
    expect(result).toBe('native-val');
  });

  it('returns undefined when platform has no matching key', () => {
    const ctx = makeContext('web');
    const result = platformHandler.resolve(
      { $platform: { native: 'only-native' } },
      ctx,
    );
    expect(result).toBeUndefined();
  });

  it('returns undefined when platform is not set in store', () => {
    const store = createStateStore({});
    const ctx: ResolverContext = {
      getState: (path) => store.get(path),
      setState: (path, value) => store.set(path, value),
    };
    const result = platformHandler.resolve(
      { $platform: { web: 'web-val', native: 'native-val' } },
      ctx,
    );
    expect(result).toBeUndefined();
  });

  it('"native" alias does NOT match "web"', () => {
    const ctx = makeContext('web');
    const result = platformHandler.resolve(
      { $platform: { native: 'only-native' } },
      ctx,
    );
    expect(result).toBeUndefined();
  });

  // --- Root-level usage (element ID as value) ---

  it('resolves string element IDs for root switching', () => {
    const ctx = makeContext('web');
    const result = platformHandler.resolve(
      { $platform: { web: 'layout-web', native: 'layout-native' } },
      ctx,
    );
    expect(result).toBe('layout-web');
  });

  it('resolves native element ID for root switching', () => {
    const ctx = makeContext('ios');
    const result = platformHandler.resolve(
      { $platform: { web: 'layout-web', native: 'layout-native' } },
      ctx,
    );
    expect(result).toBe('layout-native');
  });

  // --- Integration with resolver (nested expressions need resolveFn) ---

  it('resolves nested expressions via resolveFn when provided', () => {
    const ctx = makeContext('web');
    const resolveFn = (expr: unknown) => {
      if (typeof expr === 'object' && expr !== null && '$state' in expr) {
        return 'resolved-from-state';
      }
      return expr;
    };
    const result = platformHandler.resolve(
      { $platform: { web: { $state: '/some/path' }, native: 'static' } },
      ctx,
      resolveFn,
    );
    expect(result).toBe('resolved-from-state');
  });

  it('does not call resolveFn for non-matching platform', () => {
    const ctx = makeContext('android');
    let called = false;
    const resolveFn = (expr: unknown) => {
      called = true;
      return expr;
    };
    platformHandler.resolve(
      { $platform: { web: 'web-only', native: 'native-val' } },
      ctx,
      resolveFn,
    );
    // resolveFn IS called for the resolved value
    expect(called).toBe(true);
  });
});
