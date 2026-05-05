import type { StateStore, EventBinding } from 'mythik';
import { RESERVED_PATHS } from 'mythik';
import { createContextDispatcher } from './context-dispatcher.js';

/**
 * Create a row-context dispatcher: writes the row to a reserved state path
 * (default: /ui/selectedRow) immediately before invoking the underlying
 * dispatchAction. Used by the table primitive for both onRowClick and
 * columns[].actions[].onPress — they share the same row-context contract
 * per ai-context-runtime-semantics.md § 2.1.
 *
 * Behavior:
 * - If `row` is provided, writes row to `rowPath` synchronously before any dispatch.
 * - If `binding` is undefined, performs the row write but no dispatch.
 * - If `binding` is an array, dispatches each entry in order.
 * - If `binding` is an empty array, performs the row write (if `row` provided) but no dispatch.
 * - If `binding` is a single binding (ActionBinding or TransactionBinding shape),
 *   dispatches once. The underlying dispatchAction is responsible for handling
 *   transaction shapes — this helper passes through.
 */
export function createRowDispatcher(
  store: StateStore,
  dispatchAction: (binding: EventBinding) => void,
  rowPath: string = RESERVED_PATHS.SELECTED_ROW,
): (binding: EventBinding | undefined, row?: Record<string, unknown>) => void {
  const dispatchWithContext = createContextDispatcher<Record<string, unknown>>(
    store,
    dispatchAction,
    rowPath,
  );

  return (binding, row) => {
    dispatchWithContext(binding, row || undefined);
  };
}
