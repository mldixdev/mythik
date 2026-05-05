import { describe, it, expect } from 'vitest';
import { runDelete } from '../../src/commands/delete.js';
import { MemorySpecStore } from 'mythik';
import type { Spec } from 'mythik';

const spec: Spec = {
  root: 'page',
  elements: {
    page: { type: 'box', props: {}, children: ['title'] },
    title: { type: 'text', props: { content: 'Hello' } },
  },
};

describe('runDelete — without confirm', () => {
  it('previews without deleting', async () => {
    const store = new MemorySpecStore({ 'test': spec });
    const result = await runDelete('test', { store, json: false, confirm: false });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('2 elements');
    expect(result.output).toContain('--confirm');
    const loaded = await store.load('test');
    expect(loaded.root).toBe('page');
  });
});

describe('runDelete — with confirm', () => {
  it('outputs spec to stdout and deletes', async () => {
    const store = new MemorySpecStore({ 'test': spec });
    const result = await runDelete('test', { store, json: false, confirm: true });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.output);
    expect(parsed.root).toBe('page');
    await expect(store.load('test')).rejects.toThrow('not found');
  });
});

describe('runDelete — not found', () => {
  it('returns error with suggestion', async () => {
    const store = new MemorySpecStore({ 'task-manager': spec });
    const result = await runDelete('task-managerr', { store, json: false, confirm: true });
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('not found');
    expect(result.output).toContain('task-manager');
  });
});

describe('runDelete — json mode', () => {
  it('returns structured result with deleted spec', async () => {
    const store = new MemorySpecStore({ 'test': spec });
    const result = await runDelete('test', { store, json: true, confirm: true });
    const parsed = JSON.parse(result.output);
    expect(parsed.success).toBe(true);
    expect(parsed.screenId).toBe('test');
    expect(parsed.deletedSpec.root).toBe('page');
  });

  it('returns preview in json mode without confirm', async () => {
    const store = new MemorySpecStore({ 'test': spec });
    const result = await runDelete('test', { store, json: true, confirm: false });
    const parsed = JSON.parse(result.output);
    expect(parsed.preview).toBe(true);
    expect(parsed.elementCount).toBe(2);
  });
});
