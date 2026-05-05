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
        store.set('/tx/error', lastError);
        throw new Error('Confirm phase failed');
      }

      // Phase 5a: onSuccess
      if (txConfig.onSuccess && txConfig.onSuccess.length > 0) {
        await executeActions(txConfig.onSuccess);
      }
    } catch (err) {
      // Rollback: restore snapshot atomically (single set, one re-render)
      store.set('/', snapshot);

      // Write error to /tx/error if not already set
      if (!store.get('/tx/error')) {
        store.set('/tx/error', {
          message: err instanceof Error ? err.message : 'Transaction failed',
        });
      }

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
