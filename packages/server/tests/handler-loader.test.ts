import { describe, it, expect } from 'vitest';
import { discoverHandlers, validateHandlerRefs, getHandlerRefs } from '../src/handler-loader.js';
import path from 'path';
import fs from 'fs';
import os from 'os';

describe('discoverHandlers', () => {
  it('returns empty map when directory does not exist', async () => {
    const handlers = await discoverHandlers('/nonexistent/path');
    expect(handlers.size).toBe(0);
  });

  it('ignores non-js/ts files', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'handlers-'));
    fs.writeFileSync(path.join(tmpDir, 'readme.txt'), 'ignored');
    fs.writeFileSync(path.join(tmpDir, 'data.json'), '{}');

    const handlers = await discoverHandlers(tmpDir);
    expect(handlers.size).toBe(0);

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('handles empty directory', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'handlers-'));

    const handlers = await discoverHandlers(tmpDir);
    expect(handlers.size).toBe(0);

    fs.rmSync(tmpDir, { recursive: true });
  });
});

describe('validateHandlerRefs', () => {
  it('returns empty errors when all handlers exist', () => {
    const handlers = new Map([['copy-month', async () => ({}) as Record<string, unknown>]]);
    const refs = ['copy-month'];
    const errors = validateHandlerRefs(refs, handlers);
    expect(errors).toHaveLength(0);
  });

  it('returns error for missing handler', () => {
    const handlers = new Map();
    const refs = ['copy-month'];
    const errors = validateHandlerRefs(refs, handlers);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('copy-month');
  });

  it('returns multiple errors for multiple missing handlers', () => {
    const handlers = new Map([['exists', async () => ({}) as Record<string, unknown>]]);
    const refs = ['exists', 'missing-a', 'missing-b'];
    const errors = validateHandlerRefs(refs, handlers);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain('missing-a');
    expect(errors[1]).toContain('missing-b');
  });
});

describe('getHandlerRefs', () => {
  it('extracts handler references from endpoints', () => {
    const spec = {
      endpoints: {
        a: { handler: 'copy-month' },
        b: { query: 'SELECT 1' },
        c: { handler: 'validate-close' },
      },
    };
    const refs = getHandlerRefs(spec as Record<string, unknown> & typeof spec);
    expect(refs).toEqual(['copy-month', 'validate-close']);
  });

  it('returns empty when no endpoints', () => {
    expect(getHandlerRefs({})).toEqual([]);
  });

  it('returns empty when no handlers', () => {
    const spec = { endpoints: { a: { query: 'SELECT 1' } } };
    expect(getHandlerRefs(spec as Record<string, unknown> & typeof spec)).toEqual([]);
  });
});
