import { describe, it, expect } from 'vitest';
import { validateSpec } from '../../src/security/spec-validator.js';

// Minimal context — these checks don't depend on primitiveRegistry/elementRegistry
const ctx = {};

describe('validateSpec — v49 Item E: derive + dataSources checks', () => {
  it('errors on empty derive entry (undefined value)', () => {
    const spec = {
      root: 'r',
      elements: { r: { type: 'box' } },
      derive: { '/foo': undefined },
    };
    const result = validateSpec(spec, ctx);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('/foo') && e.message.toLowerCase().includes('empty'))).toBe(true);
  });

  it('errors on derive cycle (load-time catch via topological sort)', () => {
    const spec = {
      root: 'r',
      elements: { r: { type: 'box' } },
      derive: {
        '/a': { $state: '/b' },
        '/b': { $state: '/a' },
      },
    };
    const result = validateSpec(spec, ctx);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) =>
      e.message.toLowerCase().includes('cycle') ||
      e.message.toLowerCase().includes('circular')
    )).toBe(true);
  });

  it('errors when derive path equals dataSources target', () => {
    const spec = {
      root: 'r',
      elements: { r: { type: 'box' } },
      derive: { '/posts': 1 },
      dataSources: { posts: { url: '/api/posts', target: '/posts' } },
    };
    const result = validateSpec(spec, ctx);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) =>
      e.message.includes('/posts') && e.message.toLowerCase().includes('conflict')
    )).toBe(true);
  });

  it('errors when derive path is under default protected pattern', () => {
    const spec = {
      root: 'r',
      elements: { r: { type: 'box' } },
      derive: { '/auth/userInfo': 1 },
    };
    const result = validateSpec(spec, ctx);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) =>
      e.message.includes('/auth/userInfo') && e.message.toLowerCase().includes('protected')
    )).toBe(true);
  });

  it('errors when setState action targets a derive path', () => {
    const spec = {
      root: 'r',
      elements: {
        r: {
          type: 'button',
          props: {
            onClick: { action: 'setState', params: { statePath: '/computed', value: 1 } },
          },
        },
      },
      derive: { '/computed': 5 },
    };
    const result = validateSpec(spec, ctx);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) =>
      e.message.includes('/computed') && e.message.toLowerCase().includes('derive')
    )).toBe(true);
  });

  it('errors on dataSource URL with malformed $template (unclosed brace)', () => {
    const spec = {
      root: 'r',
      elements: { r: { type: 'box' } },
      dataSources: { posts: { url: { $template: '/api/users/${/auth/userId/posts' }, target: '/posts' } },
    };
    const result = validateSpec(spec, ctx);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) =>
      e.message.toLowerCase().includes('template') ||
      e.message.toLowerCase().includes('brace')
    )).toBe(true);
  });

  it('errors on dataSource target not starting with "/"', () => {
    const spec = {
      root: 'r',
      elements: { r: { type: 'box' } },
      dataSources: { posts: { url: '/api/posts', target: 'posts' } },
    };
    const result = validateSpec(spec, ctx);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) =>
      e.message.includes('target') && e.message.includes('"/"')
    )).toBe(true);
  });

  it('errors on dataSource target under protected pattern', () => {
    const spec = {
      root: 'r',
      elements: { r: { type: 'box' } },
      dataSources: { auth: { url: '/api/auth', target: '/auth/userInfo' } },
    };
    const result = validateSpec(spec, ctx);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) =>
      e.message.includes('/auth/userInfo') && e.message.toLowerCase().includes('protected')
    )).toBe(true);
  });

  // CHECK 8 — NEW (Item E world-class C+D)
  it('errors on dataSource URL plain-string containing ${...} (resolver does not substitute)', () => {
    const spec = {
      root: 'r',
      elements: { r: { type: 'box' } },
      dataSources: {
        // Plain string with ${...} — resolver returns it literally, templating silently broken
        posts: { url: '/api/users/${/auth/userId}/posts', target: '/posts' },
      },
    };
    const result = validateSpec(spec, ctx);
    expect(result.valid).toBe(false);
    // Error message must mention $template (the recommended fix) so consumer knows what to do
    expect(result.errors.some((e) =>
      e.message.includes('${') && e.message.toLowerCase().includes('$template')
    )).toBe(true);
  });

  it('passes a well-formed spec with both derive and dataSources', () => {
    const spec = {
      root: 'r',
      elements: { r: { type: 'box' } },
      derive: { '/computed/total': { $state: '/posts/length' } },
      dataSources: { posts: { url: '/api/posts', target: '/posts' } },
    };
    const result = validateSpec(spec, ctx);
    expect(result.valid).toBe(true);
    // Should have no errors related to derive/dataSources (may have unrelated warnings — that's OK)
  });
});
