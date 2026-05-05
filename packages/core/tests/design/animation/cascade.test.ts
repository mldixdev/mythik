import { describe, it, expect } from 'vitest';
import { mergeElementAnimations } from '../../../src/design/animation/cascade.js';

describe('mergeElementAnimations', () => {
  describe('empty cases', () => {
    it('returns null when all levels undefined', () => {
      expect(mergeElementAnimations({})).toBeNull();
    });

    it('returns null when all levels null', () => {
      expect(
        mergeElementAnimations({
          identity: null,
          variant: null,
          template: null,
          element: null,
        }),
      ).toBeNull();
    });

    it('returns null when element is empty object {}', () => {
      expect(mergeElementAnimations({ element: {} })).toBeNull();
    });
  });

  describe('single-level inheritance', () => {
    it('identity-only cascades through', () => {
      const result = mergeElementAnimations({
        identity: { mount: { recipe: 'fade-up' } },
      });
      expect(result).toEqual({ mount: { recipe: 'fade-up' } });
    });

    it('element-only is returned as-is', () => {
      const result = mergeElementAnimations({
        element: { hover: { recipe: 'lift' } },
      });
      expect(result).toEqual({ hover: { recipe: 'lift' } });
    });
  });

  describe('null-disable smoke (contract seal)', () => {
    // Scaffold-level assertion to lock the contract before Task 2/3 expansions.
    // Task 3 covers exhaustive null semantics per the decision table in the design spec.
    it('element null strips trigger inherited from identity', () => {
      const result = mergeElementAnimations({
        identity: { hover: { recipe: 'lift' } },
        element: { hover: null },
      });
      expect(result).toBeNull();
    });
  });

  describe('override semantics (no null)', () => {
    it('variant overrides identity per-trigger', () => {
      const result = mergeElementAnimations({
        identity: { mount: { recipe: 'fade-up' } },
        variant: { mount: { recipe: 'lift' } },
      });
      expect(result).toEqual({ mount: { recipe: 'lift' } });
    });

    it('template overrides variant and identity', () => {
      const result = mergeElementAnimations({
        identity: { mount: { recipe: 'fade-up' } },
        variant: { mount: { recipe: 'lift' } },
        template: { mount: { recipe: 'scale-in' } },
      });
      expect(result).toEqual({ mount: { recipe: 'scale-in' } });
    });

    it('element always wins last', () => {
      const result = mergeElementAnimations({
        identity: { mount: { recipe: 'fade-up' } },
        variant: { mount: { recipe: 'lift' } },
        template: { mount: { recipe: 'scale-in' } },
        element: { mount: { recipe: 'pop' } },
      });
      expect(result).toEqual({ mount: { recipe: 'pop' } });
    });

    it('different triggers merge additively across levels', () => {
      const result = mergeElementAnimations({
        identity: { mount: { recipe: 'fade-up' } },
        variant: { ambient: { recipe: 'pulse-primary' } },
        template: { hover: { recipe: 'lift' } },
        element: { focus: { recipe: 'glow' } },
      });
      expect(result).toEqual({
        mount: { recipe: 'fade-up' },
        ambient: { recipe: 'pulse-primary' },
        hover: { recipe: 'lift' },
        focus: { recipe: 'glow' },
      });
    });

    it('partial override replaces entire trigger value (not field-level merge)', () => {
      const result = mergeElementAnimations({
        identity: { mount: { recipe: 'fade', duration: '200ms', delay: '50ms' } },
        element: { mount: { recipe: 'scale-in' } },
      });
      // Element-level object replaces whole trigger value — no deep merge of duration/delay
      expect(result).toEqual({ mount: { recipe: 'scale-in' } });
    });

    it('array-valued trigger is replaced whole by scalar override (no array merge)', () => {
      const result = mergeElementAnimations({
        identity: { mount: [{ recipe: 'fade' }, { recipe: 'slide-left' }] },
        element: { mount: { recipe: 'scale-in' } },
      });
      expect(result).toEqual({ mount: { recipe: 'scale-in' } });
    });

    it('scalar trigger replaced by array override (reverse direction)', () => {
      const result = mergeElementAnimations({
        identity: { mount: { recipe: 'fade' } },
        element: { mount: [{ recipe: 'fade-up' }, { recipe: 'slide-right' }] },
      });
      expect(result).toEqual({
        mount: [{ recipe: 'fade-up' }, { recipe: 'slide-right' }],
      });
    });

    it('stateChange preserves its distinct value shape through the cascade', () => {
      const result = mergeElementAnimations({
        identity: {
          stateChange: { watch: '/count', on: 'change', recipe: 'pop', duration: '200ms' },
        },
        element: {
          stateChange: { watch: '/count', on: 'increase', recipe: 'pulse-primary', duration: '300ms' },
        },
      });
      // Element override wins; StateChangeAnimation shape (not AnimationRef) preserved
      expect(result).toEqual({
        stateChange: { watch: '/count', on: 'increase', recipe: 'pulse-primary', duration: '300ms' },
      });
    });
  });

  // Exhaustive null-semantics tests that pin the public animation decision table.
  describe('null semantics — per-trigger disable (decision table)', () => {
    // Row: identity=fade, variant=null → disabled
    it('variant null disables inherited identity trigger', () => {
      const result = mergeElementAnimations({
        identity: { hover: { recipe: 'lift' } },
        variant: { hover: null },
      });
      expect(result).toBeNull();
    });

    // Row: identity=fade, variant=null, template=scale → template re-enables
    it('template re-enables after variant disabled (later non-null wins)', () => {
      const result = mergeElementAnimations({
        identity: { mount: { recipe: 'fade-up' } },
        variant: { mount: null },
        template: { mount: { recipe: 'scale-in' } },
      });
      expect(result).toEqual({ mount: { recipe: 'scale-in' } });
    });

    it('template null after variant non-null disables again', () => {
      const result = mergeElementAnimations({
        identity: { mount: { recipe: 'fade-up' } },
        variant: { mount: { recipe: 'lift' } },
        template: { mount: null },
      });
      expect(result).toBeNull();
    });

    it('element null beats every prior level (element always last)', () => {
      const result = mergeElementAnimations({
        identity: { mount: { recipe: 'fade-up' } },
        variant: { mount: { recipe: 'lift' } },
        template: { mount: { recipe: 'scale-in' } },
        element: { mount: null },
      });
      expect(result).toBeNull();
    });

    it('element non-null beats prior template null (later wins)', () => {
      const result = mergeElementAnimations({
        identity: { mount: { recipe: 'fade-up' } },
        template: { mount: null },
        element: { mount: { recipe: 'pop' } },
      });
      expect(result).toEqual({ mount: { recipe: 'pop' } });
    });

    it('null only strips the specified trigger, others inherit', () => {
      const result = mergeElementAnimations({
        identity: { mount: { recipe: 'fade-up' }, hover: { recipe: 'lift' } },
        variant: { hover: null },
      });
      expect(result).toEqual({ mount: { recipe: 'fade-up' } });
    });

    it('null on one trigger does not affect other triggers at the same level', () => {
      const result = mergeElementAnimations({
        identity: { mount: { recipe: 'fade-up' }, hover: { recipe: 'lift' } },
        element: { hover: null, focus: { recipe: 'glow' } },
      });
      expect(result).toEqual({
        mount: { recipe: 'fade-up' },
        focus: { recipe: 'glow' },
      });
    });

    it('stateChange trigger disabled via null', () => {
      const result = mergeElementAnimations({
        identity: {
          stateChange: { watch: '/count', on: 'change', recipe: 'pop', duration: '200ms' },
        },
        element: { stateChange: null },
      });
      expect(result).toBeNull();
    });
  });

  describe('null semantics — whole-field null at a level', () => {
    it('whole-field null at variant contributes nothing (identity inherits)', () => {
      const result = mergeElementAnimations({
        identity: { mount: { recipe: 'fade-up' } },
        variant: null,
      });
      expect(result).toEqual({ mount: { recipe: 'fade-up' } });
    });

    it('whole-field null at template contributes nothing', () => {
      const result = mergeElementAnimations({
        identity: { mount: { recipe: 'fade-up' } },
        variant: { ambient: { recipe: 'pulse-primary' } },
        template: null,
      });
      expect(result).toEqual({
        mount: { recipe: 'fade-up' },
        ambient: { recipe: 'pulse-primary' },
      });
    });

    it('whole-field null at element contributes nothing (no override)', () => {
      const result = mergeElementAnimations({
        identity: { mount: { recipe: 'fade-up' } },
        element: null,
      });
      expect(result).toEqual({ mount: { recipe: 'fade-up' } });
    });

    it('whole-field null at all 4 levels → null output', () => {
      const result = mergeElementAnimations({
        identity: null,
        variant: null,
        template: null,
        element: null,
      });
      expect(result).toBeNull();
    });

    // Distinction: whole-field null is inheritance-neutral (contributes nothing).
    // Per-trigger null is the disable marker. These must not conflate.
    it('whole-field null does NOT strip triggers from prior levels', () => {
      // If variant were a disable marker, mount would be stripped. Instead, identity's mount inherits.
      const result = mergeElementAnimations({
        identity: { mount: { recipe: 'fade-up' } },
        variant: null,
      });
      expect(result?.mount).toEqual({ recipe: 'fade-up' });
    });
  });

  describe('null semantics — edge cases', () => {
    it('per-trigger null mixed with per-trigger non-null in same level', () => {
      const result = mergeElementAnimations({
        identity: { mount: { recipe: 'fade-up' }, hover: { recipe: 'lift' } },
        element: { mount: null, hover: { recipe: 'scale-in' } },
      });
      // mount disabled at element, hover overridden at element
      expect(result).toEqual({ hover: { recipe: 'scale-in' } });
    });

    it('every trigger null at element → returns null overall', () => {
      const result = mergeElementAnimations({
        identity: {
          mount: { recipe: 'fade' },
          unmount: { recipe: 'fade' },
          hover: { recipe: 'lift' },
          focus: { recipe: 'glow' },
          active: { recipe: 'pop' },
          ambient: { recipe: 'breathe-subtle' },
          stateChange: { watch: '/x', on: 'change', recipe: 'pop', duration: '200ms' },
        },
        element: {
          mount: null,
          unmount: null,
          hover: null,
          focus: null,
          active: null,
          ambient: null,
          stateChange: null,
        },
      });
      expect(result).toBeNull();
    });

    it('null with undefined mixed — undefined inherits, null disables', () => {
      const result = mergeElementAnimations({
        identity: { mount: { recipe: 'fade-up' }, hover: { recipe: 'lift' } },
        variant: { hover: null }, // mount is undefined → inherits
      });
      expect(result).toEqual({ mount: { recipe: 'fade-up' } });
    });
  });

  describe('5-level cascade — elementDef insertion (plan custom-element-cascade Task 3)', () => {
    it('elementDef overrides variant', () => {
      const merged = mergeElementAnimations({
        identity: { mount: { recipe: 'fade' } },
        variant: { mount: { recipe: 'slide' } },
        elementDef: { mount: { recipe: 'scale' } },
      });
      expect(merged?.mount).toEqual({ recipe: 'scale' });
    });

    it('template overrides elementDef', () => {
      const merged = mergeElementAnimations({
        elementDef: { mount: { recipe: 'scale' } },
        template: { mount: { recipe: 'pop' } },
      });
      expect(merged?.mount).toEqual({ recipe: 'pop' });
    });

    it('element overrides template (preserves existing contract)', () => {
      const merged = mergeElementAnimations({
        template: { mount: { recipe: 'pop' } },
        element: { mount: { recipe: 'fade-up' } },
      });
      expect(merged?.mount).toEqual({ recipe: 'fade-up' });
    });

    it('elementDef null disables at its level; template non-null re-enables (later wins)', () => {
      const merged = mergeElementAnimations({
        identity: { mount: { recipe: 'fade' } },
        elementDef: { mount: null },
        template: { mount: { recipe: 'scale' } },
      });
      expect(merged?.mount).toEqual({ recipe: 'scale' });
    });

    it('elementDef undefined inherits from variant', () => {
      const merged = mergeElementAnimations({
        variant: { mount: { recipe: 'slide' } },
        elementDef: undefined,
      });
      expect(merged?.mount).toEqual({ recipe: 'slide' });
    });

    it('all levels absent returns null', () => {
      expect(mergeElementAnimations({})).toBeNull();
    });

    it('elementDef per-trigger isolation — hover assignment does not leak into mount', () => {
      const merged = mergeElementAnimations({
        identity: { mount: { recipe: 'fade' } },
        elementDef: { hover: { recipe: 'lift' } },
      });
      expect(merged?.mount).toEqual({ recipe: 'fade' });
      expect(merged?.hover).toEqual({ recipe: 'lift' });
    });

    it('full 5-level cascade — element wins for overridden triggers', () => {
      const merged = mergeElementAnimations({
        identity: { mount: { recipe: 'fade' } },
        variant: { mount: { recipe: 'slide' } },
        elementDef: { mount: { recipe: 'scale' } },
        template: { mount: { recipe: 'pop' } },
        element: { mount: { recipe: 'final' } },
      });
      expect(merged?.mount).toEqual({ recipe: 'final' });
    });

    it('full 5-level cascade — untouched triggers pass through from earliest-defined level', () => {
      const merged = mergeElementAnimations({
        identity: { mount: { recipe: 'fade' }, hover: { recipe: 'pulse' } },
        variant: { mount: { recipe: 'slide' } },
        elementDef: { mount: { recipe: 'scale' }, focus: { recipe: 'ring' } },
        template: { mount: { recipe: 'pop' } },
        element: { mount: { recipe: 'final' } },
      });
      // mount: overridden by element.
      expect(merged?.mount).toEqual({ recipe: 'final' });
      // hover: only defined at identity — passes through all 5 levels unchanged.
      expect(merged?.hover).toEqual({ recipe: 'pulse' });
      // focus: only defined at elementDef — passes through template + element.
      expect(merged?.focus).toEqual({ recipe: 'ring' });
    });
  });
});
