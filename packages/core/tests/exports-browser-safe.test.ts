import { describe, it, expect, beforeAll } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { init, parse } from 'es-module-lexer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = resolve(__dirname, '..', 'dist');

const NODE_BUILTINS_FORBIDDEN = new Set([
  'mssql',
  'fs', 'node:fs',
  'path', 'node:path',
  'net', 'node:net',
  'tls', 'node:tls',
  'child_process', 'node:child_process',
  'dns', 'node:dns',
  'os', 'node:os',
  'crypto', 'node:crypto',
]);

/**
 * Walk the static import graph starting from an entry file.
 * Returns the set of bare-specifier imports encountered transitively.
 * Relative imports (./foo.js) are resolved and followed. Absolute bare
 * specifiers (mssql, fs, @scope/pkg) are recorded and NOT followed.
 */
async function collectBareSpecifiers(entry: string): Promise<Set<string>> {
  await init;
  const seen = new Set<string>();
  const bareSpecifiers = new Set<string>();
  const queue: string[] = [entry];

  while (queue.length > 0) {
    const file = queue.shift()!;
    if (seen.has(file)) continue;
    seen.add(file);

    let source: string;
    try {
      source = await readFile(file, 'utf8');
    } catch {
      continue; // .d.ts files or missing files are skipped
    }

    const [imports] = parse(source);
    for (const imp of imports) {
      if (imp.n === undefined) continue; // dynamic import with non-literal specifier
      const spec = imp.n;
      if (spec.startsWith('./') || spec.startsWith('../')) {
        // Relative import — resolve and follow
        const resolved = resolve(dirname(file), spec);
        queue.push(resolved);
      } else {
        // Bare specifier — record
        bareSpecifiers.add(spec);
      }
    }
  }

  return bareSpecifiers;
}

describe('mythik browser-safe exports invariant', () => {
  let mainImports: Set<string>;
  let serverImports: Set<string>;

  beforeAll(async () => {
    mainImports = await collectBareSpecifiers(resolve(DIST_DIR, 'index.js'));
    serverImports = await collectBareSpecifiers(resolve(DIST_DIR, 'server.js'));
  });

  it('dist/index.js has zero Node-builtin transitive imports', () => {
    const violations = [...mainImports].filter((spec) =>
      NODE_BUILTINS_FORBIDDEN.has(spec),
    );
    expect(violations, `Node-only modules leaked into browser entry: ${violations.join(', ')}`).toEqual([]);
  });

  it('dist/index.js does not transitively import mssql', () => {
    expect(mainImports.has('mssql')).toBe(false);
  });

  it('dist/server.js includes mssql (server entry correctly exposes Node-only stores)', () => {
    expect(serverImports.has('mssql')).toBe(true);
  });

  it('dist/server.js imports fs (FileSpecStore is reachable)', () => {
    const hasFsImport = serverImports.has('fs') || serverImports.has('node:fs');
    expect(hasFsImport).toBe(true);
  });
});
