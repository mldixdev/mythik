import { describe, it, expect } from 'vitest';
import { evaluatePermission } from '../../src/permissions/evaluator.js';

describe('Permission Evaluator', () => {
  it('returns visible-editable when no permission config', () => {
    expect(evaluatePermission(undefined, 'admin')).toBe('visible-editable');
  });

  it('returns hidden when no role provided', () => {
    expect(evaluatePermission({ visible: ['admin'] }, undefined)).toBe('hidden');
  });

  it('returns visible-editable for editable role', () => {
    expect(evaluatePermission({
      visible: ['doctor', 'nurse', 'admin'],
      editable: ['doctor', 'admin'],
      readonly: ['nurse'],
    }, 'admin')).toBe('visible-editable');
  });

  it('returns visible-readonly for readonly role', () => {
    expect(evaluatePermission({
      visible: ['doctor', 'nurse', 'admin'],
      editable: ['doctor', 'admin'],
      readonly: ['nurse'],
    }, 'nurse')).toBe('visible-readonly');
  });

  it('returns hidden for role not in visible list', () => {
    expect(evaluatePermission({
      visible: ['doctor', 'admin'],
      editable: ['admin'],
    }, 'nurse')).toBe('hidden');
  });

  it('returns visible-editable for role in visible but not in editable/readonly', () => {
    expect(evaluatePermission({
      visible: ['doctor', 'admin'],
    }, 'doctor')).toBe('visible-editable');
  });

  it('editable takes precedence over readonly', () => {
    expect(evaluatePermission({
      editable: ['admin'],
      readonly: ['admin'], // conflicting — editable wins
    }, 'admin')).toBe('visible-editable');
  });

  it('returns visible-editable when no visible array defined and role is editable', () => {
    expect(evaluatePermission({
      editable: ['admin'],
    }, 'admin')).toBe('visible-editable');
  });

  it('returns visible-editable when no visible array and role not in editable/readonly', () => {
    expect(evaluatePermission({
      editable: ['admin'],
    }, 'nurse')).toBe('visible-editable');
  });

  it('handles empty permission config', () => {
    expect(evaluatePermission({}, 'anyone')).toBe('visible-editable');
  });
});
