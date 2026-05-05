import { describe, it, expect } from 'vitest';
import { levenshtein, suggest } from '../src/levenshtein.js';

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('abc', 'abc')).toBe(0);
  });

  it('returns length of other string when one is empty', () => {
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
  });

  it('counts single character difference', () => {
    expect(levenshtein('cat', 'car')).toBe(1);
  });

  it('counts insertion', () => {
    expect(levenshtein('task-manager', 'task-managerr')).toBe(1);
  });

  it('counts deletion', () => {
    expect(levenshtein('task-manager', 'task-manage')).toBe(1);
  });

  it('counts multiple edits', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
  });
});

describe('suggest', () => {
  const candidates = ['task-manager', 'dashboard', 'settings'];

  it('suggests closest match within threshold', () => {
    expect(suggest('task-managerr', candidates)).toBe('task-manager');
  });

  it('suggests closest match for typo', () => {
    expect(suggest('dashbord', candidates)).toBe('dashboard');
  });

  it('returns null when no match is within threshold', () => {
    expect(suggest('xyzabc', candidates)).toBeNull();
  });

  it('returns null for empty candidates', () => {
    expect(suggest('task-manager', [])).toBeNull();
  });
});
