export interface ResolvedVariant {
  style?: Record<string, unknown>;
  hover?: Record<string, unknown>;
  active?: Record<string, unknown>;
  focus?: Record<string, unknown>;
  transition?: Record<string, unknown>;
  /**
   * Animations at the variant cascade level (plan 3 Task 14).
   *
   * Post-resolveTokenRefs shape — $path references at the top level of each
   * trigger value (e.g. `mount: '$animations.fade'`) are resolved; nested
   * structures (e.g. `mount: { recipe: '$recipes.X' }`) pass through
   * one-level-deep exactly like style/hover/active/focus.
   *
   * Runtime shape (after Task 15's Box integration) IS ElementAnimations —
   * the `Record<string, unknown> | null` typing here matches the adjacent
   * variant fields for consistency; Box casts to ElementAnimations at
   * consumption. Whole-field `null` at the variant level is cascade-
   * neutral (contributes nothing); per-trigger `null` disables the
   * inherited trigger per the null-semantics decision table.
   */
  animations?: Record<string, unknown> | null;
}

function getByPath(obj: Record<string, unknown>, segments: string[]): unknown {
  let current: unknown = obj;
  for (const seg of segments) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[seg];
  }
  return current;
}

/**
 * Resolve $path token references in a value.
 * - String starting with '$': look up path in tokens, return resolved value or original string
 * - Object: resolve each value (one level deep)
 * - Numbers, booleans, null, arrays: passthrough
 * One-pass only — a resolved value that is also a $-string is NOT re-resolved.
 *
 * Expression-system scope: this function handles ONLY `$path` token-tree
 * lookups (e.g. `$colors.primary`, `$animations.interactive`). Template-
 * layer expressions (`$prop`, `$state`, `$cond`) are NOT recognized here
 * and would pass through as literal strings unchanged. If you need
 * element-prop or state-based interpolation, use the template path
 * (the unified `resolveDeep` in renderer/engine.ts) instead — variants are
 * token-tree concepts, templates are spec-engine concepts.
 *
 * Depth limit: nested structures (e.g. `mount: { recipe: '$recipes.X' }`)
 * pass through unchanged at one level deep — the outer `mount` key's value
 * is an object, not a `$`-string, so resolveTokenRefs visits its keys but
 * the inner `'$recipes.X'` value, while a `$`-string, lives inside a
 * nested object. Downstream runtime layers (the animation engine, for
 * variant-referenced recipes) are responsible for resolving any
 * surviving `$`-strings. Don't place deeply-nested token refs in variants
 * expecting transparent traversal.
 */
export function resolveTokenRefs(value: unknown, tokens: Record<string, unknown>): unknown {
  if (typeof value === 'string' && value.startsWith('$')) {
    const path = value.slice(1).split('.');
    const resolved = getByPath(tokens, path);
    return resolved !== undefined ? resolved : value;
  }

  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (typeof v === 'string' && v.startsWith('$')) {
        const path = v.slice(1).split('.');
        const resolved = getByPath(tokens, path);
        result[k] = resolved !== undefined ? resolved : v;
      } else {
        result[k] = v;
      }
    }
    return result;
  }

  return value;
}

/**
 * Look up a variant definition from tokens.components and resolve all $path references.
 * Returns null if variant not found.
 */
export function resolveVariant(
  type: string,
  variantName: string,
  tokens: Record<string, unknown> | undefined,
): ResolvedVariant | null {
  if (!tokens) return null;
  const components = tokens.components as Record<string, Record<string, Record<string, unknown>>> | undefined;
  if (!components) return null;
  const typeVariants = components[type];
  if (!typeVariants) return null;
  const variantDef = typeVariants[variantName];
  if (!variantDef) return null;

  const result: ResolvedVariant = {};

  if (variantDef.style) {
    result.style = resolveTokenRefs(variantDef.style, tokens) as Record<string, unknown>;
  }
  if (variantDef.hover) {
    result.hover = resolveTokenRefs(variantDef.hover, tokens) as Record<string, unknown>;
  }
  if (variantDef.active) {
    result.active = resolveTokenRefs(variantDef.active, tokens) as Record<string, unknown>;
  }
  if (variantDef.focus) {
    result.focus = resolveTokenRefs(variantDef.focus, tokens) as Record<string, unknown>;
  }
  if (variantDef.transition) {
    result.transition = resolveTokenRefs(variantDef.transition, tokens) as Record<string, unknown>;
  }

  // animations — three-branch semantics (plan 3 Task 14), mirroring
  // Template.animations handling in renderer/engine.ts. Absent: don't emit
  // (cascade treats undefined as inheritance-neutral). Null: preserve
  // verbatim (cascade-neutral + documents explicit intent). Object: resolve
  // via the same resolveTokenRefs used for style/hover — $path at the top
  // level of each trigger value is resolved; nested structures pass through.
  if ('animations' in variantDef) {
    const anims = variantDef.animations;
    if (anims === null) {
      result.animations = null;
    } else if (anims !== undefined) {
      result.animations = resolveTokenRefs(anims, tokens) as Record<string, unknown>;
    }
  }

  return result;
}
