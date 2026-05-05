import type { StateStore, EventBinding } from 'mythik';

export function createContextDispatcher<TContext>(
  store: StateStore,
  dispatchAction: (binding: EventBinding) => void,
  defaultContextPath: string,
): (binding: EventBinding | undefined, context?: TContext, contextPath?: string) => void {
  return (binding, context, contextPath = defaultContextPath) => {
    if (context !== undefined) {
      store.set(contextPath, context);
    }

    if (!binding) return;

    dispatchAction(binding);
  };
}
