/**
 * Output renderers for `mythik lint`.
 *
 * - formatHuman: file-grouped, color-coded, with suggested fixes inline
 * - formatJson: structured machine output (one-line JSON)
 * - computeExitCode: 0 if no errors (warnings OK), 1 if any error
 */

import type { LintResult } from './types.js';

const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

export function formatJson(result: LintResult): string {
  return JSON.stringify(result);
}

export function formatHuman(result: LintResult): string {
  const lines: string[] = [];
  const { findings, summary } = result;

  if (findings.length === 0) {
    lines.push(`${GREEN}✓${RESET} ${BOLD}Lint clean${RESET} — ${summary.files} file${summary.files !== 1 ? 's' : ''} scanned, 0 errors, 0 warnings`);
    return lines.join('\n');
  }

  // Group by file
  const byFile = new Map<string, typeof findings>();
  for (const f of findings) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file)!.push(f);
  }

  for (const [file, fs] of byFile) {
    lines.push('');
    lines.push(`${BOLD}${file}${RESET}`);
    for (const f of fs) {
      const sevColor = f.severity === 'error' ? RED : YELLOW;
      const sevSymbol = f.severity === 'error' ? '✗' : '⚠';
      const loc = f.location.line !== undefined
        ? `:${f.location.line}:${f.location.column ?? 0}`
        : f.location.jsonPath ? ` ${f.location.jsonPath}` : '';
      lines.push(`  ${sevColor}${sevSymbol}${RESET} ${DIM}${f.ruleId}${RESET}${loc}`);
      lines.push(`    ${f.message}`);
      if (f.suggestedFix) {
        if (f.suggestedFix.type === 'json-patch') {
          lines.push(`    ${CYAN}→${RESET} ${f.suggestedFix.description}`);
          lines.push(`      ${DIM}${JSON.stringify(f.suggestedFix.patch)}${RESET}`);
        } else {
          lines.push(`    ${CYAN}→${RESET} ${f.suggestedFix.explanation}`);
          lines.push(`      ${DIM}before:${RESET} ${f.suggestedFix.before}`);
          lines.push(`      ${DIM}after:${RESET}  ${f.suggestedFix.after}`);
        }
      }
      if (f.docRef) {
        lines.push(`    ${DIM}see ${f.docRef}${RESET}`);
      }
    }
  }

  lines.push('');
  const errClr = summary.errors > 0 ? RED : GREEN;
  const warnClr = summary.warnings > 0 ? YELLOW : DIM;
  lines.push(`${BOLD}Summary:${RESET} ${errClr}${summary.errors} error${summary.errors !== 1 ? 's' : ''}${RESET}, ${warnClr}${summary.warnings} warning${summary.warnings !== 1 ? 's' : ''}${RESET} across ${summary.files} file${summary.files !== 1 ? 's' : ''}`);

  return lines.join('\n');
}

export function computeExitCode(result: LintResult): number {
  return result.summary.errors > 0 ? 1 : 0;
}
