import { describe, it, expect } from 'vitest';
import * as api from '../src/api.js';

describe('mythik-cli/api surface', () => {
  it('exports runPush function', () => {
    expect(typeof api.runPush).toBe('function');
  });

  it('exports runPatch function', () => {
    expect(typeof api.runPatch).toBe('function');
  });

  it('exports parsePatchInput function', () => {
    expect(typeof api.parsePatchInput).toBe('function');
  });

  it('parsePatchInput parses valid input', () => {
    const result = api.parsePatchInput('[{"op":"replace","path":"/x","value":1}]');
    expect(result).toHaveLength(1);
    expect(result[0].op).toBe('replace');
  });

  it('PushOptions and PatchOptions are accessible as types', () => {
    // Type-level test: presence verified via the type-only import compiling.
    // Runtime no-op; if types missing, this file would not compile.
    const opts: api.PushOptions = {
      store: { load: () => Promise.resolve({}), save: () => Promise.resolve(), list: () => Promise.resolve([]), delete: () => Promise.resolve() },
      json: false,
      force: false,
    };
    const patchOpts: api.PatchOptions = {
      store: opts.store,
      json: false,
    };
    expect(opts.json).toBe(false);
    expect(patchOpts.json).toBe(false);
  });
});
