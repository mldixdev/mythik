import type { VersionedSpecStore, EnvironmentStore } from 'mythik';
import { runPromoteGate } from 'mythik';
import { formatSuccess, formatError, formatJson } from '../output.js';
import type { CommandResult } from './manifest.js';

export interface PromoteCommandOptions {
  store: VersionedSpecStore;
  envStore: EnvironmentStore;
  specIds: string[];
  fromEnv: string;
  toEnv: string;
  apiIds?: string[];
  confirm: boolean;
  json: boolean;
  author?: string;
}

export async function runPromoteCommand(options: PromoteCommandOptions): Promise<CommandResult> {
  try {
    const result = await runPromoteGate({
      specIds: options.specIds,
      fromEnv: options.fromEnv,
      toEnv: options.toEnv,
      store: options.store,
      envStore: options.envStore,
      apiIds: options.apiIds,
    });

    if (!result.success) {
      if (options.json) {
        return { output: formatJson({ ...result, promoted: false }), exitCode: 1 };
      }
      const lines: string[] = [];
      lines.push(formatError({ what: 'Promotion blocked', why: `${options.fromEnv} → ${options.toEnv}` }));
      lines.push('');
      for (const e of result.validation.errors) {
        lines.push(`  \u2717 ${e.message}`);
      }
      for (const w of result.validation.warnings) {
        lines.push(`  \u26A0 ${w.message}`);
      }
      return { output: lines.join('\n'), exitCode: 1 };
    }

    if (!options.confirm) {
      if (options.json) {
        return { output: formatJson({ ...result, preview: true }), exitCode: 0 };
      }

      const lines: string[] = [];
      lines.push(`Promote: ${options.fromEnv} → ${options.toEnv} (${options.specIds.length} specs)`);
      lines.push('');

      for (const spec of result.specs) {
        const diffSummary = spec.diff.summary === 'No changes'
          ? '(no changes)'
          : spec.diff.summary;
        lines.push(`  ${spec.id}: v${spec.fromVersion || 'new'} → v${spec.toVersion}`);
        lines.push(`    ${diffSummary}`);
      }

      lines.push('');
      lines.push('  Validation:');
      lines.push(`    \u2713 Spec validation: ${result.validation.specValid ? 'passed' : 'failed'}`);
      lines.push(`    ${result.validation.crossScreenValid ? '\u2713' : '\u26A0'} Cross-screen: ${result.validation.crossScreenValid ? 'all references resolved' : 'warnings (see above)'}`);
      if (result.validation.contractSkipped) {
        lines.push(`    \u26A0 Contract validation: skipped (no api-specs)`);
      } else {
        lines.push(`    ${result.validation.contractValid ? '\u2713' : '\u2717'} Contract: ${result.validation.contractValid ? 'passed' : 'failed'}`);
      }

      if (result.validation.warnings.length > 0) {
        lines.push('');
        for (const w of result.validation.warnings) {
          lines.push(`  \u26A0 ${w.message}`);
        }
      }

      lines.push('');
      lines.push('  Preview only. Run with --confirm to execute.');
      return { output: lines.join('\n'), exitCode: 0 };
    }

    // Execute: move environment pointers
    const author = options.author ?? 'system';
    for (const spec of result.specs) {
      await options.envStore.setEnvironment(spec.id, options.toEnv, spec.toVersion, author);
    }

    if (options.json) {
      return { output: formatJson({ ...result, promoted: true }), exitCode: 0 };
    }

    return {
      output: formatSuccess(`Promoted ${options.specIds.length} spec(s) ${options.fromEnv} → ${options.toEnv}`),
      exitCode: 0,
    };
  } catch (err) {
    const message = (err as Error).message;
    return {
      output: options.json ? formatJson({ error: message }) : formatError({ what: 'Promote failed', why: message }),
      exitCode: 1,
    };
  }
}
