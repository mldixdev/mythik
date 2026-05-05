/**
 * E2E test for orchestrator's no-TypeScript degraded path.
 *
 * The unit tests in `code-rules.test.ts` cover `loadTypeScript()` directly (3 scenarios:
 * happy path, module-not-found, network-error fallback). This file covers the orchestrator's
 * INTEGRATION of that path: when `loadTypeScript` returns null, `runLint` must emit exactly
 * one `lint-meta-no-typescript` finding and skip code-rule scanning entirely.
 *
 * Mocks `code-rules.js` at module level so `loadTypeScript` returns null for every call
 * inside this file. Other tests (`orchestrator.test.ts`) use the real `loadTypeScript`.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

vi.mock('../../src/lint/code-rules.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/lint/code-rules.js')>(
    '../../src/lint/code-rules.js',
  );
  return {
    ...actual,
    loadTypeScript: vi.fn().mockResolvedValue(null),
  };
});

import { runLint } from '../../src/lint/orchestrator.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mythik-lint-orch-no-ts-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('runLint orchestrator — no-TypeScript degraded path', () => {
  it('emits exactly one lint-meta-no-typescript finding when TypeScript is unavailable', async () => {
    const codePath = path.join(tmpDir, 'consumer.ts');
    fs.writeFileSync(codePath, `console.log('hi');`);

    const result = await runLint({ fromFile: codePath });

    const noTsFindings = result.findings.filter(f => f.ruleId === 'lint-meta-no-typescript');
    expect(noTsFindings).toHaveLength(1);
    expect(noTsFindings[0].severity).toBe('warning');
    expect(noTsFindings[0].file).toBe('(global)');
    expect(noTsFindings[0].message).toMatch(/TypeScript not installed/);
  });

  it('skips code rule scanning entirely when TypeScript missing (no code-* findings)', async () => {
    const codePath = path.join(tmpDir, 'consumer.ts');
    // This code WOULD trigger code-store-save-bypass if scanned
    fs.writeFileSync(codePath, `const myStore: any = {}; myStore.save('id', {});`);

    const result = await runLint({ fromFile: codePath });

    expect(result.findings.filter(f => f.ruleId === 'code-store-save-bypass')).toHaveLength(0);
  });
});
