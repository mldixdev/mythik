import { describe, it, expect } from 'vitest';
import { createDragDropEngine } from '../../src/interactions/drag-drop.js';
import { createStateStore } from '../../src/state/store.js';

describe('DragDropEngine', () => {
  it('reorders items within a list', () => {
    const store = createStateStore({ tasks: ['A', 'B', 'C', 'D'] });
    const dd = createDragDropEngine(store);
    dd.reorder('/tasks', 0, 2); // Move A from index 0 to index 2
    expect(store.get('/tasks')).toEqual(['B', 'C', 'A', 'D']);
  });

  it('reorders backward', () => {
    const store = createStateStore({ tasks: ['A', 'B', 'C', 'D'] });
    const dd = createDragDropEngine(store);
    dd.reorder('/tasks', 3, 0); // Move D from index 3 to index 0
    expect(store.get('/tasks')).toEqual(['D', 'A', 'B', 'C']);
  });

  it('does nothing for same index', () => {
    const store = createStateStore({ tasks: ['A', 'B', 'C'] });
    const dd = createDragDropEngine(store);
    dd.reorder('/tasks', 1, 1);
    expect(store.get('/tasks')).toEqual(['A', 'B', 'C']);
  });

  it('moves items between lists', () => {
    const store = createStateStore({
      todo: ['Task 1', 'Task 2', 'Task 3'],
      done: ['Task 0'],
    });
    const dd = createDragDropEngine(store);
    dd.moveBetween('/todo', 1, '/done', 0); // Move Task 2 to start of done
    expect(store.get('/todo')).toEqual(['Task 1', 'Task 3']);
    expect(store.get('/done')).toEqual(['Task 2', 'Task 0']);
  });

  it('moves to end of target list', () => {
    const store = createStateStore({ from: ['A', 'B'], to: ['X', 'Y'] });
    const dd = createDragDropEngine(store);
    dd.moveBetween('/from', 0, '/to', 2);
    expect(store.get('/from')).toEqual(['B']);
    expect(store.get('/to')).toEqual(['X', 'Y', 'A']);
  });

  it('ignores invalid indices', () => {
    const store = createStateStore({ tasks: ['A', 'B'] });
    const dd = createDragDropEngine(store);
    dd.reorder('/tasks', -1, 0);
    dd.reorder('/tasks', 0, 10);
    expect(store.get('/tasks')).toEqual(['A', 'B']);
  });
});
