import type { SpecStore, ValidationError, VersionedSpecStore } from 'mythik';
import { getDocumentHandler, PRIMITIVE_PROP_SCHEMAS } from 'mythik';
import { formatSuccess, formatError, formatJson, formatWarning, colorizeManifest, formatSuggestedFixes } from '../output.js';
import { autoparse } from '../toon.js';
import type { CommandResult } from './manifest.js';

export interface PushOptions {
  store: SpecStore;
  json: boolean;
  force: boolean;
  author?: string;
  description?: string;
}

export interface PushResult {
  success: boolean;
  manifest: string;
  errors?: ValidationError[];
  warnings?: ValidationError[];
  elementCount: number;
  created: boolean;
}

export async function runPush(screenId: string, input: string, options: PushOptions): Promise<CommandResult> {
  let doc: unknown;
  try {
    doc = autoparse(input);
  } catch {
    const message = 'Invalid spec input — must be valid JSON or TOON';
    if (options.json) {
      return { output: formatJson({ error: message }), exitCode: 1 };
    }
    return { output: formatError({ what: 'Parse error', why: message }), exitCode: 1 };
  }

  let handler;
  try {
    handler = getDocumentHandler(doc);
  } catch {
    const message = 'Unknown document type. Expected screen spec (root + elements) or app spec (type: "app").';
    if (options.json) {
      return { output: formatJson({ error: message }), exitCode: 1 };
    }
    return { output: formatError({ what: 'Invalid document', why: message }), exitCode: 1 };
  }

  let exists = false;
  try {
    const screens = await options.store.list();
    exists = screens.includes(screenId);
  } catch { /* treat as new */ }

  const validation = handler.validate(doc, { propSchemas: PRIMITIVE_PROP_SCHEMAS });
  const elementCount = handler.countElements(doc);
  let manifest = '';
  try { manifest = handler.generateManifest(doc); } catch { /* best effort */ }
  const hasErrors = !validation.valid;

  // Existing + invalid + no force → reject
  if (hasErrors && exists && !options.force) {
    const result: PushResult = {
      success: false, manifest, errors: validation.errors, elementCount, created: false,
    };

    if (options.json) {
      return { output: formatJson(result), exitCode: 1 };
    }

    return {
      output: formatError({
        what: `Rejected — "${screenId}" has ${validation.errors.length} validation error${validation.errors.length !== 1 ? 's' : ''}`,
        why: formatSuggestedFixes(validation.errors, screenId),
        fix: 'Fix the errors and re-push, or use --force to overwrite',
      }),
      exitCode: 1,
    };
  }

  // Save — use versioned save if store supports it and author is provided
  const isVersioned = 'saveVersion' in options.store && typeof (options.store as VersionedSpecStore).saveVersion === 'function';
  if (isVersioned && options.author) {
    await (options.store as VersionedSpecStore).saveVersion(screenId, doc, {
      author: options.author,
      source: 'push',
      description: options.description,
    });
  } else {
    await options.store.save(screenId, doc);
  }
  const created = !exists;

  const result: PushResult = {
    success: true, manifest, elementCount, created,
    ...(hasErrors ? { errors: validation.errors } : {}),
    ...(validation.warnings?.length ? { warnings: validation.warnings } : {}),
  };

  if (options.json) {
    return { output: formatJson(result), exitCode: 0 };
  }

  if (hasErrors) {
    return {
      output: [
        formatWarning(`Saved "${screenId}" with ${validation.errors.length} validation error${validation.errors.length !== 1 ? 's' : ''} (${elementCount} elements, ${created ? 'new' : 'overwritten'})`),
        '',
        formatSuggestedFixes(validation.errors, screenId),
      ].join('\n'),
      exitCode: 0,
    };
  }

  const warningLines = validation.warnings?.length
    ? [formatWarning(`${validation.warnings.length} prop warning${validation.warnings.length !== 1 ? 's' : ''}:`), formatSuggestedFixes(validation.warnings, screenId), '']
    : [];

  return {
    output: [
      formatSuccess(`Saved "${screenId}" (${elementCount} elements, ${created ? 'new' : 'overwritten'})`),
      '',
      ...warningLines,
      colorizeManifest(manifest),
    ].join('\n'),
    exitCode: 0,
  };
}
