---
id: concept-animation-cascade
title: 5-level animation cascade
kind: concept
sources: [docs/consumer/ai-context.md#interactive-states--animations, docs/consumer/reference-doc.md#layer-3-custom-elements-plan-custom-element-cascade]
---

# 5-level animation cascade

Animations cascade across **identity → variant → elementDef → template →
element**, per-trigger. Later levels override earlier. Non-overlapping
triggers from different levels combine.

## Levels

| # | Level | Source | Scope |
|---|---|---|---|
| 1 | **identity** | `tokens.identity.animations` | App-wide default. Reaches **inside** custom-element expansions |
| 2 | **variant** | `tokens.components.<type>.<variantName>.animations` OR `ElementDefinition.variants[name].animations` | Per-variant override |
| 3 | **elementDef** | Author's declaration on a primitive inside a custom element's render tree | Present **only** inside custom element expansions; undefined elsewhere |
| 4 | **template** | `spec.templates.<name>.animations` | Per-template override; supports `$prop`/`$state`/`$cond` |
| 5 | **element** | `element.animations` | Per-instance. For custom-element instances, applies to OUTER primitive only (black-box) |

## Variant resolution order

1. `ElementDefinition.variants[name]` — author's built-in (checked first)
2. `tokens.components[type].variants[name]` — theme-level fallback

## Merge semantics

Per-trigger, later wins. Non-overlapping triggers combine — identity's
`mount: fade-up` + variant's `ambient: pulse-primary` + element's
`hover: lift` all apply together.

`$state` / `$cond` / `$token` / `$prop` resolve inside any level before
merging.

## Inside custom elements

For inner primitives:
- **identity** (level 1): reaches inside the box — consumer cannot block.
- **variant** (level 2): the inner primitive's own variant if it has one.
- **elementDef** (level 3): the author's `animations` on that inner node —
  only present inside custom-element expansions.
- **template** (level 4): if the inner node uses a template.
- **element** (level 5): NOT the consumer's declaration — that stays on the
  outer primitive (black-box). Inner has no level-5 unless author wires
  one via `$prop`.

## Example

```json
{
  "tokens": {
    "identity": { "animations": { "mount": { "recipe": "fade-up" } } },
    "components": {
      "button": { "cta": { "animations": { "ambient": { "recipe": "pulse-primary" } } } }
    }
  },
  "templates": {
    "hero-card": {
      "type": "box",
      "animations": { "mount": { "recipe": "scale-in" }, "hover": { "recipe": "lift" } }
    }
  },
  "elements": {
    "my-card": { "type": "hero-card", "animations": { "hover": null } }
  }
}
```

`my-card` resolves: `mount: scale-in` (template wins over identity), `hover`
disabled (element null wins over template's lift).

## Related concepts

- [[@concept-animations-engine]]
- [[@concept-animation-null-semantics]]
- [[@concept-component-variants]]
- [[@concept-templates]]
- [[@concept-custom-elements]]
- [[@concept-custom-element-black-box]]
- [[@concept-identity-animations]]

## Sources (raw)

- `docs/consumer/ai-context.md § Interactive States & Animations → Cascade`
- `docs/consumer/ai-context-custom-elements.md § Animation Cascade Inside Custom Elements`
- `docs/consumer/reference-doc.md § rule 201-204, 229`
