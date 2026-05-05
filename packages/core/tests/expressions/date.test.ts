import { describe, it, expect } from 'vitest';
import { createResolver } from '../../src/expressions/resolver.js';
import { createStateStore } from '../../src/state/store.js';

describe('$date handler', () => {
  const store = createStateStore({
    patient: { birthDate: '1992-05-14' },
    event: { start: '2026-01-01', end: '2026-03-28' },
  });
  const resolver = createResolver({ store });

  it('calculates age from birthdate', () => {
    const age = resolver.resolve({ $date: 'age', from: { $state: '/patient/birthDate' } }) as number;
    expect(age).toBeGreaterThanOrEqual(33);
    expect(age).toBeLessThanOrEqual(34);
  });

  it('returns today as YYYY-MM-DD', () => {
    const today = resolver.resolve({ $date: 'today' }) as string;
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns now as ISO string', () => {
    const now = resolver.resolve({ $date: 'now' }) as string;
    expect(now).toContain('T');
  });

  it('diffs in days', () => {
    const diff = resolver.resolve({
      $date: 'diff', from: { $state: '/event/start' }, to: { $state: '/event/end' }, unit: 'days',
    }) as number;
    expect(diff).toBe(86); // Jan 1 to Mar 28
  });

  it('diffs in months', () => {
    const diff = resolver.resolve({
      $date: 'diff', from: '2026-01-15', to: '2026-03-15', unit: 'months',
    }) as number;
    expect(diff).toBe(2);
  });

  it('formats date', () => {
    const formatted = resolver.resolve({
      $date: 'format', value: '2026-06-15T12:00:00', pattern: 'short',
    }) as string;
    expect(formatted).toContain('2026');
  });

  it('adds days', () => {
    const result = resolver.resolve({
      $date: 'add', value: '2026-01-01', amount: 10, unit: 'days',
    }) as string;
    expect(result).toBe('2026-01-11');
  });

  it('adds months', () => {
    const result = resolver.resolve({
      $date: 'add', value: '2026-01-15', amount: 2, unit: 'months',
    }) as string;
    expect(result).toBe('2026-03-15');
  });

  it('returns 0 for empty birthdate', () => {
    expect(resolver.resolve({ $date: 'age', from: '' })).toBe(0);
  });
});
