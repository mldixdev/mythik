import type { SpecStore } from 'mythik';
import { formatError, formatJson, formatJsonPretty } from '../output.js';
import { suggest } from '../levenshtein.js';
import { toToon } from '../toon.js';
import type { CommandResult } from './manifest.js';

export interface PullOptions {
  store: SpecStore;
  json: boolean;
  toon: boolean;
}

export async function runPull(screenId: string, options: PullOptions): Promise<CommandResult> {
  try {
    const spec = await options.store.load(screenId);

    if (options.toon) {
      return { output: toToon(spec), exitCode: 0 };
    }

    if (options.json) {
      return { output: formatJson({ success: true, spec }), exitCode: 0 };
    }

    return { output: formatJsonPretty(spec), exitCode: 0 };
  } catch (err) {
    const message = (err as Error).message;

    let availableScreens: string[] = [];
    try { availableScreens = await options.store.list(); } catch { /* ignore */ }
    const suggestion = suggest(screenId, availableScreens);

    if (options.json) {
      return { output: formatJson({ error: message, suggestion }), exitCode: 1 };
    }

    return {
      output: formatError({
        what: `Screen "${screenId}" not found`,
        why: availableScreens.length > 0 ? `Available screens: ${availableScreens.join(', ')}` : message,
        fix: suggestion ? `Did you mean: ${suggestion}?` : 'Check the screen ID and try again',
      }),
      exitCode: 1,
    };
  }
}
