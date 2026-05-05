/**
 * CLI wrapper for `mythik lint` — translates commander options to runLint
 * and renders the result via human/JSON formatters.
 */

import { runLint } from '../lint/orchestrator.js';
import { formatHuman, formatJson, computeExitCode } from '../lint/format.js';
import type { LintOptions } from '../lint/types.js';
import type { CommandResult } from './manifest.js';

export type RunLintCommandOptions = LintOptions;

export async function runLintCommand(opts: RunLintCommandOptions): Promise<CommandResult> {
  const result = await runLint(opts);
  const output = opts.json ? formatJson(result) : formatHuman(result);
  return {
    output: output + '\n',
    exitCode: computeExitCode(result),
  };
}
