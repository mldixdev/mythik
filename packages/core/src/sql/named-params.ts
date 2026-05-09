import { SqlDriverError } from './errors.js';
import type { SqlDialect, SqlStatement } from './types.js';

type CompiledParams = Record<string, unknown> | unknown[];

export interface CompiledNamedParams extends SqlStatement {
  params: CompiledParams;
}

function isNameStart(char: string | undefined): boolean {
  return char !== undefined && /[A-Za-z_]/.test(char);
}

function isNamePart(char: string | undefined): boolean {
  return char !== undefined && /[A-Za-z0-9_]/.test(char);
}

function requireParam(dialect: SqlDialect, params: Record<string, unknown>, name: string): unknown {
  if (!Object.prototype.hasOwnProperty.call(params, name)) {
    throw new SqlDriverError(`Missing SQL parameter "${name}"`, {
      code: 'SQL_PARAM_MISSING',
      dialect,
    });
  }
  return params[name];
}

export function compileNamedParams(
  dialect: SqlDialect,
  sql: string,
  params: Record<string, unknown>,
): CompiledNamedParams {
  let output = '';
  const positionalValues: unknown[] = [];
  const sqlServerValues: Record<string, unknown> = {};
  const postgresIndexes = new Map<string, number>();

  function placeholder(name: string): string {
    const value = requireParam(dialect, params, name);

    if (dialect === 'sqlserver') {
      sqlServerValues[name] = value;
      return `@${name}`;
    }

    if (dialect === 'postgres') {
      let index = postgresIndexes.get(name);
      if (index === undefined) {
        positionalValues.push(value);
        index = positionalValues.length;
        postgresIndexes.set(name, index);
      }
      return `$${index}`;
    }

    positionalValues.push(value);
    return '?';
  }

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index]!;
    const next = sql[index + 1];

    if (dialect === 'postgres' && (char === 'E' || char === 'e') && next === "'") {
      output += char + next;
      index += 2;
      while (index < sql.length) {
        const current = sql[index]!;
        output += current;
        if (current === '\\' && index + 1 < sql.length) {
          output += sql[index + 1];
          index += 2;
          continue;
        }
        if (current === "'" && sql[index + 1] === "'") {
          output += sql[index + 1];
          index += 2;
          continue;
        }
        if (current === "'") break;
        index += 1;
      }
      continue;
    }

    if (char === "'") {
      output += char;
      index += 1;
      while (index < sql.length) {
        const current = sql[index]!;
        output += current;
        if (current === "'" && sql[index + 1] === "'") {
          output += sql[index + 1];
          index += 2;
          continue;
        }
        if (current === "'") break;
        index += 1;
      }
      continue;
    }

    if (char === '"') {
      output += char;
      index += 1;
      while (index < sql.length) {
        const current = sql[index]!;
        output += current;
        if (current === '"' && sql[index + 1] === '"') {
          output += sql[index + 1];
          index += 2;
          continue;
        }
        if (current === '"') break;
        index += 1;
      }
      continue;
    }

    if (char === '-' && next === '-') {
      output += char + next;
      index += 2;
      while (index < sql.length) {
        const current = sql[index]!;
        output += current;
        if (current === '\n') break;
        index += 1;
      }
      continue;
    }

    if (char === '/' && next === '*') {
      output += char + next;
      index += 2;
      while (index < sql.length) {
        const current = sql[index]!;
        const after = sql[index + 1];
        output += current;
        if (current === '*' && after === '/') {
          output += after;
          index += 1;
          break;
        }
        index += 1;
      }
      continue;
    }

    if (dialect === 'sqlserver' && char === '[') {
      output += char;
      index += 1;
      while (index < sql.length) {
        const current = sql[index]!;
        output += current;
        if (current === ']' && sql[index + 1] === ']') {
          output += sql[index + 1];
          index += 2;
          continue;
        }
        if (current === ']') break;
        index += 1;
      }
      continue;
    }

    if (char === '`') {
      output += char;
      index += 1;
      while (index < sql.length) {
        const current = sql[index]!;
        output += current;
        if (current === '`' && sql[index + 1] === '`') {
          output += sql[index + 1];
          index += 2;
          continue;
        }
        if (current === '`') break;
        index += 1;
      }
      continue;
    }

    if (char === '@' && next === '@') {
      output += '@@';
      index += 1;
      continue;
    }

    if (char === '@' && isNameStart(next)) {
      let end = index + 2;
      while (isNamePart(sql[end])) end += 1;
      const name = sql.slice(index + 1, end);
      output += placeholder(name);
      index = end - 1;
      continue;
    }

    output += char;
  }

  return {
    sql: output,
    params: dialect === 'sqlserver' ? sqlServerValues : positionalValues,
  };
}
