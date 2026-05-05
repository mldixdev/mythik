import { describe, it, expect } from 'vitest';
import { scanDeps, createRenderCache } from '../../src/renderer/deps.js';
import { createStateStore } from '../../src/state/store.js';
import { createResolver } from '../../src/expressions/resolver.js';
import { createRenderEngine } from '../../src/renderer/engine.js';
import { createPrimitiveRegistry } from '../../src/renderer/registry.js';
import type { Spec } from '../../src/types.js';

describe('scanDeps', () => {
  it('finds $state paths in props', () => {
    const deps = scanDeps({
      content: { $state: '/user/name' },
      style: { color: 'red' },
    });
    expect(deps).toEqual(new Set(['/user/name']));
  });

  it('finds $bindState paths', () => {
    const deps = scanDeps({
      value: { $bindState: '/form/title' },
    });
    expect(deps).toEqual(new Set(['/form/title']));
  });

  it('finds nested $state paths in $cond/$then/$else', () => {
    const deps = scanDeps({
      color: {
        $cond: { $state: '/status', eq: 'active' },
        $then: 'green',
        $else: 'gray',
      },
    });
    expect(deps).toEqual(new Set(['/status']));
  });

  it('finds $state paths inside arrays', () => {
    const deps = scanDeps({
      disabled: { $or: [{ $not: { $state: '/form/name' } }, { $state: '/ui/loading' }] },
    });
    expect(deps).toEqual(new Set(['/form/name', '/ui/loading']));
  });

  it('finds $state in $template expressions', () => {
    const deps = scanDeps({
      content: { $template: '${/user/name} has ${/count} items' },
    });
    expect(deps).toEqual(new Set(['/user/name', '/count']));
  });

  it('returns empty set for static props', () => {
    const deps = scanDeps({
      content: 'Hello',
      style: { fontSize: 14, color: 'blue' },
    });
    expect(deps).toEqual(new Set());
  });

  it('always includes /preferences/theme for elements with $token', () => {
    const deps = scanDeps({
      style: { color: { $token: 'colors.primary' } },
    });
    expect(deps).toEqual(new Set(['/preferences/theme']));
  });
});

describe('RenderCache', () => {
  it('stores and retrieves cached props', () => {
    const cache = createRenderCache();
    const props = { content: 'Hello' };
    const deps = new Set(['/title']);

    cache.set('heading', props, deps);

    expect(cache.get('heading')).toBe(props);
    expect(cache.getDeps('heading')).toBe(deps);
  });

  it('returns undefined for uncached elements', () => {
    const cache = createRenderCache();
    expect(cache.get('unknown')).toBeUndefined();
  });

  it('isDirty returns true when dep overlaps changedPath', () => {
    const cache = createRenderCache();
    cache.set('el', {}, new Set(['/user/name']));

    expect(cache.isDirty('el', '/user/name')).toBe(true);
    expect(cache.isDirty('el', '/user')).toBe(true);
    expect(cache.isDirty('el', '/user/name/first')).toBe(true);
    expect(cache.isDirty('el', '/count')).toBe(false);
  });

  it('isDirty returns true for uncached elements', () => {
    const cache = createRenderCache();
    expect(cache.isDirty('unknown', '/x')).toBe(true);
  });

  it('isDirtyForPaths checks multiple paths', () => {
    const cache = createRenderCache();
    cache.set('el', {}, new Set(['/user/name']));

    expect(cache.isDirtyForPaths('el', new Set(['/count', '/user/name']))).toBe(true);
    expect(cache.isDirtyForPaths('el', new Set(['/count', '/other']))).toBe(false);
  });
});

describe('Engine incremental render', () => {
  function setup(initialState: Record<string, unknown> = {}) {
    const store = createStateStore(initialState);
    const resolver = createResolver({ store });
    const registry = createPrimitiveRegistry();
    registry.register('text', (props, children) => ({
      type: 'text', props: { _component: null, ...props }, children, key: undefined,
    }));
    registry.register('stack', (props, children) => ({
      type: 'stack', props: { _component: null, ...props }, children, key: undefined,
    }));
    const engine = createRenderEngine({ resolver, primitiveRegistry: registry });
    return { store, engine };
  }

  it('keeps old value for clean elements and updates dirty ones', () => {
    const { store, engine } = setup({ title: 'Hello', count: 0 });
    const spec: Spec = {
      root: 'page',
      elements: {
        page: { type: 'stack', children: ['heading', 'counter'] },
        heading: { type: 'text', props: { content: { $state: '/title' } } },
        counter: { type: 'text', props: { content: { $state: '/count' } } },
      },
    };

    engine.render(spec);
    store.set('/count', 42);
    const tree2 = engine.render(spec, new Set(['/count']));

    // heading depends on /title, not /count → clean → keeps old value
    expect(tree2.children[0].props.content).toBe('Hello');
    // counter depends on /count → dirty → gets new value
    expect(tree2.children[1].props.content).toBe(42);
  });

  it('works correctly on first render with changedPaths (no cache)', () => {
    const { engine } = setup({ x: 1 });
    const spec: Spec = {
      root: 'el',
      elements: { el: { type: 'text', props: { content: { $state: '/x' } } } },
    };
    const tree = engine.render(spec, new Set(['/x']));
    expect(tree.props.content).toBe(1);
  });

  it('invalidates on parent path change', () => {
    const { store, engine } = setup({ user: { name: 'Alice' } });
    const spec: Spec = {
      root: 'page',
      elements: {
        page: { type: 'stack', children: ['name'] },
        name: { type: 'text', props: { content: { $state: '/user/name' } } },
      },
    };

    engine.render(spec);
    store.set('/user', { name: 'Bob' });
    const tree2 = engine.render(spec, new Set(['/user']));
    expect(tree2.children[0].props.content).toBe('Bob');
  });

  it('skips static elements (no state deps)', () => {
    const { store, engine } = setup({ count: 0 });
    const spec: Spec = {
      root: 'page',
      elements: {
        page: { type: 'stack', children: ['label', 'counter'] },
        label: { type: 'text', props: { content: 'Static label' } },
        counter: { type: 'text', props: { content: { $state: '/count' } } },
      },
    };

    engine.render(spec);
    store.set('/count', 99);
    const tree2 = engine.render(spec, new Set(['/count']));

    // Static label → always clean → still shows same content
    expect(tree2.children[0].props.content).toBe('Static label');
    // Counter → dirty → updated value
    expect(tree2.children[1].props.content).toBe(99);
  });
});
