import type { StateStore } from '../state/store.js';

export interface DragDropConfig {
  enabled: boolean;
  axis: 'vertical' | 'horizontal' | 'both';
  dropZones?: string[];
}

export interface DragDropEngine {
  /** Reorder items within a list at the given state path */
  reorder: (statePath: string, fromIndex: number, toIndex: number) => void;
  /** Move an item from one list to another */
  moveBetween: (fromPath: string, fromIndex: number, toPath: string, toIndex: number) => void;
}

export function createDragDropEngine(store: StateStore): DragDropEngine {
  function reorder(statePath: string, fromIndex: number, toIndex: number): void {
    const items = store.get(statePath) as unknown[];
    if (!items || !Array.isArray(items)) return;
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || fromIndex >= items.length) return;
    if (toIndex < 0 || toIndex >= items.length) return;

    const newItems = [...items];
    const [moved] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, moved);
    store.set(statePath, newItems);
  }

  function moveBetween(fromPath: string, fromIndex: number, toPath: string, toIndex: number): void {
    const fromItems = store.get(fromPath) as unknown[];
    const toItems = store.get(toPath) as unknown[];
    if (!fromItems || !Array.isArray(fromItems)) return;
    if (!toItems || !Array.isArray(toItems)) return;
    if (fromIndex < 0 || fromIndex >= fromItems.length) return;

    const newFrom = [...fromItems];
    const [moved] = newFrom.splice(fromIndex, 1);
    const newTo = [...toItems];
    newTo.splice(toIndex, 0, moved);

    store.set(fromPath, newFrom);
    store.set(toPath, newTo);
  }

  return { reorder, moveBetween };
}
