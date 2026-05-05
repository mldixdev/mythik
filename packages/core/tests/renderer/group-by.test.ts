import { describe, it, expect } from 'vitest';
import { createStateStore } from '../../src/state/store.js';
import { createResolver } from '../../src/expressions/resolver.js';
import { createRenderEngine } from '../../src/renderer/engine.js';
import { createPrimitiveRegistry } from '../../src/renderer/registry.js';
import type { Spec, RenderNode } from '../../src/types.js';

/** Simple primitive renderer for testing */
function testRenderer(props: Record<string, unknown>, children: RenderNode[]): RenderNode {
  return { type: 'test', props, children };
}

function setup(initialState: Record<string, unknown>) {
  const store = createStateStore(initialState);
  const resolver = createResolver({ store });
  const registry = createPrimitiveRegistry();
  registry.register('stack', testRenderer);
  registry.register('box', testRenderer);
  registry.register('text', (props, children) => ({ type: 'text', props, children: children ?? [] }));
  const engine = createRenderEngine({ resolver, primitiveRegistry: registry });
  return { store, resolver, engine, registry };
}

describe('repeat.groupBy — client-side', () => {
  it('groups items by field and renders header + items + footer per group', () => {
    const { engine } = setup({
      products: [
        { id: 1, category: 'Fruit', name: 'Apple', price: 1 },
        { id: 2, category: 'Fruit', name: 'Banana', price: 2 },
        { id: 3, category: 'Veggie', name: 'Carrot', price: 3 },
      ],
    });

    const spec: Spec = {
      root: 'list',
      elements: {
        list: {
          type: 'stack',
          repeat: {
            source: { $state: '/products' } as unknown,
            key: 'id',
            groupBy: 'category',
            groupHeader: ['group-title'],
            groupFooter: ['group-count'],
          },
          children: ['item-row'],
        },
        'group-title': {
          type: 'text',
          props: { content: { $group: 'key' } },
        },
        'group-count': {
          type: 'text',
          props: { content: { $group: 'count' } },
        },
        'item-row': {
          type: 'text',
          props: { content: { $item: 'name' } },
        },
      },
    };

    const result = engine.render(spec);
    // The result is a stack wrapper with all nodes flat
    const nodes = result.children;

    // Group 1: Fruit header + 2 items + footer
    expect(nodes[0].props.content).toBe('Fruit');    // header
    expect(nodes[1].props.content).toBe('Apple');     // item
    expect(nodes[2].props.content).toBe('Banana');    // item
    expect(nodes[3].props.content).toBe(2);           // footer (count)

    // Group 2: Veggie header + 1 item + footer
    expect(nodes[4].props.content).toBe('Veggie');    // header
    expect(nodes[5].props.content).toBe('Carrot');    // item
    expect(nodes[6].props.content).toBe(1);           // footer (count)

    expect(nodes.length).toBe(7);
  });

  it('computes auto-aggregates (sum, avg, min, max)', () => {
    const { engine } = setup({
      items: [
        { cat: 'A', val: 10 },
        { cat: 'A', val: 20 },
        { cat: 'A', val: 30 },
        { cat: 'B', val: 5 },
      ],
    });

    const spec: Spec = {
      root: 'list',
      elements: {
        list: {
          type: 'stack',
          repeat: {
            source: { $state: '/items' } as unknown,
            key: 'val',
            groupBy: 'cat',
            groupFooter: ['agg'],
          },
          children: ['row'],
        },
        row: { type: 'text', props: { content: { $item: 'val' } } },
        agg: {
          type: 'box',
          props: {
            sum: { $group: 'sum', field: 'val' },
            avg: { $group: 'avg', field: 'val' },
            min: { $group: 'min', field: 'val' },
            max: { $group: 'max', field: 'val' },
          },
        },
      },
    };

    const result = engine.render(spec);
    const nodes = result.children;

    // Group A: 3 items + footer
    const aggA = nodes[3]; // footer for group A
    expect(aggA.props.sum).toBe(60);
    expect(aggA.props.avg).toBe(20);
    expect(aggA.props.min).toBe(10);
    expect(aggA.props.max).toBe(30);

    // Group B: 1 item + footer
    const aggB = nodes[5]; // footer for group B
    expect(aggB.props.sum).toBe(5);
  });

  it('preserves group order by first occurrence', () => {
    const { engine } = setup({
      items: [
        { cat: 'B', val: 1 },
        { cat: 'A', val: 2 },
        { cat: 'B', val: 3 },
      ],
    });

    const spec: Spec = {
      root: 'list',
      elements: {
        list: {
          type: 'stack',
          repeat: {
            source: { $state: '/items' } as unknown,
            groupBy: 'cat',
            groupHeader: ['header'],
          },
          children: ['row'],
        },
        header: { type: 'text', props: { content: { $group: 'key' } } },
        row: { type: 'text', props: { content: { $item: 'val' } } },
      },
    };

    const result = engine.render(spec);
    // B appears first in data, so B group renders first
    expect(result.children[0].props.content).toBe('B');
    expect(result.children[3].props.content).toBe('A');
  });
});

