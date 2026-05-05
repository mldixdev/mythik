import type { VersionedSpecStore, EnvironmentStore } from 'mythik';
import { formatSuccess, formatError, formatJson } from '../output.js';
import type { CommandResult } from './manifest.js';

export interface EnvsOptions {
  store: VersionedSpecStore;
  envStore: EnvironmentStore;
  json: boolean;
  set?: string;
  author?: string;
}

export async function runEnvs(specId: string, options: EnvsOptions): Promise<CommandResult> {
  try {
    // Set mode: --set dev=12
    if (options.set) {
      const [env, versionStr] = options.set.split('=');
      if (!env || !versionStr) {
        return {
          output: formatError({ what: 'Invalid --set format', why: 'Use: --set env=version (e.g., --set dev=12)' }),
          exitCode: 1,
        };
      }
      const version = parseInt(versionStr, 10);
      if (isNaN(version)) {
        return {
          output: formatError({ what: 'Invalid version', why: `"${versionStr}" is not a number` }),
          exitCode: 1,
        };
      }

      await options.envStore.setEnvironment(specId, env, version, options.author ?? 'system');
      return {
        output: options.json
          ? formatJson({ specId, environment: env, version })
          : formatSuccess(`${specId} — ${env} → v${version}`),
        exitCode: 0,
      };
    }

    // List mode
    const envs = await options.envStore.getEnvironments(specId);

    if (options.json) {
      return { output: formatJson(envs), exitCode: 0 };
    }

    if (envs.length === 0) {
      return { output: `  No environments set for "${specId}"`, exitCode: 0 };
    }

    const currentVersion = await options.store.currentVersion(specId);
    const lines: string[] = [];
    lines.push(formatSuccess(`Environments for "${specId}"`));
    lines.push('');

    for (const env of envs) {
      const latest = env.version === currentVersion ? '  (latest)' : '';
      lines.push(`  ${env.name.padEnd(10)} v${env.version}  ${env.promotedAt.slice(0, 10)}  ${env.promotedBy}${latest}`);
    }

    return { output: lines.join('\n'), exitCode: 0 };
  } catch (err) {
    const message = (err as Error).message;
    return {
      output: options.json ? formatJson({ error: message }) : formatError({ what: 'Envs failed', why: message }),
      exitCode: 1,
    };
  }
}
