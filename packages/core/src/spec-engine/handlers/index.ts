import type { DocumentHandler } from '../types.js';
import { screenHandler } from './screen-handler.js';
import { appHandler } from './app-handler.js';
import { apiHandler } from './api-handler.js';

const handlers: DocumentHandler[] = [apiHandler, appHandler, screenHandler];

export function getDocumentHandler(doc: unknown): DocumentHandler {
  for (const h of handlers) {
    if (h.detect(doc)) return h;
  }
  throw new Error(
    'Unknown document type. Expected screen spec (root + elements), app spec (type: "app"), or api spec (type: "api").'
  );
}

export function registerDocumentHandler(handler: DocumentHandler): void {
  // Insert before screenHandler (last position) — screen is the fallback
  handlers.splice(handlers.length - 1, 0, handler);
}

export { screenHandler, appHandler, apiHandler };
