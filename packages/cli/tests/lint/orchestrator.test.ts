import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { runLint } from '../../src/lint/orchestrator.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mythik-lint-orch-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('runLint orchestrator', () => {
  it('runs spec rules on .json file', async () => {
    const specPath = path.join(tmpDir, 'foo.json');
    fs.writeFileSync(specPath, JSON.stringify({
      root: 'r',
      elements: { r: { type: 'box', props: { value: { $row: 'id' } } } },
    }));
    const result = await runLint({ fromFile: specPath });
    expect(result.findings.some(f => f.ruleId === 'spec-row-literal')).toBe(true);
    expect(result.summary.scopes).toContain('specs');
  });

  it('runs code rules on .ts file', async () => {
    const codePath = path.join(tmpDir, 'seed.ts');
    fs.writeFileSync(codePath, `const myStore: any = {}; myStore.save('id', {});`);
    const result = await runLint({ fromFile: codePath });
    expect(result.findings.some(f => f.ruleId === 'code-store-save-bypass')).toBe(true);
    expect(result.summary.scopes).toContain('code');
  });

  it('respects specsOnly opt-out', async () => {
    const codePath = path.join(tmpDir, 'seed.ts');
    fs.writeFileSync(codePath, `const myStore: any = {}; myStore.save('id', {});`);
    const result = await runLint({ fromFile: codePath, specsOnly: true });
    expect(result.findings.filter(f => f.ruleId.startsWith('code-'))).toHaveLength(0);
  });

  it('respects codeOnly opt-out', async () => {
    const specPath = path.join(tmpDir, 'foo.json');
    fs.writeFileSync(specPath, JSON.stringify({
      root: 'r',
      elements: { r: { type: 'box', props: { value: { $row: 'id' } } } },
    }));
    const result = await runLint({ fromFile: specPath, codeOnly: true });
    expect(result.findings.filter(f => f.ruleId.startsWith('spec-'))).toHaveLength(0);
  });

  it('walks fromDir for both spec + code files', async () => {
    fs.writeFileSync(path.join(tmpDir, 'a.json'), JSON.stringify({
      root: 'r', elements: { r: { type: 'box', props: { value: { $row: 'id' } } } },
    }));
    fs.writeFileSync(path.join(tmpDir, 'b.ts'), `const myStore: any = {}; myStore.save('id', {});`);
    const result = await runLint({ fromDir: tmpDir });
    expect(result.findings.some(f => f.ruleId === 'spec-row-literal')).toBe(true);
    expect(result.findings.some(f => f.ruleId === 'code-store-save-bypass')).toBe(true);
  });

  it('skips not-a-spec JSON files silently (e.g. package.json)', async () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      name: 'foo', version: '0.1.0', dependencies: {},
    }));
    const result = await runLint({ fromDir: tmpDir });
    // No throw; no findings for package.json
    expect(result.findings.filter(f => f.ruleId.startsWith('spec-'))).toHaveLength(0);
  });

  it('summary counts errors + warnings + files correctly', async () => {
    const specPath = path.join(tmpDir, 'foo.json');
    fs.writeFileSync(specPath, JSON.stringify({
      root: 'r',
      elements: { r: { type: 'box', props: { value: { $row: 'id' } } } },
    }));
    const codePath = path.join(tmpDir, 'seed.ts');
    fs.writeFileSync(codePath, `const myStore: any = {}; myStore.save('id', {});`);
    const result = await runLint({ fromDir: tmpDir });
    expect(result.summary.errors).toBeGreaterThanOrEqual(1); // code rule = error
    expect(result.summary.warnings).toBeGreaterThanOrEqual(1); // spec rule = warning
    expect(result.summary.files).toBeGreaterThanOrEqual(2);
  });

  it('returns empty result with no targets', async () => {
    const result = await runLint({ cwd: tmpDir });
    expect(result.findings).toHaveLength(0);
    expect(result.summary.errors).toBe(0);
    expect(result.summary.warnings).toBe(0);
  });
});
