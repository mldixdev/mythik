import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), 'packages/core/package.json'), 'utf8')) as {
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
};

describe('mythik package surface', () => {
  it('keeps SQL adapters as explicit optional peers instead of installed-by-default optional dependencies', () => {
    const sqlAdapters = ['better-sqlite3', 'mssql', 'mysql2', 'pg'];

    for (const adapter of sqlAdapters) {
      expect(packageJson.dependencies?.[adapter]).toBeUndefined();
      expect(packageJson.optionalDependencies?.[adapter]).toBeUndefined();
      expect(packageJson.peerDependencies?.[adapter]).toMatch(/^\^/);
      expect(packageJson.peerDependenciesMeta?.[adapter]?.optional).toBe(true);
    }
  });
});
