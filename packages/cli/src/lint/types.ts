/**
 * Type definitions for `mythik lint` command and `runLint` programmatic API.
 *
 * Bridge: `ValidationError` (from `mythik` spec-validator) is converted
 * to `LintFinding` by the orchestrator. Spec rules emit ValidationError with
 * `ruleId` set; orchestrator uses `ruleId !== undefined` to filter lint
 * findings from other validator output.
 */

import type { JsonPatch, ValidationError } from 'mythik';

export type LintSeverity = 'error' | 'warning';

export interface LintLocation {
  /** JSON Pointer path (RFC 6901) — populated for spec findings. */
  jsonPath?: string;
  /** Source line (1-based) — populated for code findings. */
  line?: number;
  /** Source column (0-based) — populated for code findings. */
  column?: number;
}

export type LintSuggestion =
  | {
      type: 'json-patch';
      patch: JsonPatch;
      description: string;
    }
  | {
      type: 'code-snippet';
      before: string;
      after: string;
      explanation: string;
    };

export interface LintFinding {
  /** Relative file path from cwd. */
  file: string;
  /** Lint rule identifier (e.g. 'spec-row-literal', 'code-store-save-bypass'). */
  ruleId: string;
  severity: LintSeverity;
  message: string;
  location: LintLocation;
  suggestedFix?: LintSuggestion;
  /** Reference doc anchor (e.g. 'reference-doc.md#rule-249'). */
  docRef?: string;
}

export interface LintSummary {
  errors: number;
  warnings: number;
  files: number;
  scopes: Array<'specs' | 'code'>;
}

export interface LintResult {
  findings: LintFinding[];
  summary: LintSummary;
}

export interface LintOptions {
  /** Lint single file (auto-detect by extension). */
  fromFile?: string;
  /** Lint all matching files in folder (recursive). */
  fromDir?: string;
  /** Skip code rules (e.g. when TS not installed). */
  specsOnly?: boolean;
  /** Skip spec rules. */
  codeOnly?: boolean;
  /** Code scan root (default: ./src). */
  codeDir?: string;
  /** JSON output mode. */
  json?: boolean;
  /** Working directory for path resolution + .mythikrc lookup. Defaults to process.cwd(). */
  cwd?: string;
}

/**
 * Internal helper — converts `ValidationError` (from validator) to `LintFinding`.
 * Keeps orchestrator logic clean by centralizing the bridge.
 */
export function validationErrorToLintFinding(
  err: ValidationError,
  file: string,
  severity: LintSeverity,
  docRef = 'reference-doc.md#rule-249',
): LintFinding {
  const fix = err.suggestedFixes?.[0];
  const suggestedFix: LintSuggestion | undefined = fix
    ? { type: 'json-patch', patch: fix.patch, description: fix.description }
    : undefined;
  return {
    file,
    ruleId: err.ruleId ?? 'unknown',
    severity,
    message: err.message,
    location: { jsonPath: err.path },
    suggestedFix,
    docRef,
  };
}
