/**
 * Programmatic API for mythik-cli.
 *
 * These ARE the CLI command implementations — same validation, same code path.
 * Use this entry when:
 * - Calling the CLI from a Node script with logic before/after
 * - Embedding push/patch in IDE tooling, test harnesses, or CI pipelines
 * - Avoiding shell-quoting friction (PowerShell + `$state` is the canonical case)
 *
 * `SpecStore.save()` is `@internal` — do NOT call it from application code.
 */

export { runPush } from './commands/push.js';
export type { PushOptions, PushResult } from './commands/push.js';

export { runPatch, parsePatchInput } from './commands/patch.js';
export type { PatchOptions } from './commands/patch.js';

export { runDocsCommand, resolveBundledDocsRoot } from './commands/docs.js';
export type { DocsCommandOptions, DocsCommandResult } from './commands/docs.js';

export { runInitStore } from './commands/init-store.js';
export type { InitStoreOptions } from './commands/init-store.js';

export type { CommandResult } from './commands/manifest.js';

// Type re-exports from mythik for convenience (consumers avoid dual-import)
export type { SpecStore, JsonPatch, ValidationError, PatchResult } from 'mythik';

// Lint API — runLint + types (v49 Item I)
export { runLint } from './lint/orchestrator.js';
export type { LintOptions, LintResult, LintFinding, LintSuggestion, LintSeverity, LintLocation, LintSummary } from './lint/types.js';
