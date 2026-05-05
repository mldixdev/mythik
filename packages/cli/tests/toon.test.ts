import { describe, it, expect } from 'vitest';
import { toToon, fromToon, autoparse } from '../src/toon.js';

describe('toToon / fromToon', () => {
  it('encodes and decodes a simple object', () => {
    const obj = { name: 'Alice', age: 30 };
    const toon = toToon(obj);
    expect(typeof toon).toBe('string');
    expect(toon).not.toContain('{');
    const decoded = fromToon(toon);
    expect(decoded).toEqual(obj);
  });

  it('roundtrips a Mythik spec element', () => {
    const element = {
      type: 'box',
      props: { content: { $state: '/user/name' }, style: { padding: 12, color: '#333' } },
      children: ['child-a', 'child-b'],
      hover: { backgroundColor: '#F1F5F9' },
    };
    const toon = toToon(element);
    const decoded = fromToon(toon);
    expect(decoded).toEqual(element);
  });

  it('roundtrips an array of RFC 6902 patches', () => {
    const patches = [
      { op: 'replace', path: '/elements/title/props/content', value: 'Hello' },
      { op: 'add', path: '/elements/new-btn', value: { type: 'button', props: { label: 'Click' } } },
    ];
    const toon = toToon(patches);
    const decoded = fromToon(toon);
    expect(decoded).toEqual(patches);
  });

  it('applies keyFolding for single-key wrappers', () => {
    const obj = { outer: { inner: 'value' } };
    const toon = toToon(obj);
    expect(toon).toContain('outer.inner');
  });

  it('produces shorter output than pretty-printed JSON', () => {
    const spec = {
      root: 'main',
      elements: {
        main: { type: 'stack', props: { direction: 'vertical' }, children: ['a', 'b'] },
        a: { type: 'text', props: { content: 'hello' } },
        b: { type: 'input', props: { value: { $bindState: '/form/email' }, placeholder: 'Email' } },
      },
    };
    const json = JSON.stringify(spec, null, 2);
    const toon = toToon(spec);
    expect(toon.length).toBeLessThan(json.length);
  });
});

describe('autoparse', () => {
  it('detects JSON array (starts with [)', () => {
    const input = '[{"op":"replace","path":"/x","value":"y"}]';
    const result = autoparse(input);
    expect(Array.isArray(result)).toBe(true);
    expect((result as any[])[0].op).toBe('replace');
  });

  it('detects JSON object (starts with {)', () => {
    const input = '{"name":"Alice"}';
    const result = autoparse(input);
    expect(result).toEqual({ name: 'Alice' });
  });

  it('detects TOON input (no [ or { prefix)', () => {
    const obj = { type: 'text', props: { content: 'hello' } };
    const toonStr = toToon(obj);
    const result = autoparse(toonStr);
    expect(result).toEqual(obj);
  });

  it('handles whitespace before JSON', () => {
    const input = '  \n  [{"op":"add","path":"/x","value":1}]';
    const result = autoparse(input);
    expect(Array.isArray(result)).toBe(true);
  });
});
