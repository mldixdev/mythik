// Cascade composition — merges ElementAnimations across 5 levels.
//
// Resolution order: identity → variant → elementDef → template → element.
// Each later level OVERRIDES earlier values on a per-trigger basis.
//
// Semantics:
//   undefined at a level → inherit from prior level (pass-through)
//   null      at a level → explicit disable for this trigger at this level
//                          (later non-null levels can re-enable — later always wins)
//   whole-field null     → that level contributes nothing (equivalent to all-undefined)
//
// Returns:
//   null if every trigger is absent or disabled (caller can skip the runner)
//   ElementAnimations with only defined triggers otherwise (null-valued triggers
//   are stripped from the output so consumers never need to null-check)

import type { ElementAnimations, AnimationTrigger } from './types.js';
import type { AnimationContext } from './cascade-types.js';

const TRIGGERS = [
  'mount',
  'unmount',
  'hover',
  'focus',
  'active',
  'ambient',
  'stateChange',
] as const satisfies readonly AnimationTrigger[];

// Compile-time exhaustiveness sentinel — fails to compile if any
// `AnimationTrigger` is missing from TRIGGERS. Prevents silent drop if a
// future trigger (e.g. `longPress`, `gesture`) is added to ElementAnimations
// without being added here.
type _TriggerExhaustiveness = Exclude<
  AnimationTrigger,
  (typeof TRIGGERS)[number]
> extends never
  ? true
  : never;
const _triggerExhaustivenessCheck: _TriggerExhaustiveness = true;
void _triggerExhaustivenessCheck;

/**
 * Pick the last defined value for `trigger` across the ordered cascade levels.
 *
 * Walks levels left-to-right; later levels overwrite earlier ones. `undefined`
 * (property missing) is inheritance — skipped. Explicit `null` is a disable
 * marker — it wins over earlier non-null values but a later non-null level
 * wins over it.
 *
 * Returns `undefined` if no level defined the trigger at all.
 * Returns `null` if the last level that defined it did so with `null`.
 */
function pickLast<K extends AnimationTrigger>(
  trigger: K,
  levels: ReadonlyArray<ElementAnimations | null | undefined>,
): ElementAnimations[K] | undefined {
  let value: ElementAnimations[K] | undefined = undefined;
  for (const level of levels) {
    if (level == null) continue;
    if (!(trigger in level)) continue;
    value = level[trigger];
  }
  return value;
}

export function mergeElementAnimations(
  ctx: AnimationContext,
): ElementAnimations | null {
  const levels: ReadonlyArray<ElementAnimations | null | undefined> = [
    ctx.identity,
    ctx.variant,
    ctx.elementDef,
    ctx.template,
    ctx.element,
  ];

  const result: Partial<ElementAnimations> = {};

  for (const trigger of TRIGGERS) {
    const value = pickLast(trigger, levels);
    // Strip both undefined (never defined) and null (explicit disable) from output
    if (value !== undefined && value !== null) {
      // Cast widens the write target to accept the per-trigger value union.
      // Note: inside `for ... of TRIGGERS`, `typeof trigger` remains the full
      // `AnimationTrigger` union (TS does not narrow per-iteration), which
      // would force an impossible intersection on the LHS. The union cast is
      // the correct shape; pickLast<K>'s generic is preserved only at literal
      // call sites (e.g. pickLast('mount', levels)), not here in the loop.
      (result as Record<AnimationTrigger, ElementAnimations[AnimationTrigger]>)[trigger] = value;
    }
  }

  return Object.keys(result).length === 0 ? null : (result as ElementAnimations);
}
