import { describe, it, expect } from 'vitest';
import { validate, registerValidator } from '../../src/validation/validators.js';
import type { ValidatorCheck } from '../../src/validation/validators.js';

describe('Validation System', () => {
  describe('required', () => {
    it('fails for null', () => {
      expect(validate(null, [{ type: 'required' }]).valid).toBe(false);
    });
    it('fails for undefined', () => {
      expect(validate(undefined, [{ type: 'required' }]).valid).toBe(false);
    });
    it('fails for empty string', () => {
      expect(validate('', [{ type: 'required' }]).valid).toBe(false);
    });
    it('fails for whitespace-only string', () => {
      expect(validate('   ', [{ type: 'required' }]).valid).toBe(false);
    });
    it('passes for non-empty string', () => {
      expect(validate('hello', [{ type: 'required' }]).valid).toBe(true);
    });
    it('passes for zero', () => {
      expect(validate(0, [{ type: 'required' }]).valid).toBe(true);
    });
  });

  describe('email', () => {
    it('passes valid email', () => {
      expect(validate('test@example.com', [{ type: 'email' }]).valid).toBe(true);
    });
    it('fails invalid email', () => {
      expect(validate('not-an-email', [{ type: 'email' }]).valid).toBe(false);
    });
    it('skips empty value', () => {
      expect(validate('', [{ type: 'email' }]).valid).toBe(true);
    });
  });

  describe('minLength / maxLength', () => {
    it('fails when too short', () => {
      expect(validate('ab', [{ type: 'minLength', args: { min: 3 } }]).valid).toBe(false);
    });
    it('passes when long enough', () => {
      expect(validate('abc', [{ type: 'minLength', args: { min: 3 } }]).valid).toBe(true);
    });
    it('fails when too long', () => {
      expect(validate('abcdef', [{ type: 'maxLength', args: { max: 5 } }]).valid).toBe(false);
    });
    it('passes when short enough', () => {
      expect(validate('abcde', [{ type: 'maxLength', args: { max: 5 } }]).valid).toBe(true);
    });
  });

  describe('pattern', () => {
    it('passes matching pattern', () => {
      expect(validate('ABC123', [{ type: 'pattern', args: { pattern: '^[A-Z0-9]+$' } }]).valid).toBe(true);
    });
    it('fails non-matching pattern', () => {
      expect(validate('abc', [{ type: 'pattern', args: { pattern: '^[A-Z]+$' } }]).valid).toBe(false);
    });
  });

  describe('min / max (numeric)', () => {
    it('fails below min', () => {
      expect(validate(5, [{ type: 'min', args: { min: 10 } }]).valid).toBe(false);
    });
    it('passes at min', () => {
      expect(validate(10, [{ type: 'min', args: { min: 10 } }]).valid).toBe(true);
    });
    it('fails above max', () => {
      expect(validate(15, [{ type: 'max', args: { max: 10 } }]).valid).toBe(false);
    });
    it('passes at max', () => {
      expect(validate(10, [{ type: 'max', args: { max: 10 } }]).valid).toBe(true);
    });
  });

  describe('numeric', () => {
    it('passes number', () => {
      expect(validate(42, [{ type: 'numeric' }]).valid).toBe(true);
    });
    it('passes numeric string', () => {
      expect(validate('42.5', [{ type: 'numeric' }]).valid).toBe(true);
    });
    it('fails non-numeric string', () => {
      expect(validate('abc', [{ type: 'numeric' }]).valid).toBe(false);
    });
    it('skips empty', () => {
      expect(validate('', [{ type: 'numeric' }]).valid).toBe(true);
    });
  });

  describe('url', () => {
    it('passes valid URL', () => {
      expect(validate('https://example.com', [{ type: 'url' }]).valid).toBe(true);
    });
    it('fails invalid URL', () => {
      expect(validate('not-a-url', [{ type: 'url' }]).valid).toBe(false);
    });
  });

  describe('matches / equalTo (cross-field)', () => {
    it('passes when values match', () => {
      expect(validate('password123', [{ type: 'matches', args: { other: 'password123' } }]).valid).toBe(true);
    });
    it('fails when values differ', () => {
      expect(validate('password123', [{ type: 'matches', args: { other: 'different' } }]).valid).toBe(false);
    });
  });

  describe('greaterThan / lessThan (cross-field)', () => {
    it('passes greaterThan', () => {
      expect(validate(20, [{ type: 'greaterThan', args: { other: 10 } }]).valid).toBe(true);
    });
    it('fails greaterThan', () => {
      expect(validate(5, [{ type: 'greaterThan', args: { other: 10 } }]).valid).toBe(false);
    });
    it('passes lessThan', () => {
      expect(validate(5, [{ type: 'lessThan', args: { other: 10 } }]).valid).toBe(true);
    });
    it('fails lessThan', () => {
      expect(validate(20, [{ type: 'lessThan', args: { other: 10 } }]).valid).toBe(false);
    });
  });

  describe('requiredIf (conditional)', () => {
    it('requires when condition is truthy', () => {
      expect(validate('', [{ type: 'requiredIf', args: { field: true } }]).valid).toBe(false);
    });
    it('skips when condition is falsy', () => {
      expect(validate('', [{ type: 'requiredIf', args: { field: false } }]).valid).toBe(true);
    });
    it('passes when condition is truthy and value provided', () => {
      expect(validate('hello', [{ type: 'requiredIf', args: { field: true } }]).valid).toBe(true);
    });
  });

  describe('multiple checks', () => {
    it('runs all checks and collects errors', () => {
      const checks: ValidatorCheck[] = [
        { type: 'required', message: 'Email is required' },
        { type: 'email', message: 'Invalid email' },
      ];
      const result = validate('', checks);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['Email is required']);
    });

    it('all pass returns valid', () => {
      const checks: ValidatorCheck[] = [
        { type: 'required' },
        { type: 'email' },
        { type: 'minLength', args: { min: 5 } },
      ];
      expect(validate('test@example.com', checks).valid).toBe(true);
    });
  });

  describe('custom messages', () => {
    it('uses custom message when provided', () => {
      const result = validate('', [{ type: 'required', message: 'Please fill this in' }]);
      expect(result.errors[0]).toBe('Please fill this in');
    });
    it('uses default message when not provided', () => {
      const result = validate('', [{ type: 'required' }]);
      expect(result.errors[0]).toBe('This field is required');
    });
  });

  describe('enabled flag (conditional validation)', () => {
    it('skips check when enabled is false', () => {
      expect(validate('', [{ type: 'required', enabled: false }]).valid).toBe(true);
    });
    it('runs check when enabled is true', () => {
      expect(validate('', [{ type: 'required', enabled: true }]).valid).toBe(false);
    });
  });

  describe('custom validator registration', () => {
    it('registers and uses a custom validator', () => {
      registerValidator('isEven', (value) => (Number(value) % 2 === 0));
      expect(validate(4, [{ type: 'isEven', message: 'Must be even' }]).valid).toBe(true);
      expect(validate(3, [{ type: 'isEven', message: 'Must be even' }]).valid).toBe(false);
    });
  });

  describe('unknown validator', () => {
    it('reports error for unknown type', () => {
      const result = validate('x', [{ type: 'nonexistentValidator' }]);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Unknown validator');
    });
  });
});
