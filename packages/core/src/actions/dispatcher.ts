import type { StateStore } from '../state/store.js';
import type { ActionBinding, ActionDefinition, ResolveFn } from '../types.js';
import type { UrlGuard } from '../security/url-whitelist.js';
import type { StateGuard } from '../security/state-protection.js';
import type { RateLimiter } from '../security/rate-limiter.js';
import type { StorageAdapter, StorageAdapterConfig } from '../storage/types.js';
import { createUploadHandler, createDeleteHandler } from '../storage/upload-action.js';
import type { ExportAdapter, ExportColumn as ExportColumnDef } from '../export/types.js';
import { formatExportValue } from '../export/format.js';
import { generateCSV } from '../export/csv.js';
import { downloadBlob } from '../export/download.js';
import { createMiddlewareChain, type ActionMiddleware, type MiddlewareChain } from './middleware.js';
import { deepResolveExpressionValue } from '../expressions/deep-resolve.js';

export interface FormEngineRef {
  validateForm: (formId: string) => boolean;
  touchField: (formId: string, field: string) => void;
  resetForm: (formId: string) => void;
}

export interface ActionDispatcherConfig {
  store: StateStore;
  customActions?: Map<string, ActionDefinition>;
  urlGuard?: UrlGuard;
  stateGuard?: StateGuard;
  rateLimiter?: RateLimiter;
  formEngine?: FormEngineRef;
  /** Override fetch function for auth header injection. Defaults to globalThis.fetch. */
  fetcher?: (url: string, options?: RequestInit) => Promise<Response>;
  /** Storage adapter for file uploads. When provided, uploadFile and deleteFile actions are available. */
  storage?: StorageAdapter;
  /** Global storage limits (allowedTypes, maxSize). */
  storageConfig?: StorageAdapterConfig;
  /** Export adapters keyed by format (e.g., { xlsx: myAdapter }). CSV is always built-in. */
  exportAdapters?: Record<string, ExportAdapter>;
  /** Middleware hooks executed on every dispatch (before/after/onError). */
  middleware?: ActionMiddleware[];
}

export interface ActionDispatcherInstance {
  dispatch: (binding: ActionBinding, resolve: ResolveFn) => void | Promise<void>;
  registerAction: (action: ActionDefinition) => void;
}

/**
 * Built-in actions that ship with the framework.
 * Custom actions can be added via registerAction.
 */
/** Recursively resolve expressions in nested objects/arrays */
export const deepResolve = deepResolveExpressionValue;

/** Resolve all expression values in params (deeply) */
export function resolveParams(params: Record<string, unknown> | undefined, resolve: ResolveFn): Record<string, unknown> {
  if (!params) return {};
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    resolved[key] = deepResolve(value, resolve);
  }
  return resolved;
}

