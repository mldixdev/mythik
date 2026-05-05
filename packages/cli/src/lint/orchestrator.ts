/**
 * `runLint` — entry point for `mythik lint` command and `mythik-cli/api` programmatic export.
 *
 * Coordinates spec + code lint phases:
 * 1. Discover targets (via spec-discovery)
 * 2. Run spec rules (via mythik validators) — convert ValidationError to LintFinding
 * 3. Run code rules (via lint/code-rules.ts) — TypeScript Compiler API scan
 * 4. Aggregate findings + compute summary
 *
 * Spec rules: rule 1 in spec-validator.ts (Spec docs), rules 2+3 in api-spec-validator.ts (ApiSpec docs).
 * Code rule: rule 4 in code-rules.ts (TypeScript Compiler API).
 *
 * peerDep TS optional: code rules degrade gracefully when typescript not installed.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { validateSpec, validateApiSpec } from 'mythik';
import type { LintFinding, LintResult, LintOptions, LintSeverity } from './types.js';
import { validationErrorToLintFinding } from './types.js';
import { discoverSpecs, discoverCode } from './spec-discovery.js';
import { loadTypeScript, scanCodeFile } from './code-rules.js';

function detectDocKind(parsed: unknown): 'spec' | 'apispec' | 'unknown' {
  if (!parsed || typeof parsed !== 'object') return 'unknown';
  const o = parsed as Record<string, unknown>;
  // Spec docs have root + elements
  if (typeof o.root === 'string' && o.elements && typeof o.elements === 'object') return 'spec';
  // ApiSpec docs have endpoints (object) or catalogs.
  // Note: ApiSpec.endpoints is Record<string, EndpointConfig> (object, not array) — see
  // packages/server/src/types.ts and packages/core/src/security/api-spec-validator.ts:85.
  if ((o.endpoints && typeof o.endpoints === 'object') || (o.catalogs && typeof o.catalogs === 'object')) return 'apispec';
  return 'unknown';
}

async function lintSpecFile(file: string, cwd: string): Promise<LintFinding[]> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return []; // Not parseable as JSON — skip silently
  }
  const kind = detectDocKind(parsed);
  if (kind === 'unknown') return []; // Not a Mythik spec — skip

  const findings: LintFinding[] = [];
  const relFile = path.relative(cwd, file);

  if (kind === 'spec') {
    const result = validateSpec(parsed);
    const lintWarnings = (result.warnings ?? []).filter(w => w.ruleId !== undefined);
    for (const w of lintWarnings) {
      findings.push(validationErrorToLintFinding(w, relFile, 'warning'));
    }
  } else if (kind === 'apispec') {
    const result = validateApiSpec(parsed);
    const lintWarnings = result.lintWarnings ?? [];
    for (const w of lintWarnings) {
      // Severity inferred by ruleId — only spec-crud-id-collision is error
      const severity: LintSeverity = w.ruleId === 'spec-crud-id-collision' ? 'error' : 'warning';
      findings.push(validationErrorToLintFinding(w, relFile, severity));
    }
  }
  return findings;
}

async function lintCodeFile(file: string, ts: typeof import('typescript'), cwd: string): Promise<LintFinding[]> {
  const content = fs.readFileSync(file, 'utf-8');
  const relFile = path.relative(cwd, file);
  return scanCodeFile(relFile, content, ts);
}

export async function runLint(opts: LintOptions = {}): Promise<LintResult> {
  const findings: LintFinding[] = [];
  const scopes: Set<'specs' | 'code'> = new Set();
  const filesScanned: Set<string> = new Set();
  const cwd = opts.cwd ?? process.cwd();

  // Spec phase
  if (!opts.codeOnly) {
    const specTargets = await discoverSpecs(opts);
    if (specTargets.length > 0) scopes.add('specs');
    for (const file of specTargets) {
      filesScanned.add(file);
      const fileFindings = await lintSpecFile(file, cwd);
      findings.push(...fileFindings);
    }
  }

  // Code phase
  if (!opts.specsOnly) {
    const codeTargets = await discoverCode(opts);
    if (codeTargets.length > 0) scopes.add('code');
    if (codeTargets.length > 0) {
      const ts = await loadTypeScript();
      if (!ts) {
        findings.push({
          file: '(global)',
          ruleId: 'lint-meta-no-typescript',
          severity: 'warning',
          message: 'Code rules skipped: TypeScript not installed. Install with: pnpm add -D typescript',
          location: {},
        });
      } else {
        for (const file of codeTargets) {
          filesScanned.add(file);
          const fileFindings = await lintCodeFile(file, ts, cwd);
          findings.push(...fileFindings);
        }
      }
    }
  }

  const errors = findings.filter(f => f.severity === 'error').length;
  const warnings = findings.filter(f => f.severity === 'warning').length;

  return {
    findings,
    summary: {
      errors,
      warnings,
      files: filesScanned.size,
      scopes: Array.from(scopes),
    },
  };
}
