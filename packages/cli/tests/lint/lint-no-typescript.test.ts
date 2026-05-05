import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('peerDep degradation — loadTypeScript', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('loads typescript when available (default test env)', async () => {
    const { loadTypeScript } = await import('../../src/lint/code-rules.js');
    const ts = await loadTypeScript();
    expect(ts).not.toBeNull();
    expect(typeof ts!.createSourceFile).toBe('function');
  });

  it('returns null when dynamic import throws', async () => {
    vi.doMock('typescript', () => {
      throw new Error('Cannot find module typescript');
    });
    const { loadTypeScript } = await import('../../src/lint/code-rules.js');
    const ts = await loadTypeScript();
    expect(ts).toBeNull();
  });

  it('caches result across calls (no double-import on subsequent calls)', async () => {
    const { loadTypeScript } = await import('../../src/lint/code-rules.js');
    const first = await loadTypeScript();
    const second = await loadTypeScript();
    expect(first).toBe(second);
  });
});
