// Task 13 — Template.animations field + resolveDeep (unified) traversal.
//
// Pins that a spec-level template with `animations` (and `$prop.X` references
// inside) gets interpolated against the consuming element's props, and that
// the resolved animations object reaches the primitive renderer as a prop
// (where Box/Text/etc. can plumb it to the cascade hook).

import { describe, it, expect } from 'vitest';
import { createRenderEngine } from '../../src/renderer/engine.js';
import { createPrimitiveRegistry } from '../../src/renderer/registry.js';
import { createStateStore } from '../../src/state/store.js';
import { createResolver } from '../../src/expressions/resolver.js';
import type { Spec } from '../../src/types.js';

function setup(spec: Spec, initialState: Record<string, unknown> = {}) {
  const store = createStateStore(initialState);
  const resolver = createResolver({ store });
  const primitiveRegistry = createPrimitiveRegistry();
  for (const type of ['stack', 'text', 'box']) {
    primitiveRegistry.register(type, (props, children) => ({ type, props, children }));
  }
  const engine = createRenderEngine({ resolver, primitiveRegistry });
  return { engine, store };
}

describe('Template.animations — $prop interpolation + cascade-ready shape', () => {
  it('interpolates recipe name from $prop.mountRecipe using template defaults', () => {
    const spec: Spec = {
      root: 'root',
      templates: {
        'hero-card': {
          type: 'box',
          animations: {
            mount: { recipe: { $prop: 'mountRecipe' } },
          },
          defaults: { mountRecipe: 'scale-in' },
        },
      },
      elements: {
        root: { type: 'stack', children: ['card'] },
        card: { type: 'hero-card' },
      },
    };
    const { engine } = setup(spec);
    const tree = engine.render(spec);
    const card = tree.children[0];
    expect(card.type).toBe('box');
    expect(card.props.animations).toEqual({ mount: { recipe: 'scale-in' } });
  });

  it('consuming element props override template defaults for $prop', () => {
    const spec: Spec = {
      root: 'root',
      templates: {
        'hero-card': {
          type: 'box',
          animations: {
            mount: { recipe: { $prop: 'mountRecipe' } },
          },
          defaults: { mountRecipe: 'scale-in' },
        },
      },
      elements: {
        root: { type: 'stack', children: ['card'] },
        card: { type: 'hero-card', props: { mountRecipe: 'fade-up' } },
      },
    };
    const { engine } = setup(spec);
    const tree = engine.render(spec);
    expect(tree.children[0].props.animations).toEqual({ mount: { recipe: 'fade-up' } });
  });

  it('preserves non-interpolated fields (duration, iterations, direction)', () => {
    const spec: Spec = {
      root: 'root',
      templates: {
        'pulser': {
          type: 'box',
          animations: {
            ambient: {
              recipe: { $prop: 'ambientRecipe' },
              duration: '2s',
              iterations: 'infinite',
              direction: 'alternate',
            },
          },
          defaults: { ambientRecipe: 'pulse' },
        },
      },
      elements: {
        root: { type: 'stack', children: ['p'] },
        p: { type: 'pulser' },
      },
    };
    const { engine } = setup(spec);
    const tree = engine.render(spec);
    expect(tree.children[0].props.animations).toEqual({
      ambient: {
        recipe: 'pulse',
        duration: '2s',
        iterations: 'infinite',
        direction: 'alternate',
      },
    });
  });

  it('resolves multiple triggers independently', () => {
    const spec: Spec = {
      root: 'root',
      templates: {
        'interactive': {
          type: 'box',
          animations: {
            mount: { recipe: { $prop: 'mountRecipe' } },
            hover: { recipe: 'lift' },
          },
          defaults: { mountRecipe: 'scale-in' },
        },
      },
      elements: {
        root: { type: 'stack', children: ['i'] },
        i: { type: 'interactive' },
      },
    };
    const { engine } = setup(spec);
    const tree = engine.render(spec);
    expect(tree.children[0].props.animations).toEqual({
      mount: { recipe: 'scale-in' },
      hover: { recipe: 'lift' },
    });
  });

  it('whole-field animations: null passes through (cascade-neutral)', () => {
    const spec: Spec = {
      root: 'root',
      templates: {
        'static-card': {
          type: 'box',
          animations: null,
        },
      },
      elements: {
        root: { type: 'stack', children: ['s'] },
        s: { type: 'static-card' },
      },
    };
    const { engine } = setup(spec);
    const tree = engine.render(spec);
    expect(tree.children[0].props.animations).toBeNull();
  });

  it('per-trigger null cascades to null (Task 15 integration: template-level null with no prior level collapses to null result)', () => {
    const spec: Spec = {
      root: 'root',
      templates: {
        'no-hover': {
          type: 'box',
          animations: {
            hover: null,
          },
        },
      },
      elements: {
        root: { type: 'stack', children: ['n'] },
        n: { type: 'no-hover' },
      },
    };
    const { engine } = setup(spec);
    const tree = engine.render(spec);
    // Post-Task-15: template branch runs mergeElementAnimations
    // (identity + template). With no identity and template {hover: null},
    // merge returns null (null-stripping collapses empty result). This is
    // the correct cascade semantic — per-trigger null means "disable" and
    // the merge with nothing-to-inherit yields no animations.
    expect(tree.children[0].props.animations).toBeNull();
  });

  it('non-$prop expressions ($state / $cond) resolve inside animations too', () => {
    const spec: Spec = {
      root: 'root',
      templates: {
        'state-aware': {
          type: 'box',
          animations: {
            mount: {
              recipe: { $state: '/cfg/defaultRecipe' },
              duration: {
                $cond: { $state: '/cfg/fast' },
                $then: '100ms',
                $else: '300ms',
              },
            },
          },
        },
      },
      elements: {
        root: { type: 'stack', children: ['s'] },
        s: { type: 'state-aware' },
      },
    };
    const { engine } = setup(spec, { cfg: { defaultRecipe: 'fade-up', fast: true } });
    const tree = engine.render(spec);
    expect(tree.children[0].props.animations).toEqual({
      mount: { recipe: 'fade-up', duration: '100ms' },
    });
  });

  it('template without animations field produces no animations prop on render', () => {
    const spec: Spec = {
      root: 'root',
      templates: {
        'plain': {
          type: 'box',
          props: { label: { $prop: 'label' } },
          defaults: { label: 'hi' },
        },
      },
      elements: {
        root: { type: 'stack', children: ['p'] },
        p: { type: 'plain' },
      },
    };
    const { engine } = setup(spec);
    const tree = engine.render(spec);
    // `animations` key should not appear on the rendered props at all when
    // the template doesn't declare it — the renderer only emits it when the
    // field is present.
    expect(tree.children[0].props).not.toHaveProperty('animations');
  });
});
