import type { Handler } from './types.js';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

export async function discoverHandlers(handlersDir: string): Promise<Map<string, Handler>> {
  const handlers = new Map<string, Handler>();

  if (!fs.existsSync(handlersDir)) {
    return handlers;
  }

  const files = fs.readdirSync(handlersDir).filter(f =>
    f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.mjs'),
  );

  for (const file of files) {
    const name = path.basename(file, path.extname(file));
    const fullPath = path.resolve(handlersDir, file);
    try {
      const mod = await import(pathToFileURL(fullPath).href);
      const handler = mod.default;
      if (typeof handler === 'function') {
        handlers.set(name, handler);
      }
    } catch {
      // Skip files that fail to import
    }
  }

  return handlers;
}

export function validateHandlerRefs(
  refs: string[],
  handlers: Map<string, Handler>,
): string[] {
  const errors: string[] = [];
  for (const ref of refs) {
    if (!handlers.has(ref)) {
      errors.push(`Handler "${ref}" referenced in spec but not found in handlers directory`);
    }
  }
  return errors;
}

export function getHandlerRefs(spec: { endpoints?: Record<string, { handler?: string }> }): string[] {
  if (!spec.endpoints) return [];
  return Object.values(spec.endpoints)
    .filter(e => e.handler)
    .map(e => e.handler!);
}
