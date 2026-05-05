import { describe, it, expect } from 'vitest';
import { createHistoryEngine } from '../../src/interactions/history.js';
import { createStateStore } from '../../src/state/store.js';

describe('HistoryEngine (undo/redo)', () => {
  it('undoes a state change', () => {
    const store = createStateStore({ name: 'Alice' });
    const history = createHistoryEngine(store, { enabled: true, maxDepth: 50 });

    history.push('/name', 'Bob');
    store.set('/name', 'Bob');

    expect(store.get('/name')).toBe('Bob');
    history.undo();
    expect(store.get('/name')).toBe('Alice');
  });

  it('redoes after undo', () => {
    const store = createStateStore({ name: 'Alice' });
    const history = createHistoryEngine(store, { enabled: true, maxDepth: 50 });

    history.push('/name', 'Bob');
    store.set('/name', 'Bob');

    history.undo();
    expect(store.get('/name')).toBe('Alice');

    history.redo();
    expect(store.get('/name')).toBe('Bob');
  });

  it('clears redo stack on new action', () => {
    const store = createStateStore({ name: 'Alice' });
    const history = createHistoryEngine(store, { enabled: true, maxDepth: 50 });

    history.push('/name', 'Bob');
    store.set('/name', 'Bob');
    history.undo();

    // New action after undo
    history.push('/name', 'Charlie');
    store.set('/name', 'Charlie');

    expect(history.canRedo()).toBe(false);
  });

  it('respects maxDepth', () => {
    const store = createStateStore({ count: 0 });
    const history = createHistoryEngine(store, { enabled: true, maxDepth: 3 });

    for (let i = 1; i <= 5; i++) {
      history.push('/count', i);
      store.set('/count', i);
    }

    // Only last 3 should be undoable
    expect(history.canUndo()).toBe(true);
    history.undo(); // 5 → 4
    history.undo(); // 4 → 3
    history.undo(); // 3 → 2
    expect(history.canUndo()).toBe(false);
  });

  it('excludes paths matching patterns', () => {
    const store = createStateStore({ ui: { sidebar: false }, form: { name: '' } });
    const history = createHistoryEngine(store, { enabled: true, maxDepth: 50, exclude: ['/ui/'] });

    history.push('/ui/sidebar', true);
    history.push('/form/name', 'Alice');

    expect(history.canUndo()).toBe(true);
    history.undo(); // Only form/name is tracked
    expect(store.get('/form/name')).toBe('');
  });

  it('does nothing when disabled', () => {
    const store = createStateStore({ name: 'Alice' });
    const history = createHistoryEngine(store, { enabled: false, maxDepth: 50 });

    history.push('/name', 'Bob');
    expect(history.canUndo()).toBe(false);
  });

  it('returns false when nothing to undo/redo', () => {
    const store = createStateStore({});
    const history = createHistoryEngine(store, { enabled: true, maxDepth: 50 });
    expect(history.undo()).toBe(false);
    expect(history.redo()).toBe(false);
  });

  it('clear removes all history', () => {
    const store = createStateStore({ x: 0 });
    const history = createHistoryEngine(store, { enabled: true, maxDepth: 50 });
    history.push('/x', 1);
    store.set('/x', 1);
    history.clear();
    expect(history.canUndo()).toBe(false);
  });
});
