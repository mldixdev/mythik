import type { SpecStore } from 'mythik';
import { getDocumentHandler, PRIMITIVE_PROP_SCHEMAS } from 'mythik';
import { formatSuccess, formatError, formatJson, formatWarning, formatSuggestedFixes } from '../output.js';
import type { CommandResult } from './manifest.js';

/** Primitives that accept className for CSS hover/active/focus. Matches mythik-react's CSS_HOVER_SUPPORTED. */
const CSS_HOVER_TYPES = new Set(['box', 'text', 'stack', 'grid', 'scroll', 'button', 'touchable', 'table']);

export interface ValidateOptions {
  store: SpecStore;
  json: boolean;
}

export async function runValidate(screenId: string, options: ValidateOptions): Promise<CommandResult> {
  try {
    const doc = await options.store.load(screenId);
    const handler = getDocumentHandler(doc);
    const elementCount = handler.countElements(doc);
    const result = handler.validate(doc, { cssHoverTypes: CSS_HOVER_TYPES, propSchemas: PRIMITIVE_PROP_SCHEMAS });

    // ApiSpec lintWarnings (additive field on SpecValidationResult — Item I)
    const apiLintWarnings = result.lintWarnings;
    const hasApiLintWarnings = Array.isArray(apiLintWarnings) && apiLintWarnings.length > 0;

    if (options.json) {
      return {
        output: formatJson({
          valid: result.valid,
          elementCount,
          errors: result.errors,
          ...(hasApiLintWarnings ? { lintWarnings: apiLintWarnings } : {}),
        }),
        exitCode: result.valid ? 0 : 1,
      };
    }

    if (result.valid) {
      const warningLines = result.warnings?.length
        ? ['\n', formatWarning(`${result.warnings.length} prop warning${result.warnings.length !== 1 ? 's' : ''}:`), formatSuggestedFixes(result.warnings, screenId)]
        : [];
      const lintLines = hasApiLintWarnings
        ? ['\n', formatWarning(`${apiLintWarnings!.length} lint warning${apiLintWarnings!.length !== 1 ? 's' : ''}:`), formatSuggestedFixes(apiLintWarnings!, screenId)]
        : [];
      return {
        output: [formatSuccess(`Valid — ${elementCount} elements, 0 errors`), ...warningLines, ...lintLines].join('\n'),
        exitCode: 0,
      };
    }

    return {
      output: formatError({
        what: `Invalid — ${result.errors.length} error${result.errors.length !== 1 ? 's' : ''}`,
        why: formatSuggestedFixes(result.errors, screenId),
      }),
      exitCode: 1,
    };
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
