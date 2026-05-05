import { describe, it, expect } from 'vitest';
import { buildUserContext } from '../../src/auth/user-context.js';
import type { ClaimsMapping } from '../../src/auth/types.js';

describe('buildUserContext', () => {
  it('maps claims using configured mapping', () => {
    const claims = { sub: 'sample-user', nombre: 'Sample User', roles: ['ADMIN', 'EDITOR'], organizations: [1, 5, 12] };
    const mapping: ClaimsMapping = { username: 'sub', name: 'nombre', roles: 'roles', scope: 'organizations' };
    const ctx = buildUserContext(claims, mapping);
    expect(ctx.username).toBe('sample-user');
    expect(ctx.name).toBe('Sample User');
    expect(ctx.roles).toEqual(['ADMIN', 'EDITOR']);
    expect(ctx.scope).toEqual([1, 5, 12]);
  });

  it('uses default claim names when mapping not provided', () => {
    const claims = { sub: 'admin', roles: ['ADMIN'] };
    const ctx = buildUserContext(claims, {});
    expect(ctx.username).toBe('admin');
    expect(ctx.roles).toEqual(['ADMIN']);
  });

  it('handles missing optional claims gracefully', () => {
    const claims = { sub: 'user1', roles: ['EDITOR'] };
    const mapping: ClaimsMapping = { username: 'sub', roles: 'roles', scope: 'organizations' };
    const ctx = buildUserContext(claims, mapping);
    expect(ctx.username).toBe('user1');
    expect(ctx.name).toBeNull();
    expect(ctx.scope).toEqual([]);
  });

  it('wraps single role string into array', () => {
    const claims = { sub: 'user1', roles: 'ADMIN' };
    const ctx = buildUserContext(claims, {});
    expect(ctx.roles).toEqual(['ADMIN']);
  });

  it('defaults roles to empty array when missing', () => {
    const claims = { sub: 'user1' };
    const ctx = buildUserContext(claims, {});
    expect(ctx.roles).toEqual([]);
  });

  it('preserves raw claims', () => {
    const claims = { sub: 'user1', roles: ['ADMIN'], custom_field: 'hello' };
    const ctx = buildUserContext(claims, {});
    expect(ctx.raw.custom_field).toBe('hello');
  });
});
