import type { VersionedSpecStore, EnvironmentStore } from 'mythik';
import { computeStructuralDiff } from 'mythik';
import { formatSuccess, formatError, formatJson } from '../output.js';
import type { CommandResult } from './manifest.js';

export interface DiffOptions {
  store: VersionedSpecStore;
  envStore: EnvironmentStore;
  from: string;
  to?: string;
  json: boolean;
}

export async function runDiff(specId: string, options: DiffOptions): Promise<CommandResult> {
  try {
    const fromVersion = await resolveRef(specId, options.from, options.store, options.envStore);
    const toVersion = options.to
      ? await resolveRef(specId, options.to, options.store, options.envStore)
      : await options.store.currentVersion(specId);

    const fromSpec = await options.store.loadVersion(specId, fromVersion);
    const toSpec = await options.store.loadVersion(specId, toVersion);

    const diff = computeStructuralDiff(fromSpec, toSpec, fromVersion, toVersion);

    if (options.json) {
      return { output: formatJson(diff), exitCode: 0 };
    }

    const lines: string[] = [];
    lines.push(formatSuccess(`Diff: ${specId} v${fromVersion} → v${toVersion}`));
    lines.push('');

    if (diff.changes.length === 0) {
      lines.push('  No changes');
    } else {
      for (const change of diff.changes) {
        const icon = change.kind.includes('added') ? '+' : change.kind.includes('removed') ? '-' : '~';
        lines.push(`  ${icon} ${change.detail}`);
      }
      lines.push('');
      lines.push(`  Summary: ${diff.summary}`);
    }

    return { output: lines.join('\n'), exitCode: 0 };
  } catch (err) {
    const message = (err as Error).message;
    return {
      output: options.json ? formatJson({ error: message }) : formatError({ what: 'Diff failed', why: message }),
      exitCode: 1,
    };
  }
}

/** Resolve a ref to a version number: numeric string, or environment name */
async function resolveRef(
  specId: string,
  ref: string,
  store: VersionedSpecStore,
  envStore: EnvironmentStore,
): Promise<number> {
  const num = parseInt(ref, 10);
  if (!isNaN(num) && String(num) === ref) return num;

  const env = await envStore.getEnvironment(specId, ref);
  if (env) return env.version;

  throw new Error(`Cannot resolve ref "${ref}" — not a version number or environment name`);
}
