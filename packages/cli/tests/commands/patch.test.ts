import { describe, it, expect } from 'vitest';
import { runPatch, parsePatchInput } from '../../src/commands/patch.js';
import { MemorySpecStore, MemoryVersionedSpecStore } from 'mythik';
import { toToon, fromToon } from '../../src/toon.js';

const testSpec = {
  root: 'page',
  elements: {
    page: { type: 'stack', props: {}, children: ['title'] },
    title: { type: 'text', props: { content: 'Hello' } },
  },
};

function makeStore() {
  return new MemorySpecStore({ 'test-screen': testSpec as any });
}

async function makeVersionedStore() {
  const store = new MemoryVersionedSpecStore();
  await store.saveVersion('test-screen', testSpec as any, { author: 'seed', source: 'push' });
  return store;
}

async function makeLegacyVersionedStore() {
  const store = new MemoryVersionedSpecStore();
  await store.save('test-screen', testSpec as any);
  return store;
}

describe('parsePatchInput', () => {
  it('parses valid JSON array', () => {
    const patches = parsePatchInput('[{"op":"replace","path":"/elements/title/props/content","value":"World"}]');
    expect(patches).toHaveLength(1);
    expect(patches[0].op).toBe('replace');
  });

  it('parses TOON input (autodetected)', () => {
    const patches = [{ op: 'replace', path: '/elements/title/props/content', value: 'World' }];
    const toonInput = toToon(patches);
    const parsed = parsePatchInput(toonInput);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].op).toBe('replace');
  });

  it('throws on invalid input', () => {
    expect(() => parsePatchInput('not valid at all %%')).toThrow();
  });

  it('throws on non-array JSON', () => {
    expect(() => parsePatchInput('{"op":"replace"}')).toThrow('array');
  });
});

describe('patch command', () => {
  it('applies valid patch and returns success', async () => {
    const store = makeStore();
    const patches = [{ op: 'replace' as const, path: '/elements/title/props/content', value: 'World' }];
    const result = await runPatch('test-screen', patches, { store, json: false });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('✓');
    expect(result.output).toContain('title');
  });

  it('returns JSON on success when json=true', async () => {
    const store = makeStore();
    const patches = [{ op: 'replace' as const, path: '/elements/title/props/content', value: 'World' }];
    const result = await runPatch('test-screen', patches, { store, json: true });
    const parsed = JSON.parse(result.output);
    expect(parsed.success).toBe(true);
    expect(parsed.patchedElements).toContain('title');
    expect(result.exitCode).toBe(0);
  });

  it('returns error for invalid patch path', async () => {
    const store = makeStore();
    const patches = [{ op: 'replace' as const, path: '/elements/nonexistent/props/x', value: 'y' }];
    const result = await runPatch('test-screen', patches, { store, json: false });
    expect(result.exitCode).toBe(1);
  });

  it('returns TOON on success when toon=true', async () => {
    const store = makeStore();
    const patches = [{ op: 'replace' as const, path: '/elements/title/props/content', value: 'World' }];
    const result = await runPatch('test-screen', patches, { store, json: false, toon: true });
    expect(result.exitCode).toBe(0);
    // TOON output should not start with {
    expect(result.output.trim().startsWith('{')).toBe(false);
    const decoded = fromToon(result.output) as any;
    expect(decoded.success).toBe(true);
    expect(decoded.patchedElements).toContain('title');
  });

  it('does not persist when patch fails', async () => {
    const store = makeStore();
    const patches = [{ op: 'replace' as const, path: '/elements/nonexistent/props/x', value: 'y' }];
    await runPatch('test-screen', patches, { store, json: false });

    const spec = await store.load('test-screen');
    expect((spec.elements.title.props as any).content).toBe('Hello');
  });

  it('creates a version in text mode when author is provided', async () => {
    const store = await makeVersionedStore();
    const patches = [{ op: 'replace' as const, path: '/elements/title/props/content', value: 'World' }];

    const result = await runPatch('test-screen', patches, { store, json: false, author: 'agent' });

    expect(result.exitCode).toBe(0);
    expect(await store.currentVersion('test-screen')).toBe(2);
  });

  it('creates a version and reports metadata in JSON mode', async () => {
    const store = await makeVersionedStore();
    const patches = [{ op: 'replace' as const, path: '/elements/title/props/content', value: 'World' }];

    const result = await runPatch('test-screen', patches, { store, json: true, author: 'agent' });
    const parsed = JSON.parse(result.output);

    expect(result.exitCode).toBe(0);
    expect(parsed.success).toBe(true);
    expect(parsed.versioned).toBe(true);
    expect(parsed.version).toBe(2);
    expect(await store.currentVersion('test-screen')).toBe(2);
  });

  it('creates a version and reports metadata in TOON mode', async () => {
    const store = await makeVersionedStore();
    const patches = [{ op: 'replace' as const, path: '/elements/title/props/content', value: 'World' }];

    const result = await runPatch('test-screen', patches, { store, json: false, toon: true, author: 'agent' });
    const decoded = fromToon(result.output) as any;

    expect(result.exitCode).toBe(0);
    expect(decoded.success).toBe(true);
    expect(decoded.versioned).toBe(true);
    expect(decoded.version).toBe(2);
    expect(await store.currentVersion('test-screen')).toBe(2);
  });

  it('bootstraps pre-patch history before saving the patched version', async () => {
    const store = await makeLegacyVersionedStore();
    const patches = [{ op: 'replace' as const, path: '/elements/title/props/content', value: 'World' }];

    const result = await runPatch('test-screen', patches, { store, json: true, author: 'agent' });
    const parsed = JSON.parse(result.output);
    const v1 = await store.loadVersion('test-screen', 1) as typeof testSpec;
    const v2 = await store.loadVersion('test-screen', 2) as typeof testSpec;

    expect(result.exitCode).toBe(0);
    expect(parsed.version).toBe(2);
    expect((v1.elements.title.props as any).content).toBe('Hello');
    expect((v2.elements.title.props as any).content).toBe('World');
  });
});
