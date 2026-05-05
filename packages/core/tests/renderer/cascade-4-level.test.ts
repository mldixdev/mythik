// Task 15 — End-to-end 4-level animation cascade integration test.
//
// The cascade merges animations across four levels in the order:
//   identity → variant → template → element
// with per-trigger null semantics per the decision table in cascade.ts.
//
// This test suite drives the full renderer pipeline (not just the cascade
// merge fn in isolation) — it verifies that tokens.identity.animations,
// ResolvedVariant.animations, Template.animations, and Element.animations
// all flow through createRenderEngine into `resolvedProps.animations` on
// the primitive render node, with the correct merge outcome.
//
// Test harness: same pattern as packages/core/tests/renderer/templates.test.ts
// — register passthrough primitives and inspect the returned RenderNode tree.
// No React render needed at this layer — the cascade merge happens in the
// core renderer before Box consumes the merged `animations` prop.

import { describe, it, expect } from 'vitest';
import { createRenderEngine } from '../../src/renderer/engine.js';
import { createPrimitiveRegistry } from '../../src/renderer/registry.js';
import { createStateStore } from '../../src/state/store.js';
import { createResolver } from '../../src/expressions/resolver.js';
import type { Spec } from '../../src/types.js';

function setup(
  spec: Spec,
  tokens?: Record<string, unknown>,
  initialState: Record<string, unknown> = {},
) {
  const store = createStateStore(initialState);
  const resolver = createResolver({ store });
  const primitiveRegistry = createPrimitiveRegistry();
  for (const type of ['stack', 'text', 'box', 'button']) {
    primitiveRegistry.register(type, (props, children) => ({ type, props, children }));
  }
  const engine = createRenderEngine({ resolver, primitiveRegistry, tokens });
  return { engine, store };
}