describe('repeat.groupBy — pre-grouped', () => {
  it('renders pre-grouped data with groupKey and groupItems', () => {
    const { engine } = setup({
      groups: [
        { name: 'Institution A', rows: [{ id: 1, amount: 100 }, { id: 2, amount: 200 }], subtotal: { total: 300 } },
        { name: 'Institution B', rows: [{ id: 3, amount: 50 }], subtotal: { total: 50 } },
      ],
    });

    const spec: Spec = {
      root: 'table',
      elements: {
        table: {
          type: 'stack',
          repeat: {
            source: { $state: '/groups' } as unknown,
            groupKey: 'name',
            groupItems: 'rows',
            groupHeader: ['inst-header'],
            groupFooter: ['inst-subtotal'],
          },
          children: ['data-row'],
        },
        'inst-header': {
          type: 'text',
          props: { content: { $group: 'key' } },
        },
        'inst-subtotal': {
          type: 'text',
          props: { content: { $group: 'subtotal.total' } },
        },
        'data-row': {
          type: 'text',
          props: { content: { $item: 'amount' } },
        },
      },
    };

    const result = engine.render(spec);
    const nodes = result.children;

    // Group 1: header + 2 rows + footer
    expect(nodes[0].props.content).toBe('Institution A');
    expect(nodes[1].props.content).toBe(100);
    expect(nodes[2].props.content).toBe(200);
    expect(nodes[3].props.content).toBe(300);  // subtotal.total via dot notation

    // Group 2: header + 1 row + footer
    expect(nodes[4].props.content).toBe('Institution B');
    expect(nodes[5].props.content).toBe(50);
    expect(nodes[6].props.content).toBe(50);   // subtotal.total

    expect(nodes.length).toBe(7);
  });

  it('renders global footer after all groups', () => {
    const { engine } = setup({
      groups: [
        { name: 'A', rows: [{ val: 10 }] },
      ],
      grandTotal: 999,
    });

    const spec: Spec = {
      root: 'table',
      elements: {
        table: {
          type: 'stack',
          repeat: {
            source: { $state: '/groups' } as unknown,
            groupKey: 'name',
            groupItems: 'rows',
            groupHeader: ['header'],
            footer: ['grand-total'],
          },
          children: ['row'],
        },
        header: { type: 'text', props: { content: { $group: 'key' } } },
        row: { type: 'text', props: { content: { $item: 'val' } } },
        'grand-total': {
          type: 'text',
          props: { content: { $state: '/grandTotal' } },
        },
      },
    };

    const result = engine.render(spec);
    const nodes = result.children;

    // header + 1 row + grand-total
    expect(nodes[0].props.content).toBe('A');
    expect(nodes[1].props.content).toBe(10);
    expect(nodes[2].props.content).toBe(999); // global footer reads normal state
  });
});

describe('repeat.groupBy — edge cases', () => {
  it('handles empty data gracefully', () => {
    const { engine } = setup({ items: [] });

    const spec: Spec = {
      root: 'list',
      elements: {
        list: {
          type: 'stack',
          repeat: {
            source: { $state: '/items' } as unknown,
            groupBy: 'category',
            groupHeader: ['header'],
          },
          children: ['row'],
        },
        header: { type: 'text', props: { content: { $group: 'key' } } },
        row: { type: 'text', props: { content: 'x' } },
      },
    };

    const result = engine.render(spec);
    expect(result.children.length).toBe(0);
  });

  it('$group.index is correct per group', () => {
    const { engine } = setup({
      items: [
        { cat: 'A', val: 1 },
        { cat: 'B', val: 2 },
        { cat: 'C', val: 3 },
      ],
    });

    const spec: Spec = {
      root: 'list',
      elements: {
        list: {
          type: 'stack',
          repeat: {
            source: { $state: '/items' } as unknown,
            groupBy: 'cat',
            groupHeader: ['header'],
          },
          children: ['row'],
        },
        header: {
          type: 'box',
          props: { idx: { $group: 'index' }, key: { $group: 'key' } },
        },
        row: { type: 'text', props: { content: 'x' } },
      },
    };

    const result = engine.render(spec);
    expect(result.children[0].props.idx).toBe(0);
    expect(result.children[0].props.key).toBe('A');
    expect(result.children[2].props.idx).toBe(1);
    expect(result.children[2].props.key).toBe('B');
    expect(result.children[4].props.idx).toBe(2);
    expect(result.children[4].props.key).toBe('C');
  });
});
