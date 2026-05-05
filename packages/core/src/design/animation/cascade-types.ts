// Cascade composition context for Element animations.
//
// Five levels — identity → variant → elementDef → template → element — merged by
// mergeElementAnimations() at runner time (see cascade.ts). Later levels
// override earlier levels on a per-trigger basis.
//
// Semantics per field:
//   undefined → inherit upward (this level does not participate for this key)
//   null      → explicit disable at this level (strips the trigger / contributes nothing
//                whole-field — see cascade.ts for full rules). A later non-null level
//                re-enables it (later always trumps).
import type { ElementAnimations } from './types.js';

export interface AnimationContext {
  /** Global default animations from `tokens.identity.animations`. */
  identity?: ElementAnimations | null;
  /** Variant-level animations from `ResolvedVariant.animations` (via renderer/variants.ts) or `ElementDefinition.variants[name].animations`. */
  variant?: ElementAnimations | null;
  /**
   * Author's declaration on a primitive inside a custom element's render
   * tree (plan custom-element-cascade Task 3 / Task 11).
   *
   * Undefined for primitives outside a custom element expansion —
   * inheritance-neutral so every pre-existing caller works unchanged.
   * Inside a custom element expansion, the renderer feeds the expanded
   * element's `animations` field into this slot. See design spec
   * §Five-level cascade for the full derivation.
   */
  elementDef?: ElementAnimations | null;
  /** Template-level animations from `appSpec.templates[name].animations` (via spec-engine, post-$prop interpolation). */
  template?: ElementAnimations | null;
  /** Element-level override from `Element.animations` (the spec-level prop). Wins last. */
  element?: ElementAnimations | null;
}