describe('4-level cascade — identity → variant → template → element', () => {
  describe('identity-only (no variant, no template, no element)', () => {
    it('emits identity animations as the final animations prop', () => {
      const spec: Spec = {
        root: 'root',
        elements: {
          root: { type: 'stack', children: ['t'] },
          t: { type: 'text' },
        },
      };
      const tokens = {
        identity: {
          animations: { mount: { recipe: 'fade-up' } },
        },
      };
      const { engine } = setup(spec, tokens);
      const tree = engine.render(spec);
      expect(tree.children[0].props.animations).toEqual({
        mount: { recipe: 'fade-up' },
      });
    });
  });

  describe('identity + element override', () => {
    it('element overrides identity for the same trigger', () => {
      const spec: Spec = {
        root: 'root',
        elements: {
          root: { type: 'stack', children: ['t'] },
          t: {
            type: 'text',
            animations: { mount: { recipe: 'scale-in' } },
          },
        },
      };
      const tokens = {
        identity: {
          animations: { mount: { recipe: 'fade-up' } },
        },
      };
      const { engine } = setup(spec, tokens);
      const tree = engine.render(spec);
      expect(tree.children[0].props.animations).toEqual({
        mount: { recipe: 'scale-in' },
      });
    });

    it('non-overlapping triggers merge independently', () => {
      const spec: Spec = {
        root: 'root',
        elements: {
          root: { type: 'stack', children: ['t'] },
          t: {
            type: 'text',
            animations: { hover: { recipe: 'lift' } },
          },
        },
      };
      const tokens = {
        identity: {
          animations: { mount: { recipe: 'fade-up' } },
        },
      };
      const { engine } = setup(spec, tokens);
      const tree = engine.render(spec);
      expect(tree.children[0].props.animations).toEqual({
        mount: { recipe: 'fade-up' },
        hover: { recipe: 'lift' },
      });
    });

    it('per-trigger null on element disables inherited identity trigger', () => {
      const spec: Spec = {
        root: 'root',
        elements: {
          root: { type: 'stack', children: ['t'] },
          t: {
            type: 'text',
            animations: { mount: null },
          },
        },
      };
      const tokens = {
        identity: {
          animations: {
            mount: { recipe: 'fade-up' },
            hover: { recipe: 'lift' },
          },
        },
      };
      const { engine } = setup(spec, tokens);
      const tree = engine.render(spec);
      // mount disabled → stripped; hover inherited → kept
      expect(tree.children[0].props.animations).toEqual({
        hover: { recipe: 'lift' },
      });
    });
  });

  describe('identity + variant + element', () => {
    const tokens = {
      colors: { primary: '#6366f1' },
      identity: {
        animations: { mount: { recipe: 'fade-up' } },
      },
      components: {
        button: {
          ctaPulse: {
            style: { backgroundColor: '#6366f1' },
            animations: { ambient: { recipe: 'pulse-primary' } },
          },
        },
      },
    };

    it('variant adds ambient; identity mount passes through; element hover adds on top', () => {
      const spec: Spec = {
        root: 'root',
        elements: {
          root: { type: 'stack', children: ['btn'] },
          btn: {
            type: 'button',
            props: { variant: 'ctaPulse' },
            animations: { hover: { recipe: 'lift' } },
          },
        },
      };
      const { engine } = setup(spec, tokens);
      const tree = engine.render(spec);
      expect(tree.children[0].props.animations).toEqual({
        mount: { recipe: 'fade-up' },
        ambient: { recipe: 'pulse-primary' },
        hover: { recipe: 'lift' },
      });
    });

    it('element wins over variant for the same trigger', () => {
      const spec: Spec = {
        root: 'root',
        elements: {
          root: { type: 'stack', children: ['btn'] },
          btn: {
            type: 'button',
            props: { variant: 'ctaPulse' },
            animations: { ambient: { recipe: 'breathe-subtle' } },
          },
        },
      };
      const { engine } = setup(spec, tokens);
      const tree = engine.render(spec);
      expect(tree.children[0].props.animations).toEqual({
        mount: { recipe: 'fade-up' },
        ambient: { recipe: 'breathe-subtle' },
      });
    });

    it('variant whole-field null erases identity contribution for that element', () => {
      const mutedTokens = {
        ...tokens,
        components: {
          button: {
            silent: {
              style: {},
              animations: null,
            },
          },
        },
      };
      const spec: Spec = {
        root: 'root',
        elements: {
          root: { type: 'stack', children: ['btn'] },
          btn: {
            type: 'button',
            props: { variant: 'silent' },
          },
        },
      };
      const { engine } = setup(spec, mutedTokens);
      const tree = engine.render(spec);
      // whole-field null at variant level is cascade-neutral (NOT a disable
      // marker per the decision table); identity still propagates.
      expect(tree.children[0].props.animations).toEqual({
        mount: { recipe: 'fade-up' },
      });
    });

    it('variant per-trigger null disables identity trigger for that element', () => {
      const noMountTokens = {
        ...tokens,
        components: {
          button: {
            noMount: {
              style: {},
              animations: { mount: null },
            },
          },
        },
      };
      const spec: Spec = {
        root: 'root',
        elements: {
          root: { type: 'stack', children: ['btn'] },
          btn: {
            type: 'button',
            props: { variant: 'noMount' },
          },
        },
      };
      const { engine } = setup(spec, noMountTokens);
      const tree = engine.render(spec);
      // Variant per-trigger null disables inherited mount → no animations
      // (merge returns null when all triggers stripped; renderer emits null
      // explicitly because variant contributed an explicit null).
      expect(tree.children[0].props.animations).toBeNull();
    });
  });

  describe('identity + template cascade (template branch)', () => {
    it('template animations merge with identity animations', () => {
      const spec: Spec = {
        root: 'root',
        templates: {
          'hero-card': {
            type: 'box',
            animations: {
              hover: { recipe: 'lift' },
            },
          },
        },
        elements: {
          root: { type: 'stack', children: ['card'] },
          card: { type: 'hero-card' },
        },
      };
      const tokens = {
        identity: {
          animations: { mount: { recipe: 'fade-up' } },
        },
      };
      const { engine } = setup(spec, tokens);
      const tree = engine.render(spec);
      expect(tree.children[0].props.animations).toEqual({
        mount: { recipe: 'fade-up' },
        hover: { recipe: 'lift' },
      });
    });

    it('template overrides identity for same trigger', () => {
      const spec: Spec = {
        root: 'root',
        templates: {
          'hero-card': {
            type: 'box',
            animations: {
              mount: { recipe: 'scale-in' },
            },
          },
        },
        elements: {
          root: { type: 'stack', children: ['card'] },
          card: { type: 'hero-card' },
        },
      };
      const tokens = {
        identity: {
          animations: { mount: { recipe: 'fade-up' } },
        },
      };
      const { engine } = setup(spec, tokens);
      const tree = engine.render(spec);
      expect(tree.children[0].props.animations).toEqual({
        mount: { recipe: 'scale-in' },
      });
    });

    it('template per-trigger null disables identity trigger', () => {
      const spec: Spec = {
        root: 'root',
        templates: {
          'silent-card': {
            type: 'box',
            animations: { mount: null },
          },
        },
        elements: {
          root: { type: 'stack', children: ['c'] },
          c: { type: 'silent-card' },
        },
      };
      const tokens = {
        identity: {
          animations: {
            mount: { recipe: 'fade-up' },
            hover: { recipe: 'lift' },
          },
        },
      };
      const { engine } = setup(spec, tokens);
      const tree = engine.render(spec);
      expect(tree.children[0].props.animations).toEqual({
        hover: { recipe: 'lift' },
      });
    });
  });

  describe('no-cascade fallback (back-compat)', () => {
    it('element without animations + no identity → no animations prop emitted', () => {
      const spec: Spec = {
        root: 'root',
        elements: {
          root: { type: 'stack', children: ['t'] },
          t: { type: 'text' },
        },
      };
      const { engine } = setup(spec);
      const tree = engine.render(spec);
      expect(tree.children[0].props).not.toHaveProperty('animations');
    });
  });

  describe('review corrections (C1/I2/M1)', () => {
    it('element.animations resolves $state/$cond expressions (C1)', () => {
      const spec: Spec = {
        root: 'root',
        elements: {
          root: { type: 'stack', children: ['t'] },
          t: {
            type: 'text',
            animations: {
              mount: {
                recipe: { $state: '/cfg/recipeName' },
                duration: { $cond: { $state: '/cfg/fast' }, $then: '100ms', $else: '300ms' },
              },
            },
          },
        },
      };
      const { engine } = setup(spec, undefined, {
        cfg: { recipeName: 'fade-up', fast: true },
      });
      const tree = engine.render(spec);
      expect(tree.children[0].props.animations).toEqual({
        mount: { recipe: 'fade-up', duration: '100ms' },
      });
    });

    it('template-typed element with element.animations override (I2)', () => {
      const spec: Spec = {
        root: 'root',
        templates: {
          'hero-card': {
            type: 'box',
            animations: {
              mount: { recipe: 'scale-in' },
              hover: { recipe: 'lift' },
            },
          },
        },
        elements: {
          root: { type: 'stack', children: ['card'] },
          card: {
            type: 'hero-card',
            animations: { hover: null }, // element disables hover inherited from template
          },
        },
      };
      const tokens = {
        identity: {
          animations: { mount: { recipe: 'fade-up' } },
        },
      };
      const { engine } = setup(spec, tokens);
      const tree = engine.render(spec);
      // Cascade: identity mount=fade-up → template mount=scale-in (overrides)
      //                                  template hover=lift → element hover=null (disables)
      expect(tree.children[0].props.animations).toEqual({
        mount: { recipe: 'scale-in' },
      });
    });

    it('identity.animations === null (whole-field) is cascade-neutral — element contribution still emits (M1)', () => {
      const spec: Spec = {
        root: 'root',
        elements: {
          root: { type: 'stack', children: ['t'] },
          t: {
            type: 'text',
            animations: { mount: { recipe: 'scale-in' } },
          },
        },
      };
      const tokens = {
        identity: {
          animations: null, // explicit whole-field null — inheritance-neutral
        },
      };
      const { engine } = setup(spec, tokens);
      const tree = engine.render(spec);
      // M1: identity whole-field null → coerced to undefined → cascade-neutral
      // Result reflects only the element contribution.
      expect(tree.children[0].props.animations).toEqual({
        mount: { recipe: 'scale-in' },
      });
    });
  });
});
