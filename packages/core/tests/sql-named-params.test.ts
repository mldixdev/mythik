import { describe, expect, it } from 'vitest';

import { SqlDriverError } from '../src/sql/errors.js';
import * as sqlBoundary from '../src/sql/index.js';

type CompileNamedParams = (
  dialect: 'sqlserver' | 'postgres' | 'mysql' | 'sqlite',
  sql: string,
  params: Record<string, unknown>,
) => { sql: string; params: unknown };

const compileNamedParams = (sqlBoundary as { compileNamedParams?: CompileNamedParams }).compileNamedParams as CompileNamedParams;

describe('compileNamedParams', () => {
  it('compiles named params to postgres positional params', () => {
    const result = compileNamedParams('postgres', 'SELECT * FROM screens WHERE id = @id AND version = @version', {
      id: 'home',
      version: 3,
    });

    expect(result).toEqual({
      sql: 'SELECT * FROM screens WHERE id = $1 AND version = $2',
      params: ['home', 3],
    });
  });

  it('compiles named params to mysql positional params', () => {
    const result = compileNamedParams('mysql', 'SELECT * FROM screens WHERE id = @id AND version = @version', {
      id: 'home',
      version: 3,
    });

    expect(result).toEqual({
      sql: 'SELECT * FROM screens WHERE id = ? AND version = ?',
      params: ['home', 3],
    });
  });

  it('compiles named params to sqlite positional params', () => {
    const result = compileNamedParams('sqlite', 'SELECT * FROM screens WHERE id = @id AND version = @version', {
      id: 'home',
      version: 3,
    });

    expect(result).toEqual({
      sql: 'SELECT * FROM screens WHERE id = ? AND version = ?',
      params: ['home', 3],
    });
  });

  it('preserves sqlserver named params and validates params', () => {
    const result = compileNamedParams('sqlserver', 'SELECT * FROM screens WHERE id = @id AND version = @version', {
      id: 'home',
      version: 3,
    });

    expect(result).toEqual({
      sql: 'SELECT * FROM screens WHERE id = @id AND version = @version',
      params: { id: 'home', version: 3 },
    });
  });

  it('reuses postgres placeholders for repeated params', () => {
    const result = compileNamedParams('postgres', 'SELECT * FROM screens WHERE id = @id OR parent_id = @id', {
      id: 'home',
    });

    expect(result).toEqual({
      sql: 'SELECT * FROM screens WHERE id = $1 OR parent_id = $1',
      params: ['home'],
    });
  });

  it('duplicates mysql positional values for repeated params', () => {
    const result = compileNamedParams('mysql', 'SELECT * FROM screens WHERE id = @id OR parent_id = @id', {
      id: 'home',
    });

    expect(result).toEqual({
      sql: 'SELECT * FROM screens WHERE id = ? OR parent_id = ?',
      params: ['home', 'home'],
    });
  });

  it('throws a stable error for missing params', () => {
    expect(() => compileNamedParams('postgres', 'SELECT * FROM screens WHERE id = @id', {})).toThrow(SqlDriverError);

    try {
      compileNamedParams('postgres', 'SELECT * FROM screens WHERE id = @id', {});
    } catch (error) {
      expect(error).toBeInstanceOf(SqlDriverError);
      expect((error as SqlDriverError).code).toBe('SQL_PARAM_MISSING');
      expect((error as SqlDriverError).dialect).toBe('postgres');
    }
  });

  it('does not replace params inside single quoted strings', () => {
    const result = compileNamedParams('postgres', "SELECT '@id' AS literal, id FROM screens WHERE id = @id", {
      id: 'home',
    });

    expect(result).toEqual({
      sql: "SELECT '@id' AS literal, id FROM screens WHERE id = $1",
      params: ['home'],
    });
  });

  it('does not replace params inside double quoted identifiers', () => {
    const result = compileNamedParams('postgres', 'SELECT "@id" FROM screens WHERE id = @id', {
      id: 'home',
    });

    expect(result).toEqual({
      sql: 'SELECT "@id" FROM screens WHERE id = $1',
      params: ['home'],
    });
  });

  it('does not replace params inside line comments', () => {
    const result = compileNamedParams('postgres', 'SELECT * FROM screens -- @ignored\nWHERE id = @id', {
      id: 'home',
    });

    expect(result).toEqual({
      sql: 'SELECT * FROM screens -- @ignored\nWHERE id = $1',
      params: ['home'],
    });
  });

  it('does not replace params inside block comments', () => {
    const result = compileNamedParams('postgres', 'SELECT * FROM screens /* @ignored */ WHERE id = @id', {
      id: 'home',
    });

    expect(result).toEqual({
      sql: 'SELECT * FROM screens /* @ignored */ WHERE id = $1',
      params: ['home'],
    });
  });

  it('does not replace params inside sqlserver bracket identifiers', () => {
    const result = compileNamedParams('sqlserver', 'SELECT [@id] FROM [screens] WHERE [id] = @id', {
      id: 'home',
    });

    expect(result).toEqual({
      sql: 'SELECT [@id] FROM [screens] WHERE [id] = @id',
      params: { id: 'home' },
    });
  });

  it('replaces params inside postgres array subscripts', () => {
    const result = compileNamedParams('postgres', 'SELECT values[@idx] FROM screens WHERE id = @id', {
      idx: 2,
      id: 'home',
    });

    expect(result).toEqual({
      sql: 'SELECT values[$1] FROM screens WHERE id = $2',
      params: [2, 'home'],
    });
  });

  it('does not replace params inside mysql backtick identifiers', () => {
    const result = compileNamedParams('mysql', 'SELECT `@id` FROM `screens` WHERE `id` = @id', {
      id: 'home',
    });

    expect(result).toEqual({
      sql: 'SELECT `@id` FROM `screens` WHERE `id` = ?',
      params: ['home'],
    });
  });

  it('keeps escaped quotes from breaking the scanner', () => {
    const result = compileNamedParams('postgres', "SELECT 'it''s @literal' AS text WHERE id = @id", {
      id: 'home',
    });

    expect(result).toEqual({
      sql: "SELECT 'it''s @literal' AS text WHERE id = $1",
      params: ['home'],
    });
  });

  it('does not replace params inside PostgreSQL E strings with escaped quotes', () => {
    const result = compileNamedParams('postgres', "SELECT E'it\\'s @literal' AS text WHERE id = @id", {
      id: 'home',
    });

    expect(result).toEqual({
      sql: "SELECT E'it\\'s @literal' AS text WHERE id = $1",
      params: ['home'],
    });
  });

  it('does not replace params inside PostgreSQL E strings with doubled quotes', () => {
    const result = compileNamedParams('postgres', "SELECT E'it''s @literal' AS text WHERE id = @id", {
      id: 'home',
    });

    expect(result).toEqual({
      sql: "SELECT E'it''s @literal' AS text WHERE id = $1",
      params: ['home'],
    });
  });
});
