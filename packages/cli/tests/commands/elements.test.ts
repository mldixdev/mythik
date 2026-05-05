import { describe, it, expect } from 'vitest';
import { runElements } from '../../src/commands/elements.js';
import { MemorySpecStore } from 'mythik';
import { fromToon } from '../../src/toon.js';

const testSpec = {
  root: 'page',
  elements: {
    page: { type: 'stack', props: {}, children: ['title', 'btn'] },
    title: { type: 'text', props: { content: 'Hello' } },
    btn: { type: 'button', props: { label: 'Click' }, on: { press: { action: 'navigate', params: { screen: 'other' } } } },
  },
};

function makeStore() {
  return new MemorySpecStore({ 'test-screen': testSpec as any });
}

describe('elements command', () => {
  it('returns found elements', async () => {
    const result = await runElements('test-screen', ['title', 'btn'], { store: makeStore(), json: false });
    expect(result.output).toContain('title');
    expect(result.output).toContain('text');
    expect(result.output).toContain('btn');
    expect(result.output).toContain('button');
    expect(result.exitCode).toBe(0);
  });

  it('reports not-found elements', async () => {
    const result = await runElements('test-screen', ['title', 'nope'], { store: makeStore(), json: false });
    expect(result.output).toContain('title');
    expect(result.output).toContain('nope');
    expect(result.exitCode).toBe(0);
  });

  it('returns JSON when json=true', async () => {
    const result = await runElements('test-screen', ['title'], { store: makeStore(), json: true });
    const parsed = JSON.parse(result.output);
    expect(parsed.found.title.type).toBe('text');
    expect(parsed.notFound).toEqual([]);
    expect(result.exitCode).toBe(0);
  });

  it('returns error for non-existent screen', async () => {
    const result = await runElements('nope', ['title'], { store: makeStore(), json: false });
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('not found');
  });

  it('returns TOON when toon=true', async () => {
    const result = await runElements('test-screen', ['title'], { store: makeStore(), json: false, toon: true });
    expect(result.exitCode).toBe(0);
    // TOON output should not start with { (it's not JSON)
    expect(result.output.trim().startsWith('{')).toBe(false);
    // Should decode back to same data as JSON output
    const decoded = fromToon(result.output) as any;
    expect(decoded.found.title.type).toBe('text');
    expect(decoded.notFound).toEqual([]);
  });
});
