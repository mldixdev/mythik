import type { SpecStore } from 'mythik';
import { createSpecEngine } from 'mythik';
import { formatError, formatJson, formatJsonPretty, formatElementHeader, formatWarning } from '../output.js';
import { suggest } from '../levenshtein.js';
import { toToon } from '../toon.js';
import type { CommandResult } from './manifest.js';

export interface ElementsOptions {
  store: SpecStore;
  json: boolean;
  toon?: boolean;
}

export async function runElements(screenId: string, elementIds: string[], options: ElementsOptions): Promise<CommandResult> {
  const engine = createSpecEngine({ store: options.store });

  try {
    const result = await engine.getElements(screenId, elementIds);

    if (options.toon) {
      return { output: toToon(result), exitCode: 0 };
    }

    if (options.json) {
      return { output: formatJson(result), exitCode: 0 };
    }

    const lines: string[] = [];

    for (const [id, el] of Object.entries(result.found)) {
      const elType = (el && typeof el === 'object' && 'type' in el) ? String((el as Record<string, unknown>).type) : 'section';
      lines.push(formatElementHeader(id, elType));
      lines.push(formatJsonPretty(el));
      lines.push('');
    }

    if (result.notFound.length > 0) {
      lines.push(formatWarning(`Not found: ${result.notFound.join(', ')}`));
    }

    return { output: lines.join('\n'), exitCode: 0 };
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
      return { output: formatJson({ error: message, availableScreens, suggestion }), exitCode: 1 };
    }

    return {
      output: formatError({ what: `Screen "${screenId}" not found`, why, fix }),
      exitCode: 1,
    };
  }
}
