import { describe, it, expect } from 'vitest';
import { applyDataOperations } from '../../src/interactions/data-operations.js';

const SAMPLE_DATA = [
  { id: 1, name: 'Alice', email: 'alice@test.com', age: 30, status: 'active' },
  { id: 2, name: 'Bob', email: 'bob@test.com', age: 25, status: 'inactive' },
  { id: 3, name: 'Charlie', email: 'charlie@test.com', age: 35, status: 'active' },
  { id: 4, name: 'Diana', email: 'diana@test.com', age: 28, status: 'active' },
  { id: 5, name: 'Eve', email: 'eve@test.com', age: 22, status: 'inactive' },
];

describe('applyDataOperations', () => {
  describe('search', () => {
    it('filters by search query across fields', () => {
      const result = applyDataOperations(SAMPLE_DATA, {
        search: { enabled: true, fields: ['name', 'email'] },
      }, { search: 'alice' });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Alice');
    });

    it('searches case-insensitively', () => {
      const result = applyDataOperations(SAMPLE_DATA, {
        search: { enabled: true, fields: ['name'] },
      }, { search: 'BOB' });
      expect(result.data).toHaveLength(1);
    });

    it('matches partial strings', () => {
      const result = applyDataOperations(SAMPLE_DATA, {
        search: { enabled: true, fields: ['name'] },
      }, { search: 'li' });
      expect(result.data).toHaveLength(2); // Alice, Charlie
    });
  });

  describe('filter', () => {
    it('filters by exact value', () => {
      const result = applyDataOperations(SAMPLE_DATA, {
        filter: { fields: [{ field: 'status', type: 'select', options: ['active', 'inactive'] }] },
      }, { filters: { status: 'active' } });
      expect(result.data).toHaveLength(3);
    });

    it('filters by range', () => {
      const result = applyDataOperations(SAMPLE_DATA, {
        filter: { fields: [{ field: 'age', type: 'number-range' }] },
      }, { filters: { age: [25, 30] } });
      expect(result.data).toHaveLength(3); // Bob(25), Alice(30), Diana(28)
    });

    it('ignores empty filter values', () => {
      const result = applyDataOperations(SAMPLE_DATA, {
        filter: { fields: [{ field: 'status', type: 'select' }] },
      }, { filters: { status: '' } });
      expect(result.data).toHaveLength(5);
    });
  });

  describe('sort', () => {
    it('sorts ascending by field', () => {
      const result = applyDataOperations(SAMPLE_DATA, {
        sort: { enabled: true },
      }, { sort: { field: 'age', direction: 'asc' } });
      expect(result.data[0].name).toBe('Eve'); // 22
      expect(result.data[4].name).toBe('Charlie'); // 35
    });

    it('sorts descending', () => {
      const result = applyDataOperations(SAMPLE_DATA, {
        sort: { enabled: true },
      }, { sort: { field: 'age', direction: 'desc' } });
      expect(result.data[0].name).toBe('Charlie'); // 35
    });

    it('sorts strings alphabetically', () => {
      const result = applyDataOperations(SAMPLE_DATA, {
        sort: { enabled: true },
      }, { sort: { field: 'name', direction: 'asc' } });
      expect(result.data[0].name).toBe('Alice');
      expect(result.data[4].name).toBe('Eve');
    });

    it('uses default sort from config', () => {
      const result = applyDataOperations(SAMPLE_DATA, {
        sort: { enabled: true, default: { field: 'name', direction: 'asc' } },
      }, {});
      expect(result.data[0].name).toBe('Alice');
    });
  });

  describe('pagination', () => {
    it('paginates results', () => {
      const result = applyDataOperations(SAMPLE_DATA, {
        pagination: { type: 'pages', pageSize: 2 },
      }, { page: 0 });
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(5);
      expect(result.totalPages).toBe(3);
    });

    it('returns second page', () => {
      const result = applyDataOperations(SAMPLE_DATA, {
        pagination: { type: 'pages', pageSize: 2 },
      }, { page: 1 });
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('Charlie');
    });

    it('returns partial last page', () => {
      const result = applyDataOperations(SAMPLE_DATA, {
        pagination: { type: 'pages', pageSize: 2 },
      }, { page: 2 });
      expect(result.data).toHaveLength(1);
    });
  });

  describe('combined operations', () => {
    it('search + sort + paginate', () => {
      const result = applyDataOperations(SAMPLE_DATA, {
        search: { enabled: true, fields: ['name'] },
        sort: { enabled: true },
        pagination: { type: 'pages', pageSize: 10 },
      }, { search: 'a', sort: { field: 'age', direction: 'asc' } });
      // Matches: Alice(30), Charlie(35), Diana(28)
      expect(result.data).toHaveLength(3);
      expect(result.data[0].name).toBe('Diana'); // youngest
      expect(result.data[2].name).toBe('Charlie'); // oldest
    });
  });
});
