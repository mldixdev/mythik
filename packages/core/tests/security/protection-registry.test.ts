import { describe, it, expect } from 'vitest';
import { createProtectionRegistry } from '../../src/security/protection-registry.js';

describe('protectionRegistry', () => {
  it('starts empty when no defaults provided', () => {
    const registry = createProtectionRegistry();
    expect(registry.allPaths()).toEqual([]);
  });

  it('includes default paths from config', () => {
    const registry = createProtectionRegistry({ defaultPaths: ['/auth/*', '/tx/*'] });
    expect(registry.allPaths()).toEqual(['/auth/*', '/tx/*']);
  });

  it('contribute returns release token; allPaths includes contribution', () => {
    const registry = createProtectionRegistry();
    const release = registry.contribute(['/derive/foo', '/derive/bar']);
    expect(registry.allPaths()).toEqual(['/derive/foo', '/derive/bar']);
    expect(typeof release).toBe('function');
  });

  it('release token removes only that contribution', () => {
    const registry = createProtectionRegistry({ defaultPaths: ['/auth/*'] });
    const release = registry.contribute(['/x', '/y']);
    expect(registry.allPaths()).toEqual(['/auth/*', '/x', '/y']);
    release();
    expect(registry.allPaths()).toEqual(['/auth/*']);
  });

  it('two contributors with same path: release of one keeps path protected', () => {
    const registry = createProtectionRegistry();
    const releaseA = registry.contribute(['/shared']);
    const releaseB = registry.contribute(['/shared']);
    expect(registry.allPaths()).toEqual(['/shared', '/shared']);
    releaseA();
    // Path still present from contributor B
    expect(registry.allPaths()).toEqual(['/shared']);
    releaseB();
    expect(registry.allPaths()).toEqual([]);
  });

  it('release is idempotent (calling twice does not error)', () => {
    const registry = createProtectionRegistry();
    const release = registry.contribute(['/foo']);
    release();
    expect(() => release()).not.toThrow();
    expect(registry.allPaths()).toEqual([]);
  });
});
