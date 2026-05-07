import type { StateStore } from '../state/store.js';
import type { TransactionConfig, ActionBinding, ResolveFn } from '../types.js';
import type { ActionDispatcherInstance } from './dispatcher.js';

export interface TransactionEngineConfig {
  store: StateStore;
  dispatcher: ActionDispatcherInstance;
  resolve: ResolveFn;
}

export interface TransactionEngine {
  execute: (config: TransactionConfig) => Promise<void>;
}

const DEFAULT_TIMEOUT = 10_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return undefined;
}

function getErrorOwnFields(error: Error): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const key of Object.getOwnPropertyNames(error)) {
    if (key === 'message' || key === 'name' || key === 'stack') continue;
    fields[key] = (error as unknown as Record<string, unknown>)[key];
  }
  return fields;
}

function normalizeTransactionError(error: unknown, fallbackMessage = 'Transaction failed'): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      ...getErrorOwnFields(error),
      message: error.message || fallbackMessage,
    };
  }

  if (!isRecord(error)) {
    return { message: fallbackMessage };
  }

  const data = isRecord(error.data) ? error.data : undefined;
  const nestedError = data && isRecord(data.error) ? data.error : undefined;
  const message = firstString(
    nestedError?.message,
    data?.message,
    error.message,
    fallbackMessage,
  ) ?? fallbackMessage;
  const code = firstString(nestedError?.code, data?.code, error.code);

  return {
    ...error,
    ...(code ? { code } : {}),
    message,
  };
}

export function createTransactionEngine(config: TransactionEngineConfig): TransactionEngine {
  const { store, dispatcher, resolve } = config;

  // --- Queue: one transaction at a time ---
  let running = false;
  const queue: Array<{ txConfig: TransactionConfig; done: () => void }> = [];

  function processQueue(): void {
    if (running || queue.length === 0) return;
    running = true;
    const next = queue.shift()!;
    runTransaction(next.txConfig)
      .finally(() => {
        running = false;
        next.done();
        processQueue();
      });
  }

  // --- Execute phases sequentially ---
  async function executeActions(actions: ActionBinding[]): Promise<void> {
    for (const binding of actions) {
      await dispatcher.dispatch(binding, resolve);
    }
  }

  // --- Core transaction logic ---
  async function runTransaction(txConfig: TransactionConfig): Promise<void> {
    const timeout = txConfig.timeout ?? DEFAULT_TIMEOUT;

    // Phase 1: before (not rolled back)
    if (txConfig.before && txConfig.before.length > 0) {
      await executeActions(txConfig.before);
    }

    // Phase 2: snapshot (AFTER before, BEFORE optimistic)
    const snapshot = store.getSnapshot();

    // Phase 3: optimistic (rolled back on error)
    if (txConfig.optimistic && txConfig.optimistic.length > 0) {
      await executeActions(txConfig.optimistic);
    }

    // Phase 4: confirm (with timeout)
    let confirmError: Record<string, unknown> | null = null;

    try {
      // Clear any previous lastError so we can detect new ones
      store.set('/ui/lastError', null);

      await Promise.race([
        executeActions(txConfig.confirm),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Transaction timeout')), timeout)
        ),
      ]);

      // Check if confirm resulted in an error stored by the fetch action
      const lastError = store.get('/ui/lastError');
      if (lastError) {
        confirmError = normalizeTransactionError(lastError, 'Confirm phase failed');
        throw new Error('Confirm phase failed');
      }

      // Phase 5a: onSuccess
      if (txConfig.onSuccess && txConfig.onSuccess.length > 0) {
        await executeActions(txConfig.onSuccess);
      }
    } catch (err) {
      // Rollback: restore snapshot atomically (single set, one re-render)
      store.set('/', snapshot);

      // Write error after rollback so root restore cannot erase details.
      store.set('/tx/error', confirmError ?? normalizeTransactionError(err));

      // Phase 5b: onError (after rollback)
      if (txConfig.onError && txConfig.onError.length > 0) {
        try {
          await executeActions(txConfig.onError);
        } catch (onErrorErr) {
          console.error('Transaction onError handler failed:', onErrorErr);
        }
      }
    } finally {
      // Cleanup /tx/*
      const txState = store.get('/tx');
      if (txState !== undefined) {
        store.set('/tx', undefined);
      }
    }
  }

  // --- Public API ---
  function execute(txConfig: TransactionConfig): Promise<void> {
    return new Promise<void>((resolvePromise) => {
      queue.push({
        txConfig,
        done: () => resolvePromise(),
      });
      processQueue();
    });
  }

  return { execute };
}
