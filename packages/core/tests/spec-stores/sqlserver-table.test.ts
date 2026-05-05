import { describe, it, expect } from 'vitest';
import { SqlServerSpecStore } from '../../src/spec-stores/sqlserver.js';

describe('SqlServerSpecStore — table config', () => {
  it('defaults to "screens" table', () => {
    const store = new SqlServerSpecStore({ server: 'localhost', database: 'TestDB' });
    expect((store as unknown as { tableName: string }).tableName).toBe('screens');
  });

  it('uses custom table name', () => {
    const store = new SqlServerSpecStore({ server: 'localhost', database: 'TestDB', table: 'api_specs' });
    expect((store as unknown as { tableName: string }).tableName).toBe('api_specs');
  });
});
