import { describe, it, expect } from 'vitest';
import { runPush } from '../../src/commands/push.js';
import { MemorySpecStore } from 'mythik';
import type { Spec } from 'mythik';

const validSpec: Spec = {
  root: 'page',
  elements: {
    page: { type: 'box', props: {}, children: ['title'] },
    title: { type: 'text', props: { content: 'Hello' } },
  },
};

const invalidSpec: Spec = {
  root: 'page',
  elements: {
    page: { type: 'box', props: {}, children: ['ghost'] },
  },
};

describe('runPush — new screen', () => {
  it('saves valid spec and returns manifest', async () => {
    const store = new MemorySpecStore();
    const result = await runPush('login', JSON.stringify(validSpec), { store, json: false, force: false });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('login');
    expect(result.output).toContain('new');
    const loaded = await store.load('login');
    expect(loaded.root).toBe('page');
  });

  it('saves invalid spec with errors + suggested fixes', async () => {
    const store = new MemorySpecStore();
    const result = await runPush('login', JSON.stringify(invalidSpec), { store, json: false, force: false });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('error');
    expect(result.output).toContain('ghost');
    expect(result.output).toContain('Fix');
    const loaded = await store.load('login');
    expect(loaded.root).toBe('page');
  });
});

describe('runPush — existing screen', () => {
  it('overwrites with valid spec', async () => {
    const store = new MemorySpecStore({ 'login': invalidSpec });
    const result = await runPush('login', JSON.stringify(validSpec), { store, json: false, force: false });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('overwritten');
    const loaded = await store.load('login');
    expect(loaded.elements.title).toBeDefined();
  });

  it('rejects invalid spec without --force', async () => {
    const store = new MemorySpecStore({ 'login': validSpec });
    const result = await runPush('login', JSON.stringify(invalidSpec), { store, json: false, force: false });
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('Rejected');
    expect(result.output).toContain('--force');
    const loaded = await store.load('login');
    expect(loaded.elements.title).toBeDefined();
  });

  it('overwrites invalid spec with --force', async () => {
    const store = new MemorySpecStore({ 'login': validSpec });
    const result = await runPush('login', JSON.stringify(invalidSpec), { store, json: true, force: true });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.output);
    expect(parsed.success).toBe(true);
    expect(parsed.errors.length).toBeGreaterThan(0);
  });
});

describe('runPush — json mode', () => {
  it('returns PushResult structure', async () => {
    const store = new MemorySpecStore();
    const result = await runPush('login', JSON.stringify(validSpec), { store, json: true, force: false });
    const parsed = JSON.parse(result.output);
    expect(parsed.success).toBe(true);
    expect(parsed.created).toBe(true);
    expect(parsed.elementCount).toBe(2);
    expect(parsed.manifest).toBeDefined();
  });
});
