const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

export function formatSuccess(message: string): string {
  return `${GREEN}✓${RESET} ${BOLD}${message}${RESET}`;
}

export interface ErrorParts {
  what: string;
  why: string;
  fix?: string;
}

export function formatError(parts: ErrorParts): string {
  const lines: string[] = [];
  lines.push(`${RED}✗${RESET} ${BOLD}${parts.what}${RESET}`);
  lines.push('');
  lines.push(`  ${parts.why}`);
  if (parts.fix) {
    lines.push('');
    lines.push(`  ${CYAN}Fix:${RESET} ${parts.fix}`);
  }
  return lines.join('\n');
}

export function formatJson(data: unknown): string {
  return JSON.stringify(data);
}

export function formatJsonPretty(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

export function formatElementHeader(id: string, type: string): string {
  const header = `${BOLD}${id}${RESET} ${DIM}(${type})${RESET}`;
  const line = `${DIM}${'─'.repeat(id.length + type.length + 3)}${RESET}`;
  return `${header}\n${line}`;
}

export function formatWarning(message: string): string {
  return `${YELLOW}⚠${RESET} ${message}`;
}

export function colorizeManifest(manifest: string): string {
  return manifest
    .split('\n')
    .map(line => {
      // Tree characters → dim
      line = line.replace(/([├└│─]+──\s)/g, `${DIM}$1${RESET}`);

      // "app: name (N screens, M locales)" header
      line = line.replace(/^(app:\s+)(.*)(\s+\(\d+.*)/, `${BOLD}$1$2$3${RESET}`);

      // "root: id (type)" line
      line = line.replace(/^(root:\s+)(\S+)(\s+\()(\w[\w-]*)(\))/, `$1${BOLD}$2${RESET}$3${DIM}$4${RESET}$5`);

      // "screen: id (N elements)" header
      line = line.replace(/^(screen:\s+)(\S+)(\s+\(\d+ elements\))/, `${BOLD}$1$2$3${RESET}`);

      // Section headers: navigation:, auth:, tokens:, translations:, sharedState:, templates:, layout:, screens:
      line = line.replace(/^(navigation:|auth:|tokens:|translations:|sharedState:|templates:|layout:|screens:)(.*)/, `${CYAN}$1${RESET}$2`);

      // Warning markers
      line = line.replace(/(⚠[^)]*)/g, `${YELLOW}$1${RESET}`);

      // "initialActions:" line
      line = line.replace(/^(initialActions:\s+)(.*)/, `${DIM}$1${CYAN}$2${RESET}`);

      // Element lines: "id (type) → annotations"
      line = line.replace(/(\s)(\S+)(\s+\()(\w[\w-]*)(\))(\s*→\s*)?(.*)$/, (_, space, id, paren, type, closeParen, arrow, annotations) => {
        let result = `${space}${BOLD}${id}${RESET}${paren}${DIM}${type}${RESET}${closeParen}`;
        if (arrow && annotations) {
          result += `${DIM} → ${YELLOW}${annotations}${RESET}`;
        }
        return result;
      });

      return line;
    })
    .join('\n');
}

export function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

import type { ValidationError } from 'mythik';

export function formatSuggestedFixes(errors: ValidationError[], screenId?: string): string {
  const lines: string[] = [];
  const fixable: string[] = [];

  for (const error of errors) {
    lines.push(`  ${RED}✗${RESET} ${error.message}`);
    if (error.suggestedFixes && error.suggestedFixes.length > 0) {
      for (const fix of error.suggestedFixes) {
        lines.push(`    ${CYAN}→${RESET} Fix: ${JSON.stringify(fix.patch)}`);
        fixable.push(JSON.stringify(fix.patch));
      }
    } else if (error.path) {
      lines.push(`    ${DIM}→ Path: ${error.path} (manual fix needed)${RESET}`);
    }
  }

  if (fixable.length > 0 && screenId) {
    lines.push('');
    lines.push(`Auto-fix all (${fixable.length}/${errors.length}):`);
    lines.push(`  mythik patch ${screenId} '[${fixable.join(',')}]'`);
  }

  return lines.join('\n');
}
