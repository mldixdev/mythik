import type { SpecStore } from 'mythik';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';
import { runPush } from './push.js';
import { formatSuccess, formatError, formatJson, formatWarning } from '../output.js';
import type { CommandResult } from './manifest.js';

export interface PushBulkOptions {
  store: SpecStore;
  json: boolean;
  force: boolean;
  author?: string;
  description?: string;
}

interface BulkResultEntry {
  id: string;
  success: boolean;
  errors: { path?: string; message: string }[];
  warnings: { path?: string; message: string }[];
  elementCount: number;
  created: boolean;
}

interface BulkSummary {
  total: number;
  saved: number;
  rejected: number;
  warningsCount: number;
}

interface BulkResult {
  summary: BulkSummary;
  results: BulkResultEntry[];
}

export async function runPushBulk(dirPath: string, options: PushBulkOptions): Promise<CommandResult> {
  let entries: string[];
  try {
    const stats = await stat(dirPath);
    if (!stats.isDirectory()) {
      return errorResult(`"${dirPath}" is not a directory.`, options.json);
    }
    entries = await readdir(dirPath);
  } catch (err) {
    return errorResult(`Could not read directory "${dirPath}": ${(err as Error).message}`, options.json);
  }

  const jsonFiles = entries.filter((name) => extname(name) === '.json').sort();
  if (jsonFiles.length === 0) {
    return errorResult(`No *.json files found in "${dirPath}".`, options.json);
  }

  const results: BulkResultEntry[] = [];

  for (const filename of jsonFiles) {
    const id = basename(filename, '.json');
    const filePath = join(dirPath, filename);
    let input: string;
    try {
      input = (await readFile(filePath, 'utf-8')).trim();
    } catch (err) {
      results.push({
        id,
        success: false,
        errors: [{ message: `Could not read file: ${(err as Error).message}` }],
        warnings: [],
        elementCount: 0,
        created: false,
      });
      continue;
    }

    // Force per-spec JSON to extract structured shape
    const pushResult = await runPush(id, input, {
      store: options.store,
      json: true,
      force: options.force,
      author: options.author,
      description: options.description,
    });

    let parsed: { success: boolean; errors?: { path?: string; message: string }[]; warnings?: { path?: string; message: string }[]; elementCount?: number; created?: boolean };
    try {
      parsed = JSON.parse(pushResult.output);
    } catch {
      parsed = { success: false, errors: [{ message: 'Internal: failed to parse runPush output' }] };
    }

    // success+errors[] are validation errors saved-with-warnings (push.ts:91-93 path).
    // success+warnings[] are prop warnings (push.ts:94 path, added in this Item).
    // failure+errors[] are reject errors.
    const errMessages = parsed.errors ?? [];
    const warnMessages = parsed.warnings ?? [];
    const validationAsWarnings = parsed.success === true ? errMessages : [];
    const validationAsErrors = parsed.success === true ? [] : errMessages;

    results.push({
      id,
      success: parsed.success === true,
      errors: validationAsErrors,
      warnings: [...validationAsWarnings, ...warnMessages],
      elementCount: parsed.elementCount ?? 0,
      created: parsed.created ?? false,
    });
  }

  const summary: BulkSummary = {
    total: results.length,
    saved: results.filter((r) => r.success).length,
    rejected: results.filter((r) => !r.success).length,
    warningsCount: results.filter((r) => r.warnings.length > 0).length,
  };

  const exitCode = summary.rejected > 0 ? 1 : 0;

  if (options.json) {
    const body: BulkResult = { summary, results };
    return { output: formatJson(body), exitCode };
  }

  // Text output
  const lines: string[] = [];
  for (const r of results) {
    if (r.success && r.warnings.length === 0) {
      lines.push(formatSuccess(`${r.id} (${r.elementCount} elements, ${r.created ? 'new' : 'overwritten'})`));
    } else if (r.success && r.warnings.length > 0) {
      lines.push(
        formatWarning(`${r.id} (${r.elementCount} elements, ${r.created ? 'new' : 'overwritten'}) — ${r.warnings.length} warning${r.warnings.length !== 1 ? 's' : ''}:`),
      );
      for (const w of r.warnings) {
        lines.push(`    ${w.path ?? ''}: ${w.message}`.trimStart());
      }
    } else {
      lines.push(formatError({ what: `${r.id} — ${r.errors.length} error${r.errors.length !== 1 ? 's' : ''}`, why: r.errors.map((e) => `${e.path ? e.path + ': ' : ''}${e.message}`).join('; ') }));
    }
  }

  lines.push('');
  const summaryParts: string[] = [];
  summaryParts.push(`${summary.saved} saved${summary.warningsCount > 0 ? ` (${summary.warningsCount} with warnings)` : ''}`);
  if (summary.rejected > 0) summaryParts.push(`${summary.rejected} rejected`);
  lines.push(`${summary.total} specs processed: ${summaryParts.join(', ')}`);

  return { output: lines.join('\n'), exitCode };
}

function errorResult(message: string, json: boolean): CommandResult {
  if (json) {
    return { output: formatJson({ error: message }), exitCode: 1 };
  }
  return { output: formatError({ what: 'Bulk push failed', why: message }), exitCode: 1 };
}
