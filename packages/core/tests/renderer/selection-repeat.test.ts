import { describe, it, expect } from 'vitest';
import { createRenderEngine } from '../../src/renderer/engine.js';
import { createResolver } from '../../src/expressions/resolver.js';
import { createStateStore } from '../../src/state/store.js';
import { createPrimitiveRegistry } from '../../src/renderer/registry.js';
import type { Spec, RenderNode } from '../../src/types.js';

function setup(spec: Spec, initialState: Record<string, unknown> = {}) {
  const store = createStateStore(initialState);
  const resolver = createResolver({ store });
  const registry = createPrimitiveRegistry();
  registry.register('stack', (props, children) => ({ type: 'stack', props, children }));
  registry.register('box', (props, children) => ({ type: 'box', props, children }));
  registry.register('text', (props) => ({ type: 'text', props, children: [] }));
  registry.register('checkbox', (props) => ({ type: 'checkbox', props, children: [] }));

  const engine = createRenderEngine({ resolver, primitiveRegistry: registry });
  return { store, engine, resolver };
}

describe('repeat.selection integration', () => {
  const spec: Spec = {
    root: 'list',
    elements: {
      list: {
        type: 'stack',
        repeat: {
          source: { $state: '/items' },
          key: 'id',
          selection: { state: '/selectedIds', key: 'id', mode: 'multiple' },
        },
        children: ['row'],
      },
      row: {
        type: 'box',
        children: ['check', 'label'],
      },
      check: {
        type: 'checkbox',
        props: {
          value: { $selection: 'selected' },
        },
      },
      label: {
        type: 'text',
        props: {
          content: { $item: 'name' },
        },
      },
    },
  };

  it('$selection: "selected" resolves correctly for selected items', () => {
    const { engine } = setup(spec, {
      items: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ],
      selectedIds: [1, 3],
    });
    const tree = engine.render(spec);
    // tree = stack (repeat wrapper) → stack (list repeated) → box (row) → [checkbox, text]
    const repeatedItems = tree.children;
    expect(repeatedItems.length).toBe(3);

    // Each repeated item is a stack (the 'list' element re-rendered with item context)
    // Its first child is 'row' (box), which has children [check, label]
    const getCheck = (i: number) => repeatedItems[i].children[0].children[0];

    // Row 0 (Alice, id=1) → selected
    expect(getCheck(0).props.value).toBe(true);

    // Row 1 (Bob, id=2) → not selected
    expect(getCheck(1).props.value).toBe(false);

    // Row 2 (Charlie, id=3) → selected
    expect(getCheck(2).props.value).toBe(true);
  });

  it('$selection: "count" resolves to the number of selected items', () => {
    const countSpec: Spec = {
      root: 'list',
      elements: {
        list: {
          type: 'stack',
          repeat: {
            source: { $state: '/items' },
            key: 'id',
            selection: { state: '/selectedIds', key: 'id', mode: 'multiple' },
          },
          children: ['row'],
        },
        row: {
          type: 'text',
          props: {
            content: { $selection: 'count' },
          },
        },
      },
    };

    const { engine } = setup(countSpec, {
      items: [{ id: 1 }, { id: 2 }],
      selectedIds: [1, 2],
    });
    const tree = engine.render(countSpec);
    // tree = stack (repeat wrapper) → stack (list re-rendered) with child 'row' (text)
    const row0 = tree.children[0].children[0];
    expect(row0.props.content).toBe(2);
  });

  it('$selection works in visibility conditions', () => {
    const visSpec: Spec = {
      root: 'list',
      elements: {
        list: {
          type: 'stack',
          repeat: {
            source: { $state: '/items' },
            key: 'id',
            selection: { state: '/selectedIds', key: 'id', mode: 'multiple' },
          },
          children: ['row'],
        },
        row: {
          type: 'box',
          children: ['badge'],
        },
        badge: {
          type: 'text',
          visible: { $selection: 'selected' },
          props: { content: 'SELECTED' },
        },
      },
    };

    const { engine } = setup(visSpec, {
      items: [{ id: 1 }, { id: 2 }],
      selectedIds: [1],
    });
    const tree = engine.render(visSpec);
    // tree = stack (repeat wrapper) → stack (list re-rendered) → box (row) → [badge?]
    const getRow = (i: number) => tree.children[i].children[0];
    // Row 0: badge visible (id=1 selected)
    expect(getRow(0).children.length).toBe(1);
    // Row 1: badge hidden (id=2 not selected)
    expect(getRow(1).children.length).toBe(0);
  });
});
