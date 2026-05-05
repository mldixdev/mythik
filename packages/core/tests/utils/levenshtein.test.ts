import { describe, it, expect } from 'vitest';
import { levenshtein, suggest } from '../../src/utils/levenshtein.js';

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('button', 'button')).toBe(0);
  });

  it('returns correct distance for single edit', () => {
    expect(levenshtein('buton', 'button')).toBe(1);
  });

  it('returns correct distance for multiple edits', () => {
    expect(levenshtein('btn', 'button')).toBe(3);
  });
});

describe('suggest', () => {
  const primitives = ['box', 'text', 'button', 'input', 'stack', 'grid', 'modal', 'drawer', 'select', 'table'];

  it('suggests closest match within threshold', () => {
    expect(suggest('buton', primitives)).toBe('button');
  });

  it('suggests for short typos', () => {
    expect(suggest('tex', primitives)).toBe('text');
  });

  it('returns null when no match within threshold', () => {
    expect(suggest('zzzzzzzzz', primitives)).toBeNull();
  });

  it('returns null for empty candidates', () => {
    expect(suggest('btn', [])).toBeNull();
  });
});
