import { describe, it, expect } from 'vitest';
import { evaluatePolicy } from '../../src/auth/policy-evaluator.js';
import type { PolicyConfig } from '../../src/auth/types.js';

const policies: Record<string, PolicyConfig> = {
  records: { roles: ['ADMIN', 'EDITOR'] },
  admin: { roles: ['ADMIN'] },
  reportes: { roles: ['ADMIN', 'REPORTER', 'AUDITOR'] },
};

describe('evaluatePolicy', () => {
  it('"public" always returns true regardless of roles', () => {
    expect(evaluatePolicy('public', [], policies)).toBe(true);
    expect(evaluatePolicy('public', ['ADMIN'], policies)).toBe(true);
  });

  it('"authenticated" returns true for any user', () => {
    expect(evaluatePolicy('authenticated', ['EDITOR'], policies)).toBe(true);
    expect(evaluatePolicy('authenticated', [], policies)).toBe(true);
  });

  it('named policy checks role intersection', () => {
    expect(evaluatePolicy('records', ['ADMIN'], policies)).toBe(true);
    expect(evaluatePolicy('records', ['EDITOR'], policies)).toBe(true);
    expect(evaluatePolicy('records', ['REPORTER'], policies)).toBe(false);
  });

  it('admin policy requires ADMIN', () => {
    expect(evaluatePolicy('admin', ['ADMIN'], policies)).toBe(true);
    expect(evaluatePolicy('admin', ['EDITOR'], policies)).toBe(false);
    expect(evaluatePolicy('admin', ['REPORTER', 'EDITOR'], policies)).toBe(false);
  });

  it('user with multiple roles passes if any match', () => {
    expect(evaluatePolicy('reportes', ['EDITOR', 'AUDITOR'], policies)).toBe(true);
  });

  it('unknown policy name returns false', () => {
    expect(evaluatePolicy('nonexistent', ['ADMIN'], policies)).toBe(false);
  });

  it('empty policy name defaults to "authenticated"', () => {
    expect(evaluatePolicy(undefined, ['EDITOR'], policies)).toBe(true);
  });
});
