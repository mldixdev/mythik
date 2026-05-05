/**
 * Auto-discovery for `mythik lint` — finds spec files (`*.json`) and code
 * files (`*.{ts,tsx,js,jsx}`) based on LintOptions.
 *
 * Resolution order:
 * 1. Explicit `fromFile` flag → single file (filtered by extension)
 * 2. Explicit `fromDir` flag → walk directory
 * 3. No flags → spec auto-discovery via `.mythikrc` file store dir;
 *               code auto-discovery via `codeDir` (default './src')
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { loadConfig } from '../config.js';
import type { LintOptions } from './types.js';

const CODE_EXT_PATTERN = /\.(tsx?|jsx?)$/;

// Excluded from recursive walks — runtime artifacts and VCS internals.
// Prevents UX footgun when running `mythik lint --from-dir .` from project root.
const EXCLUDED_DIRS = new Set(['node_modules', 'dist', '.next', 'build', '.git']);

function walkDir(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && EXCLUDED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkDir(full));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

export async function discoverSpecs(opts: LintOptions): Promise<string[]> {
  if (opts.fromFile) {
    return opts.fromFile.endsWith('.json') ? [opts.fromFile] : [];
  }
  if (opts.fromDir) {
    return walkDir(opts.fromDir).filter(p => p.endsWith('.json'));
  }
  // No args: try .mythikrc file store
  try {
    const config = loadConfig({ cwd: opts.cwd });
    if (config.store === 'file' && config.file?.dir) {
      const cwd = opts.cwd ?? process.cwd();
      const specsDir = path.isAbsolute(config.file.dir) ? config.file.dir : path.resolve(cwd, config.file.dir);
      return walkDir(specsDir).filter(p => p.endsWith('.json'));
    }
  } catch {
    // No config or non-file store
  }
  return [];
}

export async function discoverCode(opts: LintOptions): Promise<string[]> {
  if (opts.fromFile) {
    return CODE_EXT_PATTERN.test(opts.fromFile) ? [opts.fromFile] : [];
  }
  if (opts.fromDir) {
    return walkDir(opts.fromDir).filter(p => CODE_EXT_PATTERN.test(p));
  }
  // No args: scan opts.codeDir or default './src'
  const cwd = opts.cwd ?? process.cwd();
  const codeDirRel = opts.codeDir ?? './src';
  const codeDir = path.isAbsolute(codeDirRel) ? codeDirRel : path.resolve(cwd, codeDirRel);
  if (!fs.existsSync(codeDir)) return [];
  return walkDir(codeDir).filter(p => CODE_EXT_PATTERN.test(p));
}
