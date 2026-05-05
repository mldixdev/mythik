import { describe, it, expect } from 'vitest';
import { formatHuman, formatJson, computeExitCode } from '../../src/lint/format.js';
import type { LintResult, LintFinding } from '../../src/lint/types.js';
import { stripAnsi } from '../../src/output.js';

const empty: LintResult = {
  findings: [],
  summary: { errors: 0, warnings: 0, files: 0, scopes: [] },
};

const sampleFindings: LintFinding[] = [
  {
    file: 'specs/foo.json',
    ruleId: 'spec-row-literal',
    severity: 'warning',
    message: '$row is not a valid expression handler',
    location: { jsonPath: '/elements/r/props/value' },
    suggestedFix: {
      type: 'json-patch',
      patch: { op: 'replace', path: '/elements/r/props/value', value: { $state: '/ui/selectedRow/id' } },
      description: 'Replace $row with /ui/selectedRow/id',
    },
    docRef: 'reference-doc.md#rule-249',
  },
  {
    file: 'src/seed.ts',
    ruleId: 'code-store-save-bypass',
    severity: 'error',
    message: 'store.save() bypasses validation pipeline',
    location: { line: 5, column: 2 },
    suggestedFix: {
      type: 'code-snippet',
      before: 'store.save(id, doc)',
      after: 'await runPush({ store, screenId: id, doc })',
      explanation: 'Use runPush from mythik-cli/api',
    },
    docRef: 'reference-doc.md#rule-249',
  },
];

const withFindings: LintResult = {
  findings: sampleFindings,
  summary: { errors: 1, warnings: 1, files: 2, scopes: ['specs', 'code'] },
};

describe('formatHuman', () => {
  it('renders empty result with zero findings', () => {
    const out = stripAnsi(formatHuman(empty));
    expect(out).toContain('0 errors');
    expect(out).toContain('0 warnings');
  });

  it('renders findings grouped by file', () => {
    const out = stripAnsi(formatHuman(withFindings));
    expect(out).toContain('specs/foo.json');
    expect(out).toContain('src/seed.ts');
    expect(out).toContain('spec-row-literal');
    expect(out).toContain('code-store-save-bypass');
  });

  it('renders json-patch suggested fix', () => {
    const out = stripAnsi(formatHuman(withFindings));
    expect(out).toContain('Replace $row');
  });

  it('renders code-snippet suggested fix', () => {
    const out = stripAnsi(formatHuman(withFindings));
    expect(out).toContain('runPush');
  });
});

describe('formatJson', () => {
  it('produces parseable JSON with findings + summary', () => {
    const out = formatJson(withFindings);
    const parsed = JSON.parse(out);
    expect(parsed.findings).toHaveLength(2);
    expect(parsed.summary.errors).toBe(1);
    expect(parsed.summary.warnings).toBe(1);
    expect(parsed.summary.scopes).toContain('specs');
    expect(parsed.summary.scopes).toContain('code');
  });
});

describe('computeExitCode', () => {
  it('returns 0 when zero errors (warnings OK)', () => {
    expect(computeExitCode({ ...empty, summary: { ...empty.summary, warnings: 5 } })).toBe(0);
  });

  it('returns 1 when at least one error', () => {
    expect(computeExitCode(withFindings)).toBe(1);
  });
});
