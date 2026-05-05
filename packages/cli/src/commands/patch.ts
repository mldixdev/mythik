import type { SpecStore, JsonPatch, VersionedSpecStore } from 'mythik';
import { createSpecEngine } from 'mythik';
import { formatSuccess, formatError, formatJson, colorizeManifest, formatSuggestedFixes } from '../output.js';
import { toToon, autoparse } from '../toon.js';
import type { CommandResult } from './manifest.js';

export interface PatchOptions {
  store: SpecStore;
  json: boolean;
  toon?: boolean;
  author?: string;
  description?: string;
}

interface PatchVersionMeta {
  versioned: boolean;
  version?: number;
}

export function parsePatchInput(input: string): JsonPatch[] {
  let parsed: unknown;
  try {
    parsed = autoparse(input);
  } catch {
    throw new Error(`Invalid patch input: ${input.slice(0, 100)}...`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Patches must be an array of RFC 6902 operations');
  }

  return parsed as JsonPatch[];
}

export async function runPatch(screenId: string, patches: JsonPatch[], options: PatchOptions): Promise<CommandResult> {
  const isVersioned = 'saveVersion' in options.store && typeof (options.store as VersionedSpecStore).saveVersion === 'function';
  const shouldSaveVersion = isVersioned && Boolean(options.author);
  let patchedDocument: unknown;
  const patchStore: SpecStore = shouldSaveVersion
    ? {
        load: (id) => options.store.load(id),
        save: async (_id, doc) => { patchedDocument = doc; },
        list: () => options.store.list(),
        delete: (id) => options.store.delete(id),
      }
    : options.store;
  const engine = createSpecEngine({ store: patchStore });

  try {
    const result = await engine.patch(screenId, patches);
    const versionMeta: PatchVersionMeta = { versioned: false };

    if (result.success && shouldSaveVersion) {
      if (patchedDocument === undefined) {
        throw new Error('Patch succeeded but produced no document to version');
      }
      const version = await (options.store as VersionedSpecStore).saveVersion(screenId, patchedDocument, {
        author: options.author!,
        source: 'patch',
        description: options.description,
      });
      versionMeta.versioned = true;
      versionMeta.version = version;
    }

    const outputResult = result.success ? { ...result, ...versionMeta } : result;

    if (options.toon) {
      return { output: toToon(outputResult), exitCode: result.success ? 0 : 1 };
    }

    if (options.json) {
      return { output: formatJson(outputResult), exitCode: result.success ? 0 : 1 };
    }

    if (result.success) {
      const patchCount = patches.length;
      const elemCount = result.patchedElements.length;
      const elemList = result.patchedElements.join(', ');
      const secCount = result.patchedSections?.length ?? 0;
      const secList = result.patchedSections?.join(', ') ?? '';

      const parts: string[] = [];
      if (elemCount > 0) parts.push(`${elemCount} element${elemCount !== 1 ? 's' : ''} modified (${elemList})`);
      if (secCount > 0) parts.push(`${secCount} section${secCount !== 1 ? 's' : ''} modified (${secList})`);
      const modifiedSummary = parts.length > 0 ? parts.join(', ') : 'no elements modified';

      const lines: string[] = [
        formatSuccess('Patch applied successfully'),
        '',
        `  ${patchCount} patch${patchCount !== 1 ? 'es' : ''} → ${modifiedSummary}`,
        `  ${result.elementCount} total elements`,
        '',
        'Updated manifest:',
        colorizeManifest(result.manifest),
      ];

      return { output: lines.join('\n'), exitCode: 0 };
    }

    const lines: string[] = [
      formatError({
        what: `Patch failed — ${result.errors!.length} error${result.errors!.length !== 1 ? 's' : ''}`,
        why: formatSuggestedFixes(result.errors!, screenId),
      }),
      '',
      '  Nothing was persisted. Original spec is untouched.',
      '',
      'Resulting manifest (invalid):',
      colorizeManifest(result.manifest),
    ];

    return { output: lines.join('\n'), exitCode: 1 };
  } catch (err) {
    const message = (err as Error).message;

    if (options.json) {
      return { output: formatJson({ error: message }), exitCode: 1 };
    }

    return {
      output: formatError({
        what: `Screen "${screenId}" not found`,
        why: message,
        fix: 'Check the screen ID and try again',
      }),
      exitCode: 1,
    };
  }
}
