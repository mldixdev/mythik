import type { VersionedSpecStore, EnvironmentStore } from 'mythik';
import { computeStructuralDiff } from 'mythik';
import { formatSuccess, formatError, formatJson } from '../output.js';
import type { CommandResult } from './manifest.js';

export interface HistoryOptions {
  store: VersionedSpecStore;
  envStore: EnvironmentStore;
  json: boolean;
  limit?: number;
}

export async function runHistory(specId: string, options: HistoryOptions): Promise<CommandResult> {
  try {
    const entries = await options.store.listVersions(specId, options.limit);

    if (entries.length === 0) {
      return {
        output: options.json
          ? formatJson({ error: `No version history for "${specId}"` })
          : formatError({ what: 'No version history', why: `Spec "${specId}" has no versions` }),
        exitCode: 1,
      };
    }

    if (options.json) {
      return { output: formatJson(entries), exitCode: 0 };
    }

    // Build environment map: version → env names
    const envs = await options.envStore.getEnvironments(specId);
    const envByVersion = new Map<number, string[]>();
    for (const env of envs) {
      if (!envByVersion.has(env.version)) envByVersion.set(env.version, []);
      envByVersion.get(env.version)!.push(env.name.toUpperCase());
    }

    const total = await options.store.currentVersion(specId);
    const lines: string[] = [];
    lines.push(formatSuccess(`History for "${specId}" (${total} versions)`));
    lines.push('');

    for (const entry of entries) {
      const envTags = envByVersion.get(entry.version)?.map(e => `[${e}]`).join(' ') ?? '';
      const desc = entry.description ? `"${entry.description}"` : '';

      lines.push(`  v${entry.version}  ${entry.timestamp.slice(0, 10)}  ${entry.author.padEnd(10)}  ${entry.source.padEnd(8)}  ${desc}  ${envTags}`);

      // Show change details for non-first versions
      if (entry.version > 1) {
        try {
          const prevSpec = await options.store.loadVersion(specId, entry.version - 1);
          const currSpec = await options.store.loadVersion(specId, entry.version);
          const diff = computeStructuralDiff(prevSpec, currSpec, entry.version - 1, entry.version);
          if (diff.changes.length > 0) {
            for (const change of diff.changes) {
              const icon = change.kind.includes('added') ? '+' : change.kind.includes('removed') ? '-' : '~';
              lines.push(`       ${icon} ${change.detail}`);
            }
          } else {
            lines.push('       (no diff)');
          }
        } catch {
          // Can't compute diff — skip
        }
      } else {
        lines.push('       snapshot');
      }
    }

    return { output: lines.join('\n'), exitCode: 0 };
  } catch (err) {
    const message = (err as Error).message;
    return {
      output: options.json ? formatJson({ error: message }) : formatError({ what: 'History failed', why: message }),
      exitCode: 1,
    };
  }
}
