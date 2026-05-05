import { describe, it, expect } from 'vitest';
import { computePatches } from '../../src/versioning/compute-patches.js';
import { applyPatches } from '../../src/streaming/patch.js';

describe('computePatches', () => {
  it('returns empty array for identical objects', () => {
    const obj = { a: 1, b: 'hello' };
    expect(computePatches(obj, obj)).toEqual([]);
  });

  it('detects added top-level property', () => {
    const before = { a: 1 };
    const after = { a: 1, b: 2 };
    const patches = computePatches(before, after);
    expect(patches).toHaveLength(1);
    expect(patches[0]).toEqual({ op: 'add', path: '/b', value: 2 });
  });

  it('detects removed top-level property', () => {
    const before = { a: 1, b: 2 };
    const after = { a: 1 };
    const patches = computePatches(before, after);
    expect(patches).toHaveLength(1);
    expect(patches[0]).toEqual({ op: 'remove', path: '/b' });
  });

  it('detects replaced value', () => {
    const before = { a: 1 };
    const after = { a: 2 };
    const patches = computePatches(before, after);
    expect(patches).toHaveLength(1);
    expect(patches[0]).toEqual({ op: 'replace', path: '/a', value: 2 });
  });

  it('detects nested property changes', () => {
    const before = { elements: { btn: { type: 'touchable', props: { label: 'Send' } } } };
    const after = { elements: { btn: { type: 'touchable', props: { label: 'Submit' } } } };
    const patches = computePatches(before, after);
    expect(patches).toHaveLength(1);
    expect(patches[0].path).toBe('/elements/btn/props/label');
    expect(patches[0].op).toBe('replace');
    expect(patches[0].value).toBe('Submit');
  });

  it('detects added nested object', () => {
    const before = { elements: { btn: { type: 'touchable' } } };
    const after = { elements: { btn: { type: 'touchable' }, msg: { type: 'text' } } };
    const patches = computePatches(before, after);
    expect(patches).toHaveLength(1);
    expect(patches[0]).toEqual({ op: 'add', path: '/elements/msg', value: { type: 'text' } });
  });

  it('detects removed nested object', () => {
    const before = { elements: { btn: { type: 'touchable' }, msg: { type: 'text' } } };
    const after = { elements: { btn: { type: 'touchable' } } };
    const patches = computePatches(before, after);
    expect(patches).toHaveLength(1);
    expect(patches[0]).toEqual({ op: 'remove', path: '/elements/msg' });
  });

  it('handles array replacement', () => {
    const before = { children: ['a', 'b'] };
    const after = { children: ['a', 'b', 'c'] };
    const patches = computePatches(before, after);
    expect(patches).toHaveLength(1);
    expect(patches[0].op).toBe('replace');
    expect(patches[0].path).toBe('/children');
  });

  it('roundtrips — applying generated patches produces the target', () => {
    const before = {
      root: 'page',
      elements: {
        page: { type: 'box', children: ['btn', 'msg'] },
        btn: { type: 'touchable', props: { label: 'Send' } },
        msg: { type: 'text', props: { content: 'Hello' } },
      },
      dataSources: { items: { url: '/api/items', method: 'GET' } },
    };
    const after = {
      root: 'page',
      elements: {
        page: { type: 'box', children: ['btn', 'msg', 'err'] },
        btn: { type: 'touchable', props: { label: 'Submit' } },
        err: { type: 'text', props: { content: 'Error occurred' } },
      },
      dataSources: { items: { url: '/api/items', method: 'GET' }, users: { url: '/api/users', method: 'GET' } },
    };
    const patches = computePatches(before, after);
    const result = applyPatches(structuredClone(before) as Record<string, unknown>, patches);
    expect(result).toEqual(after);
  });

  it('handles null and undefined values', () => {
    const before = { a: null as unknown };
    const after = { a: 'value' };
    const patches = computePatches(before, after);
    expect(patches).toHaveLength(1);
    expect(patches[0].op).toBe('replace');
  });

  it('handles empty objects', () => {
    const patches = computePatches({}, { a: 1 });
    expect(patches).toHaveLength(1);
    expect(patches[0]).toEqual({ op: 'add', path: '/a', value: 1 });
  });
});
