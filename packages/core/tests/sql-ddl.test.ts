import { describe, expect, it } from 'vitest';

import * as sqlBoundary from '../src/sql/index.js';

type SqlDialect = 'sqlserver' | 'postgres' | 'mysql' | 'sqlite';
type SqlStoreTable = 'screens' | 'screen_versions' | 'screen_environments';

const dialects: SqlDialect[] = ['sqlserver', 'postgres', 'mysql', 'sqlite'];
const tables: SqlStoreTable[] = ['screens', 'screen_versions', 'screen_environments'];

const SQL_STORE_DDL = (sqlBoundary as {
  SQL_STORE_DDL?: Record<SqlDialect, Record<SqlStoreTable, string>>;
}).SQL_STORE_DDL!;

const getSqlStoreDdl = (sqlBoundary as {
  getSqlStoreDdl?: (dialect: SqlDialect) => string[];
}).getSqlStoreDdl!;

describe('canonical SQL store DDL', () => {
  it('provides DDL for every supported dialect and canonical table', () => {
    expect(Object.keys(SQL_STORE_DDL).sort()).toEqual([...dialects].sort());

    for (const dialect of dialects) {
      expect(Object.keys(SQL_STORE_DDL[dialect]).sort()).toEqual([...tables].sort());
      for (const table of tables) {
        expect(SQL_STORE_DDL[dialect][table].trim()).not.toBe('');
      }
    }
  });

  it('defines canonical screens columns for every dialect', () => {
    for (const dialect of dialects) {
      const ddl = SQL_STORE_DDL[dialect].screens.toLowerCase();

      expect(ddl).toContain('id');
      expect(ddl).toContain('name');
      expect(ddl).toContain('spec');
      expect(ddl).toContain('version');
      expect(ddl).toContain('is_active');
      expect(ddl).toContain('updated_at');
    }
  });

  it('uses DATETIME(6) instead of TIMESTAMP for MySQL temporal metadata', () => {
    for (const table of tables) {
      const ddl = SQL_STORE_DDL.mysql[table].toLowerCase();

      expect(ddl).toContain('datetime(6)');
      expect(ddl).not.toContain(' timestamp ');
    }
  });

  it('defines canonical screen_versions columns and screen/version uniqueness', () => {
    for (const dialect of dialects) {
      const ddl = SQL_STORE_DDL[dialect].screen_versions.toLowerCase();

      expect(ddl).toContain('id');
      expect(ddl).toContain('screen_id');
      expect(ddl).toContain('version');
      expect(ddl).toContain('is_snapshot');
      expect(ddl).toContain('spec');
      expect(ddl).toContain('patches');
      expect(ddl).toContain('author');
      expect(ddl).toContain('source_type');
      expect(ddl).toContain('description');
      expect(ddl).toContain('created_at');
      expect(ddl).toMatch(/unique|primary key/);
      expect(ddl).toMatch(/screen_id[\s\S]*version|version[\s\S]*screen_id/);
    }
  });

  it('defines screen_environments as screen/environment identity', () => {
    for (const dialect of dialects) {
      const ddl = SQL_STORE_DDL[dialect].screen_environments.toLowerCase();

      expect(ddl).toContain('screen_id');
      expect(ddl).toContain('environment');
      expect(ddl).toContain('version');
      expect(ddl).toContain('promoted_at');
      expect(ddl).toContain('promoted_by');
      expect(ddl).toMatch(/primary key|unique/);
      expect(ddl).toMatch(/screen_id[\s\S]*environment|environment[\s\S]*screen_id/);
    }
  });

  it('returns DDL statements in dependency order', () => {
    for (const dialect of dialects) {
      const statements = getSqlStoreDdl(dialect);

      expect(statements).toEqual([
        SQL_STORE_DDL[dialect].screens,
        SQL_STORE_DDL[dialect].screen_versions,
        SQL_STORE_DDL[dialect].screen_environments,
      ]);
    }
  });

  it('keeps DDL as package data, not workspace file paths', () => {
    for (const dialect of dialects) {
      for (const table of tables) {
        const ddl = SQL_STORE_DDL[dialect][table];

        expect(ddl).not.toContain('docs/');
        expect(ddl).not.toContain('packages/');
        expect(ddl).not.toContain('D:');
      }
    }
  });
});
