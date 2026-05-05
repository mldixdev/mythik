import { describe, it, expect } from 'vitest';
import { scanDeps, createRenderCache } from '../../src/renderer/deps.js';
import { parseLazyPath } from '../../src/renderer/lazy-paths.js';
import { createRenderEngine } from '../../src/renderer/engine.js';
import { createPrimitiveRegistry } from '../../src/renderer/registry.js';
import { createStateStore } from '../../src/state/store.js';
import { createResolver } from '../../src/expressions/resolver.js';
import { createElementRegistry } from '../../src/elements/composer.js';
import type { Spec } from '../../src/types.js';

function setup(initialState: Record<string, unknown> = {}) {
  const store = createStateStore(initialState);
  const resolver = createResolver({ store });
  const primitiveRegistry = createPrimitiveRegistry();
  for (const type of ['table', 'text', 'spatial-map']) {
    primitiveRegistry.register(type, (props, children) => ({ type, props, children }));
  }
  const elementRegistry = createElementRegistry();
  const engine = createRenderEngine({ resolver, primitiveRegistry, elementRegistry });
  return { engine, store };
}

const lazyOne = [parseLazyPath('columns[].actions[].onPress')];
const spatialLazy = [
  parseLazyPath('onItemPress'),
  parseLazyPath('onItemChange'),
  parseLazyPath('onZonePress'),
  parseLazyPath('onZoneChange'),
  parseLazyPath('onZoneShapeEditExit'),
  parseLazyPath('onCanvasPress'),
];

describe('scanDeps with lazyPaths', () => {
  it('skips $state inside lazy subtree', () => {
    const props = {
      columns: [{
        actions: [{
          onPress: { action: 'setState', params: { value: { $state: '/ui/selectedRow/id' } } },
        }],
      }],
    };
    const deps = scanDeps(props, lazyOne);
    expect(deps.has('/ui/selectedRow/id')).toBe(false);
  });

  it('still scans $state outside lazy subtree', () => {
    const props = {
      data: { $state: '/items' },
      columns: [{
        actions: [{
          onPress: { action: 'noop', params: { value: { $state: '/ui/selectedRow/id' } } },
        }],
      }],
    };
    const deps = scanDeps(props, lazyOne);
    expect(deps.has('/items')).toBe(true);
    expect(deps.has('/ui/selectedRow/id')).toBe(false);
  });

  it('default empty lazyPaths preserves prior behavior (backwards compat)', () => {
    const props = {
      columns: [{
        actions: [{
          onPress: { action: 'setState', params: { value: { $state: '/ui/selectedRow/id' } } },
        }],
      }],
    };
    const deps = scanDeps(props); // no second arg
    expect(deps.has('/ui/selectedRow/id')).toBe(true);
  });
});

describe('Render cache with lazyPaths', () => {
  it('does not invalidate cache when state path INSIDE lazy subtree changes', () => {
    const cache = createRenderCache();
    const lazyDeps = scanDeps({
      data: { $state: '/items' },
      columns: [{
        actions: [{
          onPress: { params: { value: { $state: '/ui/selectedRow/id' } } },
        }],
      }],
    }, lazyOne);

    cache.set('elem-1', { resolved: true } as Record<string, unknown>, lazyDeps);

    // State change at lazy-path-internal location should NOT invalidate
    expect(cache.isDirtyForPaths('elem-1', new Set(['/ui/selectedRow/id']))).toBe(false);
    // State change at out-of-lazy-path location SHOULD invalidate
    expect(cache.isDirtyForPaths('elem-1', new Set(['/items']))).toBe(true);
  });
});

describe('Engine resolveDeep via real spec (lazy column action stays raw)', () => {
  it('returns columns[].actions[].onPress as raw object reference at render', () => {
    const { engine } = setup();

    const rawAction = { action: 'setState', params: { value: { $state: '/ui/selectedRow/id' } } };

    const spec: Spec = {
      root: 'tbl-1',
      elements: {
        'tbl-1': {
          type: 'table',
          props: {
            data: [],
            columns: [{
              id: 'actions-col',
              label: '',
              actions: [{
                icon: 'pencil',
                onPress: rawAction,
              }],
            }],
          },
        },
      },
    };

    const tree = engine.render(spec);
    expect(tree).toBeDefined();
    const tableNode = tree as { type: string; props: { columns: Array<{ actions: Array<{ onPress: unknown }> }> } };
    const renderedAction = tableNode.props.columns[0].actions[0].onPress;
    // Reference equality assertion: raw object preserved through render
    expect(renderedAction).toBe(rawAction);
    // Negative: should NOT have been resolved into a primitive
    expect((renderedAction as { params: { value: unknown } }).params.value).toEqual({ $state: '/ui/selectedRow/id' });
  });

  it('still resolves $state in non-lazy props (regression check)', () => {
    const { engine } = setup({ items: ['a', 'b', 'c'] });

    const spec: Spec = {
      root: 'tbl-1',
      elements: {
        'tbl-1': {
          type: 'table',
          props: {
            data: { $state: '/items' },
            columns: [],
          },
        },
      },
    };

    const tree = engine.render(spec);
    const tableNode = tree as { type: string; props: { data: unknown } };
    expect(tableNode.props.data).toEqual(['a', 'b', 'c']);
  });
});

