import type { StateStore } from '../state/store.js';

export interface HistoryConfig {
  enabled: boolean;
  maxDepth: number;
  exclude?: string[]; // Path patterns to exclude (e.g. "/ui/", "/temp/")
}

export interface HistoryEngine {
  push: (path: string, value: unknown) => void;
  undo: () => boolean;
  redo: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

interface HistoryEntry {
  path: string;
  oldValue: unknown;
  newValue: unknown;
}

export function createHistoryEngine(store: StateStore, config: HistoryConfig): HistoryEngine {
  const undoStack: HistoryEntry[] = [];
  const redoStack: HistoryEntry[] = [];

  function isExcluded(path: string): boolean {
    if (!config.exclude) return false;
    return config.exclude.some((pattern) => path.startsWith(pattern));
  }

  function push(path: string, value: unknown): void {
    if (!config.enabled) return;
    if (isExcluded(path)) return;

    const oldValue = store.get(path);
    if (oldValue === value) return;

    undoStack.push({ path, oldValue, newValue: value });
    if (undoStack.length > config.maxDepth) {
      undoStack.shift();
    }
    // Clear redo stack on new action
    redoStack.length = 0;
  }

  function undo(): boolean {
    const entry = undoStack.pop();
    if (!entry) return false;

    store.set(entry.path, entry.oldValue);
    redoStack.push(entry);
    return true;
  }

  function redo(): boolean {
    const entry = redoStack.pop();
    if (!entry) return false;

    store.set(entry.path, entry.newValue);
    undoStack.push(entry);
    return true;
  }

  function canUndo(): boolean {
    return undoStack.length > 0;
  }

  function canRedo(): boolean {
    return redoStack.length > 0;
  }

  function clear(): void {
    undoStack.length = 0;
    redoStack.length = 0;
  }

  return { push, undo, redo, canUndo, canRedo, clear };
}
