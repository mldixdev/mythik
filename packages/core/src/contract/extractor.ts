import type { FetchReference } from './types.js';

/**
 * Extract all fetch/submitForm/dataSource references from a screen spec.
 * Resolves $template URLs, strips base URL, extracts query params and body fields.
 */
export function extractFetchReferences(
  screenId: string,
  spec: Record<string, unknown>,
  baseUrl?: string,
): FetchReference[] {
  const refs: FetchReference[] = [];

  // 1. initialActions
  const initialActions = spec.initialActions as unknown[] | undefined;
  if (initialActions) {
    for (const action of initialActions) {
      extractFromAction(action, screenId, baseUrl, refs);
    }
  }

  // 2. dataSources
  const dataSources = spec.dataSources as Record<string, Record<string, unknown>> | undefined;
  if (dataSources) {
    for (const [, ds] of Object.entries(dataSources)) {
      const url = resolveUrl(ds.url);
      if (url) {
        const parsed = parseUrl(url, baseUrl);
        refs.push({
          screen: screenId,
          path: parsed.path,
          method: ((ds.method as string) ?? 'GET').toUpperCase(),
          queryParams: parsed.queryParams,
          bodyFields: [],
          rawUrl: url,
        });
      }
    }
  }

  // 3. Walk all elements for on.* event handlers
  const elements = spec.elements as Record<string, Record<string, unknown>> | undefined;
  if (elements) {
    for (const [elementId, element] of Object.entries(elements)) {
      const on = element.on as Record<string, unknown> | undefined;
      if (!on) continue;

      for (const [, binding] of Object.entries(on)) {
        if (Array.isArray(binding)) {
          for (const action of binding) {
            extractFromAction(action, screenId, baseUrl, refs, elementId);
          }
        } else {
          extractFromAction(binding, screenId, baseUrl, refs, elementId);
        }
      }
    }
  }

  return refs;
}

function extractFromAction(
  action: unknown,
  screenId: string,
  baseUrl: string | undefined,
  refs: FetchReference[],
  elementId?: string,
): void {
  if (!action || typeof action !== 'object') return;
  const a = action as Record<string, unknown>;
  const actionType = a.action as string;

  if (actionType === 'fetch' || actionType === 'submitForm') {
    const params = a.params as Record<string, unknown> | undefined;
    if (!params) return;

    const url = resolveUrl(params.url);
    if (!url) return;

    const parsed = parseUrl(url, baseUrl);
    const body = params.body as Record<string, unknown> | undefined;

    refs.push({
      screen: screenId,
      path: parsed.path,
      method: ((params.method as string) ?? 'GET').toUpperCase(),
      queryParams: parsed.queryParams,
      bodyFields: body ? Object.keys(body) : [],
      rawUrl: url,
      elementId,
    });
  }

  if (actionType === 'transaction') {
    const params = a.params as Record<string, unknown> | undefined;
    if (!params) return;

    for (const key of ['confirm', 'onSuccess', 'onError']) {
      const steps = params[key] as unknown[] | undefined;
      if (steps) {
        for (const step of steps) {
          extractFromAction(step, screenId, baseUrl, refs, elementId);
        }
      }
    }
  }
}

/** Resolve a URL value — handles strings and $template expressions */
function resolveUrl(urlValue: unknown): string | null {
  if (typeof urlValue === 'string') return urlValue;
  if (urlValue && typeof urlValue === 'object') {
    const tmpl = (urlValue as Record<string, unknown>)['$template'];
    if (typeof tmpl === 'string') return tmpl;
  }
  return null;
}

interface ParsedUrl {
  path: string;
  queryParams: string[];
}

/** Parse a URL: strip base URL, replace ${...} with :param, extract query params */
function parseUrl(url: string, baseUrl?: string): ParsedUrl {
  // Replace ${...} template expressions with :param placeholder
  const normalized = url.replace(/\$\{[^}]+\}/g, ':param');

  // Handle domain-as-template: http://:param/api/items → /api/items
  // Also handles port: https://:param:8080/api/items → /api/items
  let workUrl = normalized;
  const domainTemplateMatch = workUrl.match(/^https?:\/\/:param(:\d+)?(\/.*)/);
  if (domainTemplateMatch) {
    workUrl = domainTemplateMatch[2];
  }
  if (baseUrl && workUrl.startsWith(baseUrl)) {
    workUrl = workUrl.slice(baseUrl.length);
    if (!workUrl.startsWith('/')) workUrl = '/' + workUrl;
  }

  // Split path from query string
  const [pathPart, queryPart] = workUrl.split('?');
  const path = pathPart.replace(/\/+$/, '') || '/'; // normalize trailing slash

  // Extract query param names (skip template-derived :param values)
  const queryParams: string[] = [];
  if (queryPart) {
    for (const pair of queryPart.split('&')) {
      const name = pair.split('=')[0];
      if (name && !name.startsWith(':')) {
        queryParams.push(name);
      }
    }
  }

  return { path, queryParams };
}
