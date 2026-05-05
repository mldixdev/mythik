import { describe, it, expect } from 'vitest';
import { formatSuccess, formatError, formatJson, formatElementHeader, stripAnsi } from '../src/output.js';

describe('output', () => {
  describe('formatSuccess', () => {
    it('includes check icon and message', () => {
      const result = stripAnsi(formatSuccess('Patch applied'));
      expect(result).toContain('✓');
      expect(result).toContain('Patch applied');
    });
  });

  describe('formatError', () => {
    it('includes X icon and all 3 parts', () => {
      const result = stripAnsi(formatError({
        what: 'Screen not found',
        why: 'No screen with ID "foo"',
        fix: 'Check available screens',
      }));
      expect(result).toContain('✗');
      expect(result).toContain('Screen not found');
      expect(result).toContain('No screen with ID "foo"');
      expect(result).toContain('Check available screens');
    });

    it('works without fix', () => {
      const result = stripAnsi(formatError({
        what: 'Connection failed',
        why: 'Timeout',
      }));
      expect(result).toContain('Connection failed');
      expect(result).toContain('Timeout');
      expect(result).not.toContain('Fix:');
    });
  });

  describe('formatJson', () => {
    it('returns valid JSON string with no ANSI codes', () => {
      const result = formatJson({ success: true, count: 5 });
      expect(result).toBe('{"success":true,"count":5}');
      expect(() => JSON.parse(result)).not.toThrow();
    });
  });

  describe('formatElementHeader', () => {
    it('shows element id and type', () => {
      const result = stripAnsi(formatElementHeader('next-btn', 'button'));
      expect(result).toContain('next-btn');
      expect(result).toContain('button');
    });
  });
});
