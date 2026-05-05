import { describe, it, expect } from 'vitest';
import { runManifest } from '../../src/commands/manifest.js';
import { stripAnsi } from '../../src/output.js';
import { MemorySpecStore } from 'mythik';

const testSpec = {
  root: 'page',
  elements: {
    page: { type: 'stack', props: {}, children: ['title', 'btn'] },
    title: { type: 'text', props: { content: 'Hello' } },
    btn: { type: 'button', props: { label: 'Click' }, on: { press: { action: 'navigate', params: { screen: 'other' } } } },
  },
};

function createStore() {
  return new MemorySpecStore({ 'test-screen': testSpec as any });
}

describe('manifest command', () => {
  it('returns manifest text for a valid screen', async () => {
    const result = await runManifest('test-screen', { store: createStore(), json: false });
    const plain = stripAnsi(result.output);
    expect(plain).toContain('page (stack)');
    expect(plain).toContain('title (text)');
    expect(plain).toContain('btn (button)');
    expect(result.exitCode).toBe(0);
  });

  it('returns JSON output when json=true', async () => {
    const result = await runManifest('test-screen', { store: createStore(), json: true });
    const parsed = JSON.parse(result.output);
    expect(parsed.screenId).toBe('test-screen');
    expect(parsed.elementCount).toBe(3);
    expect(parsed.manifest).toContain('page (stack)');
    expect(result.exitCode).toBe(0);
  });

  it('returns error for non-existent screen', async () => {
    const result = await runManifest('nope', { store: createStore(), json: false });
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('not found');
  });

  it('suggests similar screen names on typo', async () => {
    const result = await runManifest('test-scren', { store: createStore(), json: false });
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('test-screen');
  });
});
