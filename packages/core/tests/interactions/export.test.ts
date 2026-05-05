import { describe, it, expect } from 'vitest';
import { toCSV, toJSON } from '../../src/interactions/export.js';

describe('Export', () => {
  const data = [
    { name: 'Alice', age: 30, email: 'alice@test.com' },
    { name: 'Bob', age: 25, email: 'bob@test.com' },
  ];

  describe('toCSV', () => {
    it('generates CSV with headers from object keys', () => {
      const csv = toCSV(data);
      const lines = csv.split('\n');
      expect(lines[0]).toBe('name,age,email');
      expect(lines[1]).toBe('Alice,30,alice@test.com');
      expect(lines[2]).toBe('Bob,25,bob@test.com');
    });

    it('uses custom column labels', () => {
      const csv = toCSV(data, [
        { field: 'name', label: 'Full Name' },
        { field: 'email', label: 'Email Address' },
      ]);
      const lines = csv.split('\n');
      expect(lines[0]).toBe('Full Name,Email Address');
      expect(lines[1]).toBe('Alice,alice@test.com');
    });

    it('escapes values with commas', () => {
      const csv = toCSV([{ name: 'Doe, Jane', age: 30 }]);
      expect(csv).toContain('"Doe, Jane"');
    });

    it('escapes values with quotes', () => {
      const csv = toCSV([{ name: 'She said "hello"', age: 30 }]);
      expect(csv).toContain('"She said ""hello"""');
    });

    it('returns empty string for empty data', () => {
      expect(toCSV([])).toBe('');
    });

    it('applies format functions', () => {
      const csv = toCSV(data, [
        { field: 'name', label: 'Name' },
        { field: 'age', label: 'Age', format: (v) => `${v} years` },
      ]);
      expect(csv).toContain('30 years');
    });
  });

  describe('toJSON', () => {
    it('generates formatted JSON', () => {
      const json = toJSON(data);
      const parsed = JSON.parse(json);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].name).toBe('Alice');
    });

    it('uses custom columns with labels', () => {
      const json = toJSON(data, [
        { field: 'name', label: 'Full Name' },
        { field: 'age', label: 'Years' },
      ]);
      const parsed = JSON.parse(json);
      expect(parsed[0]['Full Name']).toBe('Alice');
      expect(parsed[0]['Years']).toBe(30);
    });
  });
});
