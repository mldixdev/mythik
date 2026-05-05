import { describe, it, expect } from 'vitest';
import { runPull } from '../../src/commands/pull.js';
import { MemorySpecStore } from 'mythik';
import type { Spec } from 'mythik';

const spec: Spec = {
  root: 'page',
  elements: {
    page: { type: 'box', props: {}, children: ['title'] },
    title: { type: 'text', props: { content: 'Hello' } },
  },
};

describe('runPull', () => {
  it('outputs spec as pretty JSON', async () => {
    const store = new MemorySpecStore({ 'test': spec });
    const result = await runPull('test', { store, json: false, toon: false });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.output);
    expect(parsed.root).toBe('page');
    expect(parsed.elements.title.props.content).toBe('Hello');
  });

  it('outputs spec in TOON format', async () => {
    const store = new MemorySpecStore({ 'test': spec });
    const result = await runPull('test', { store, json: false, toon: true });
    expect(result.exitCode).toBe(0);
    expect(result.output.trim().startsWith('{')).toBe(false);
  });

  it('wraps in object for --json mode', async () => {
    const store = new MemorySpecStore({ 'test': spec });
    const result = await runPull('test', { store, json: true, toon: false });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.output);
    expect(parsed.success).toBe(true);
    expect(parsed.spec.root).toBe('page');
  });

  it('returns error with suggestion when screen not found', async () => {
    const store = new MemorySpecStore({ 'task-manager': spec });
    const result = await runPull('task-managerr', { store, json: false, toon: false });
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('not found');
    expect(result.output).toContain('task-manager');
  });
});
