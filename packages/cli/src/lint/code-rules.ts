/**
 * Code lint rule motor — TypeScript Compiler API (peerDep optional).
 *
 * `typescript` is declared as peerDependency (optional) in mythik-cli.
 * Most Mythik consumers already have TS installed; if not, code rules
 * skip cleanly via graceful degradation (loadTypeScript returns null).
 *
 * Rule 4 implementation: code-store-save-bypass — see scanCodeFile (Task 7).
 */

import type { LintFinding } from './types.js';

let cachedTs: typeof import('typescript') | null | undefined = undefined;

/**
 * Dynamic import of `typescript` with graceful degradation.
 * Returns null if TS not installed or import fails.
 * Result is cached across calls (vi.resetModules() in tests resets the cache).
 */
export async function loadTypeScript(): Promise<typeof import('typescript') | null> {
  if (cachedTs !== undefined) return cachedTs;
  try {
    cachedTs = await import('typescript');
  } catch {
    cachedTs = null;
  }
  return cachedTs;
}

const STORE_NAME_PATTERN = /store$/i;
const ALLOWED_PATH_PATTERNS = [
  /(^|[/\\])packages[/\\]core[/\\]/,
  /(^|[/\\])packages[/\\]cli[/\\]/,
];

function isAllowedFilePath(filePath: string): boolean {
  return ALLOWED_PATH_PATTERNS.some(re => re.test(filePath));
}

/**
 * Scan a TypeScript/JavaScript source file for code lint violations.
 *
 * Rule: code-store-save-bypass — error when calling `<identifier>.save(...)`
 * where identifier matches case-insensitive `/store$/i` AND file is NOT inside
 * `packages/core/` or `packages/cli/` (allowed framework internal paths).
 *
 * @param filePath - Relative path of the file (used in LintFinding.file + path filter).
 * @param content - Source file content.
 * @param ts - TypeScript Compiler API (from loadTypeScript()).
 * @returns LintFinding[] — empty if no violations.
 */
export function scanCodeFile(
  filePath: string,
  content: string,
  ts: typeof import('typescript'),
): LintFinding[] {
  if (isAllowedFilePath(filePath)) return [];
  const findings: LintFinding[] = [];
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

  function visit(node: import('typescript').Node): void {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      if (ts.isPropertyAccessExpression(callee) && callee.name.text === 'save') {
        const receiver = callee.expression;
        if (ts.isIdentifier(receiver) && STORE_NAME_PATTERN.test(receiver.text)) {
          const lineCol = sourceFile.getLineAndCharacterOfPosition(callee.getStart(sourceFile));
          findings.push({
            file: filePath,
            ruleId: 'code-store-save-bypass',
            severity: 'error',
            message: `${receiver.text}.save() bypasses validation pipeline — use runPush from mythik-cli/api or 'mythik push --from-file'`,
            location: { line: lineCol.line + 1, column: lineCol.character },
            suggestedFix: {
              type: 'code-snippet',
              before: `${receiver.text}.save(<id>, <doc>)`,
              after: `await runPush({ store, screenId: <id>, doc: <doc> })`,
              explanation: `Use runPush from mythik-cli/api for validated writes. Or: mythik push <id> --from-file <path>`,
            },
            docRef: 'reference-doc.md#rule-249',
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return findings;
}