export function createActionDispatcher(config: ActionDispatcherConfig): ActionDispatcherInstance {
  const { store } = config;
  const customActions = config.customActions ?? new Map<string, ActionDefinition>();
  // Lazy fetch binding — resolves at call time so test mocks work
  const fetcher = config.fetcher ?? ((url: string, opts?: RequestInit) => globalThis.fetch(url, opts!));
  // Middleware chain — before/after/onError hooks on all actions
  const middlewareChain: MiddlewareChain = createMiddlewareChain(config.middleware ?? []);

  /** Built-in action handlers */
  const builtinActions: Record<string, (params: Record<string, unknown>) => void | Promise<void>> = {
    setState: (params) => {
      const path = params.statePath as string;
      const value = params.value;
      if (!path) throw new Error('setState action requires "statePath" param');
      store.set(path, value);
    },

    navigate: (params) => {
      // Navigation is handled by the renderer layer (React Navigation, etc.)
      // Here we just set the navigation intent in state
      store.set('/navigation/intent', {
        screen: params.screen,
        params: params,
        timestamp: Date.now(),
      });
    },

    openModal: (params) => {
      const id = params.id as string ?? params.modal as string;
      if (id) store.set(`/ui/modals/${id}`, true);
    },

    closeModal: (params) => {
      const id = params.id as string ?? params.modal as string;
      if (id) store.set(`/ui/modals/${id}`, false);
    },

    openDrawer: (params) => {
      const id = params.id as string ?? 'default';
      store.set(`/ui/drawers/${id}`, true);
    },

    closeDrawer: (params) => {
      const id = params.id as string ?? 'default';
      store.set(`/ui/drawers/${id}`, false);
    },

    goBack: () => {
      store.set('/navigation/intent', { action: 'goBack', timestamp: Date.now() });
    },

    showNotification: (params) => {
      const notifications = (store.get('/ui/notifications') as unknown[]) ?? [];
      store.set('/ui/notifications', [
        ...notifications,
        {
          id: crypto.randomUUID(),
          message: params.message,
          type: params.type ?? 'info',
          title: params.title,
          duration: params.duration,
          timestamp: Date.now(),
        },
      ]);
    },

    dismissNotification: (params) => {
      const notifications = (store.get('/ui/notifications') as unknown[]) ?? [];
      store.set('/ui/notifications', notifications.filter((n: unknown) => (n as Record<string, unknown>).id !== params.id));
    },

    validateForm: (params) => {
      const formId = params.formId as string;
      if (!formId) throw new Error('validateForm action requires "formId" param');
      if (config.formEngine) {
        config.formEngine.validateForm(formId);
      }
    },

    touchField: (params) => {
      const formId = params.formId as string;
      const field = params.field as string;
      if (!formId || !field) throw new Error('touchField action requires "formId" and "field" params');
      if (config.formEngine) {
        config.formEngine.touchField(formId, field);
      }
    },

    resetForm: (params) => {
      const formId = params.formId as string;
      if (!formId) throw new Error('resetForm action requires "formId" param');
      if (config.formEngine) {
        config.formEngine.resetForm(formId);
      }
    },

    uploadFile: async (params) => {
      if (!config.storage) {
        console.warn('[Mythik] uploadFile action called but no storage adapter configured');
        return;
      }
      const handler = createUploadHandler(config.storage, store, config.storageConfig ?? {});
      await handler({
        files: params.files as File[],
        bucket: params.bucket as string,
        target: params.target as string,
        elementId: params.elementId as string,
        path: params.path as string | undefined,
        accept: (params.accept as string) ?? '*',
        maxSize: (params.maxSize as number) ?? 10_485_760,
      });
    },

    deleteFile: async (params) => {
      if (!config.storage) {
        console.warn('[Mythik] deleteFile action called but no storage adapter configured');
        return;
      }
      const handler = createDeleteHandler(config.storage);
      await handler({
        path: params.path as string,
        bucket: params.bucket as string,
      });
    },

    export: async (params) => {
      const source = params.source as string;
      const columns = params.columns as ExportColumnDef[];
      const filename = params.filename as string;
      const format = (params.format as string) ?? 'csv';
      const title = params.title as string | undefined;

      const rows = (store.get(source) as Record<string, unknown>[]) ?? [];

      const formattedRows = rows.map((row) => {
        const formatted: Record<string, string> = {};
        for (const col of columns) {
          formatted[col.field] = formatExportValue(row[col.field], col);
        }
        return formatted;
      });

      const data = { columns, rows, formattedRows, title };

      if (format === 'csv') {
        const blob = generateCSV(data);
        downloadBlob(blob, `${filename}.csv`);
        return;
      }

      const adapter = config.exportAdapters?.[format];
      if (!adapter) {
        console.warn(`[Mythik] No export adapter registered for format "${format}". Register via exportAdapters prop.`);
        return;
      }

      const blob = await adapter.generate(data, format);
      downloadBlob(blob, `${filename}.${format}`);
    },

    toggleTheme: () => {
      const current = store.get('/preferences/theme') as string;
      store.set('/preferences/theme', current === 'dark' ? 'light' : 'dark');
    },

    setLocale: (params) => {
      if (params.locale) store.set('/preferences/locale', params.locale);
    },

    copyToClipboard: (params) => {
      // Clipboard access is handled by the renderer layer
      const value = typeof params.value === 'object' && params.value !== null
        ? JSON.stringify(params.value, null, 2)
        : params.value;
      store.set('/ui/clipboard', { value, timestamp: Date.now() });
    },

    openUrl: (params) => {
      // URL opening is handled by the renderer layer
      store.set('/ui/openUrl', { url: params.url, timestamp: Date.now() });
    },

    fetch: async (params) => {
      const url = params.url as string;
      const method = (params.method as string) ?? 'GET';
      const body = params.body as Record<string, unknown> | undefined;
      const target = params.target as string | undefined;
      const headers = (params.headers as Record<string, string>) ?? {};

      if (!url) throw new Error('fetch action requires "url" param');

      store.set('/ui/loading', true);

      try {
        const options: RequestInit = {
          method,
          headers: { 'Content-Type': 'application/json', ...headers },
        };

        if (body && method !== 'GET') {
          // Sanitize body: convert empty strings to null (databases reject "" for typed columns)
          const sanitized: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(body)) {
            sanitized[k] = v === '' ? null : v;
          }
          options.body = JSON.stringify(sanitized);
        }

        const response = await fetcher(url, options);
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          store.set('/ui/loading', false);
          store.set('/ui/lastError', { status: response.status, message: `HTTP ${response.status}`, data });
          return;
        }

        if (target) {
          store.set(target, data);
        }

        store.set('/ui/loading', false);
        store.set('/ui/lastError', null);
      } catch (err) {
        store.set('/ui/loading', false);
        store.set('/ui/lastError', { message: err instanceof Error ? err.message : 'Network error' });
      }
    },

    toggleSelection: (params) => {
      const statePath = params.statePath as string;
      const value = params.value;
      if (!statePath) throw new Error('toggleSelection action requires "statePath" param');
      const current = (store.get(statePath) as unknown[]) ?? [];
      const idx = current.indexOf(value);
      if (idx === -1) {
        // Single mode: replace; multiple mode: append
        if (params.mode === 'single') {
          store.set(statePath, [value]);
        } else {
          store.set(statePath, [...current, value]);
        }
      } else {
        store.set(statePath, current.filter((_, i) => i !== idx));
      }
    },

    selectAll: (params) => {
      const statePath = params.statePath as string;
      const values = params.values as unknown[];
      if (!statePath) throw new Error('selectAll action requires "statePath" param');
      store.set(statePath, values ?? []);
    },

    selectNone: (params) => {
      const statePath = params.statePath as string;
      if (!statePath) throw new Error('selectNone action requires "statePath" param');
      store.set(statePath, []);
    },

    submitForm: async (params) => {
      // Form validation gate
      const formId = params.formId as string | undefined;
      if (formId) {
        let isValid: boolean;
        if (config.formEngine) {
          isValid = config.formEngine.validateForm(formId);
        } else {
          isValid = (store.get(`/ui/forms/${formId}/isValid`) as boolean) !== false;
        }
        if (!isValid) {
          builtinActions.showNotification({ message: 'Please fix the errors before submitting', type: 'error' });
          return;
        }
      }

      // Combines validation + fetch in one action
      const url = params.url as string;
      const method = (params.method as string) ?? 'POST';
      const body = params.body as Record<string, unknown> | undefined;
      const target = params.target as string | undefined;
      const successMessage = params.successMessage as string | undefined;

      if (!url) throw new Error('submitForm action requires "url" param');

      store.set('/ui/submitting', true);

      try {
        const response = await fetcher(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(
            Object.fromEntries(Object.entries(body).map(([k, v]) => [k, v === '' ? null : v]))
          ) : undefined,
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          store.set('/ui/submitting', false);
          store.set('/ui/lastError', { status: response.status, data });
          return;
        }

        if (target) store.set(target, data);
        store.set('/ui/submitting', false);
        store.set('/ui/lastError', null);

        if (successMessage) {
          builtinActions.showNotification({ message: successMessage, type: 'success' });
        }
      } catch (err) {
        store.set('/ui/submitting', false);
        store.set('/ui/lastError', { message: err instanceof Error ? err.message : 'Network error' });
      }
    },
  };

  async function dispatch(binding: ActionBinding, resolve: ResolveFn): Promise<void> {
    const { action, params } = binding;
    const resolvedParams = resolveParams(params, resolve);

    // Build middleware context
    const mwContext = {
      action,
      params: resolvedParams,
      getState: (path: string) => store.get(path),
      setParam: (key: string, value: unknown) => { resolvedParams[key] = value; },
    };

    // Execute before middleware
    await middlewareChain.executeBefore(mwContext);

    // Security: rate limiting
    if (config.rateLimiter) {
      config.rateLimiter.assertAllowed();
    }

    // Security: URL whitelist for fetch/submitForm
    if ((action === 'fetch' || action === 'submitForm') && config.urlGuard && resolvedParams.url) {
      config.urlGuard.assertAllowed(resolvedParams.url as string);
    }

    // Security: state path protection for setState
    if (action === 'setState' && config.stateGuard && resolvedParams.statePath) {
      config.stateGuard.assertCanWrite(resolvedParams.statePath as string);
    }

    try {
      // Check built-in actions first
      const builtinHandler = builtinActions[action];
      if (builtinHandler) {
        const result = await builtinHandler(resolvedParams);
        await middlewareChain.executeAfter(mwContext, result);
        return;
      }

      // Check custom actions
      const customAction = customActions.get(action);
      if (customAction) {
        const result = await customAction.handler(
          resolvedParams,
          (path, value) => {
            // Security: protect state paths in custom actions too
            if (config.stateGuard) config.stateGuard.assertCanWrite(path);
            store.set(path, value);
          },
          (path) => store.get(path),
        );
        await middlewareChain.executeAfter(mwContext, result);
        return;
      }

      throw new Error(`Unknown action: "${action}". Register it via plugins.`);
    } catch (err) {
      await middlewareChain.executeOnError(mwContext, err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }

  function registerAction(action: ActionDefinition): void {
    customActions.set(action.name, action);
  }

  return { dispatch, registerAction };
}
