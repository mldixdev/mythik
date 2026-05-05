import type { SpecStore } from 'mythik';
import { createSpecEngine } from 'mythik';
import { formatSuccess, formatError, formatJson, colorizeManifest } from '../output.js';
import { suggest } from '../levenshtein.js';

export interface ManifestOptions {
  store: SpecStore;
  json: boolean;
}

export interface CommandResult {
  output: string;
  exitCode: number;
}

export async function runManifest(screenId: string, options: ManifestOptions): Promise<CommandResult> {
  const engine = createSpecEngine({ store: options.store });

  try {
    const manifest = await engine.getManifest(screenId);
    const elementCount = parseInt(manifest.match(/\((\d+) elements\)/)?.[1] ?? '0', 10);

    if (options.json) {
      return {
        output: formatJson({ screenId, elementCount, manifest }),
        exitCode: 0,
      };
    }

    return {
      output: `${formatSuccess(`${screenId} (${elementCount} elements)`)}\n\n${colorizeManifest(manifest)}`,
      exitCode: 0,
    };
  } catch (err) {
    const message = (err as Error).message;

    let availableScreens: string[] = [];
    try { availableScreens = await options.store.list(); } catch { /* ignore */ }
    const suggestion = suggest(screenId, availableScreens);

    const why = availableScreens.length > 0
      ? `Available screens: ${availableScreens.join(', ')}`
      : message;
    const fix = suggestion ? `Did you mean: ${suggestion}?` : 'Check the screen ID and try again';

    if (options.json) {
      return {
        output: formatJson({ error: message, availableScreens, suggestion }),
        exitCode: 1,
      };
    }

    return {
      output: formatError({
        what: `Screen "${screenId}" not found`,
        why,
        fix,
      }),
      exitCode: 1,
    };
  }
}
