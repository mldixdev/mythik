import type { VersionedSpecStore, EnvironmentStore } from 'mythik';
import { computeRollbackImpact, executeRollback } from 'mythik';
import { formatSuccess, formatError, formatJson } from '../output.js';
import type { CommandResult } from './manifest.js';

export interface RollbackCommandOptions {
  store: VersionedSpecStore;
  envStore: EnvironmentStore;
  toVersion: number;
  confirm: boolean;
  json: boolean;
  author: string;
  description?: string;
}

export async function runRollbackCommand(specId: string, options: RollbackCommandOptions): Promise<CommandResult> {
  try {
    const currentVersion = await options.store.currentVersion(specId);
    if (currentVersion === 0) {
      return {
        output: options.json
          ? formatJson({ error: `No version history for "${specId}"` })
          : formatError({ what: 'No history', why: `Spec "${specId}" has no versions` }),
        exitCode: 1,
      };
    }

    const impact = await computeRollbackImpact({
      specId,
      fromVersion: currentVersion,
      toVersion: options.toVersion,
      store: options.store,
      envStore: options.envStore,
    });

    if (!options.confirm) {
      if (options.json) {
        return { output: formatJson({ preview: true, fromVersion: currentVersion, toVersion: options.toVersion, impact }), exitCode: 0 };
      }

      const lines: string[] = [];
      lines.push(`Rollback: ${specId} v${currentVersion} → v${options.toVersion}`);
      lines.push('');

      if (impact.lostChanges.length > 0) {
        lines.push('  CHANGES THAT WILL BE LOST:');
        for (const lc of impact.lostChanges) {
          const icon = lc.change.kind.includes('added') ? '+' : lc.change.kind.includes('removed') ? '-' : '~';
          lines.push(`    ${icon} ${lc.change.detail} (${lc.author})`);
        }
        lines.push('');
      }

      if (impact.affectedEnvironments.length > 0) {
        lines.push('  ENVIRONMENTS:');
        for (const env of impact.affectedEnvironments) {
          const status = env.affected ? 'affected' : 'not affected';
          lines.push(`    ${env.name}: v${env.currentVersion} → ${status}`);
        }
        lines.push('');
      }

      lines.push('  Preview only. Run with --confirm to execute.');
      return { output: lines.join('\n'), exitCode: 0 };
    }

    const result = await executeRollback({
      specId,
      toVersion: options.toVersion,
      store: options.store,
      envStore: options.envStore,
      author: options.author,
      description: options.description,
    });

    if (!result.success) {
      return {
        output: options.json
          ? formatJson(result)
          : formatError({ what: 'Rollback failed', why: result.errors?.[0]?.message ?? 'Unknown error' }),
        exitCode: 1,
      };
    }

    return {
      output: options.json
        ? formatJson(result)
        : formatSuccess(`Rolled back ${specId} v${result.fromVersion} → v${result.toVersion} (created v${result.newVersion})`),
      exitCode: 0,
    };
  } catch (err) {
    const message = (err as Error).message;
    return {
      output: options.json ? formatJson({ error: message }) : formatError({ what: 'Rollback failed', why: message }),
      exitCode: 1,
    };
  }
}
