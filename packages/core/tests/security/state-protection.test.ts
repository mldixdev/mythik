import { describe, it, expect } from 'vitest';
import { createStateGuard } from '../../src/security/state-protection.js';

describe('createStateGuard — lazy callback variant', () => {
  it('accepts a callback returning protected paths', () => {
    const guard = createStateGuard(() => ['/auth/*', '/foo']);
    expect(guard.canWrite('/auth/token')).toBe(false);
    expect(guard.canWrite('/foo')).toBe(false);
    expect(guard.canWrite('/bar')).toBe(true);
  });

  it('re-evaluates callback on each canWrite call (dynamic protection)', () => {
    const paths: string[] = ['/initial'];
    const guard = createStateGuard(() => paths);
    expect(guard.canWrite('/initial')).toBe(false);
    expect(guard.canWrite('/added')).toBe(true);

    paths.push('/added');
    expect(guard.canWrite('/added')).toBe(false);

    paths.length = 0;
    expect(guard.canWrite('/initial')).toBe(true);
    expect(guard.canWrite('/added')).toBe(true);
  });

  it('callback variant + assertCanWrite throws with proper error', () => {
    const guard = createStateGuard(() => ['/protected']);
    expect(() => guard.assertCanWrite('/protected')).toThrow(/protected path/);
    expect(() => guard.assertCanWrite('/other')).not.toThrow();
  });

  it('callback variant respects wildcard patterns', () => {
    const guard = createStateGuard(() => ['/auth/*']);
    expect(guard.canWrite('/auth/token')).toBe(false);
    expect(guard.canWrite('/auth/role')).toBe(false);
    expect(guard.canWrite('/auth')).toBe(false);  // wildcard matches the bare prefix too
    expect(guard.canWrite('/other')).toBe(true);
  });
});