describe('Spatial map lazy action paths', () => {
  it('skips $state inside spatial-map onItemPress params', () => {
    const props = {
      items: { $state: '/layout/items' },
      onItemPress: {
        action: 'capture',
        params: { id: { $state: '/ui/selectedSpatialItem/itemId' } },
      },
    };

    const deps = scanDeps(props, spatialLazy);

    expect(deps.has('/layout/items')).toBe(true);
    expect(deps.has('/ui/selectedSpatialItem/itemId')).toBe(false);
  });

  it('skips $state inside spatial-map onCanvasPress params', () => {
    const props = {
      items: { $state: '/layout/items' },
      onCanvasPress: {
        action: 'capture',
        params: { mode: { $state: '/ui/spatialMode' } },
      },
    };

    const deps = scanDeps(props, spatialLazy);

    expect(deps.has('/layout/items')).toBe(true);
    expect(deps.has('/ui/spatialMode')).toBe(false);
  });

  it('skips $state inside spatial-map onItemChange params', () => {
    const props = {
      items: { $state: '/layout/items' },
      onItemChange: {
        action: 'setState',
        params: { value: { $state: '/ui/spatialItemChange/nextItem' } },
      },
    };

    const deps = scanDeps(props, spatialLazy);

    expect(deps.has('/layout/items')).toBe(true);
    expect(deps.has('/ui/spatialItemChange/nextItem')).toBe(false);
  });

  it('skips $state inside spatial-map zone action params', () => {
    const props = {
      zones: { $state: '/layout/zones' },
      onZonePress: {
        action: 'capture',
        params: { id: { $state: '/ui/selectedSpatialZone/zoneId' } },
      },
      onZoneChange: {
        action: 'setState',
        params: { value: { $state: '/ui/spatialZoneChange/nextZone' } },
      },
    };

    const deps = scanDeps(props, spatialLazy);

    expect(deps.has('/layout/zones')).toBe(true);
    expect(deps.has('/ui/selectedSpatialZone/zoneId')).toBe(false);
    expect(deps.has('/ui/spatialZoneChange/nextZone')).toBe(false);
  });

  it('keeps spatial-map onItemPress raw at render time', () => {
    const { engine } = setup({ layout: { items: [] } });
    const rawAction = {
      action: 'capture',
      params: { id: { $state: '/ui/selectedSpatialItem/itemId' } },
    };

    const spec: Spec = {
      root: 'map',
      elements: {
        map: {
          type: 'spatial-map',
          props: {
            viewBox: { x: 0, y: 0, width: 1000, height: 600 },
            items: { $state: '/layout/items' },
            onItemPress: rawAction,
          },
        },
      },
    };

    const tree = engine.render(spec) as { type: string; props: { onItemPress: unknown; items: unknown } };

    expect(tree.props.items).toEqual([]);
    expect(tree.props.onItemPress).toBe(rawAction);
    expect((tree.props.onItemPress as { params: { id: unknown } }).params.id).toEqual({
      $state: '/ui/selectedSpatialItem/itemId',
    });
  });

  it('keeps spatial-map onItemChange raw at render time', () => {
    const { engine } = setup({
      layout: { items: [] },
      ui: { spatialItemChange: { nextItem: { id: 'already-resolved' } } },
    });
    const rawAction = {
      action: 'setState',
      params: {
        statePath: '/data/layout/items',
        value: { $state: '/ui/spatialItemChange/nextItem' },
      },
    };

    const spec: Spec = {
      root: 'map',
      elements: {
        map: {
          type: 'spatial-map',
          props: {
            viewBox: { x: 0, y: 0, width: 1000, height: 600 },
            items: { $state: '/layout/items' },
            onItemChange: rawAction,
          },
        },
      },
    };

    const tree = engine.render(spec) as { type: string; props: { onItemChange: unknown; items: unknown } };

    expect(tree.props.items).toEqual([]);
    expect(tree.props.onItemChange).toBe(rawAction);
    expect((tree.props.onItemChange as { params: { value: unknown } }).params.value).toEqual({
      $state: '/ui/spatialItemChange/nextItem',
    });
  });

  it('keeps spatial-map onZoneChange raw at render time', () => {
    const { engine } = setup({
      layout: { zones: [] },
      ui: { spatialZoneChange: { nextZone: { id: 'already-resolved' } } },
    });
    const rawAction = {
      action: 'setState',
      params: {
        statePath: '/data/layout/zones',
        value: { $state: '/ui/spatialZoneChange/nextZone' },
      },
    };

    const spec: Spec = {
      root: 'map',
      elements: {
        map: {
          type: 'spatial-map',
          props: {
            viewBox: { x: 0, y: 0, width: 1000, height: 600 },
            zones: { $state: '/layout/zones' },
            onZoneChange: rawAction,
          },
        },
      },
    };

    const tree = engine.render(spec) as { type: string; props: { onZoneChange: unknown; zones: unknown } };

    expect(tree.props.zones).toEqual([]);
    expect(tree.props.onZoneChange).toBe(rawAction);
    expect((tree.props.onZoneChange as { params: { value: unknown } }).params.value).toEqual({
      $state: '/ui/spatialZoneChange/nextZone',
    });
  });

  it('keeps spatial-map onZoneShapeEditExit raw at render time', () => {
    const { engine } = setup({
      ui: { zoneShapeEditId: 'zone-a' },
    });
    const rawAction = {
      action: 'setState',
      params: {
        statePath: '/ui/zoneShapeEditId',
        value: { $state: '/ui/zoneShapeEditId' },
      },
    };

    const spec: Spec = {
      root: 'map',
      elements: {
        map: {
          type: 'spatial-map',
          props: {
            viewBox: { x: 0, y: 0, width: 1000, height: 600 },
            onZoneShapeEditExit: rawAction,
          },
        },
      },
    };

    const tree = engine.render(spec) as { type: string; props: { onZoneShapeEditExit: unknown } };

    expect(tree.props.onZoneShapeEditExit).toBe(rawAction);
    expect((tree.props.onZoneShapeEditExit as { params: { value: unknown } }).params.value).toEqual({
      $state: '/ui/zoneShapeEditId',
    });
  });
});
