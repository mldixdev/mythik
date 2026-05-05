import type { SpecStore } from 'mythik';
import { createSpecEngine, getDocumentHandler } from 'mythik';
import { formatError, formatJson, formatJsonPretty, formatWarning } from '../output.js';
import { suggest } from '../levenshtein.js';
import type { CommandResult } from './manifest.js';

export interface DeleteOptions {
  store: SpecStore;
  json: boolean;
  confirm: boolean;
}

export async function runDelete(screenId: string, options: DeleteOptions): Promise<CommandResult> {
  const engine = createSpecEngine({ store: options.store });

  try {
    if (!options.confirm) {
      const doc = await options.store.load(screenId);
      const handler = getDocumentHandler(doc);
      const elementCount = handler.countElements(doc);

      if (options.json) {
        return { output: formatJson({ preview: true, screenId, elementCount }), exitCode: 0 };
      }

      return {
        output: formatWarning(`Screen "${screenId}" (${elementCount} elements). Use --confirm to delete.`),
        exitCode: 0,
      };
    }

    const { spec } = await engine.delete(screenId);

    if (options.json) {
      return { output: formatJson({ success: true, screenId, deletedSpec: spec }), exitCode: 0 };
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
