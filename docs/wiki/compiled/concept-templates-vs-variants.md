---
id: concept-templates-vs-variants
title: Templates vs Variants — decision table
kind: concept
sources: [docs/consumer/ai-context-patterns.md#reusable-components--templates--variants]
---

# Templates vs Variants — when to pick which

Two underused reuse mechanisms. **Use them before duplicating style blocks.**

## Decision table

| Situation | Pick |
|---|---|
| Same primitive type, different style set | `tokens.components.{type}.{variant}` |
| Composite (custom type wrapping primitive + children slot) | `appSpec.templates` |
| Style varies by state (hover/active/focus) | Variants (built-in state slots) |
| Parametrized via props + children | Templates (with `$prop` + `$children`) |

## Trade-off

- **Variants are lightweight** and integrate natively with primitive
  rendering. Prefer when you only vary style.
- **Templates are more flexible** but more verbose. Use when you compose
  structure (different children, parametrized props beyond style).

## Example — variant (style-only)

```json
"tokens": {
  "components": {
    "button": {
      "ctaPulse": {
        "style": { "background": { "$token": "colors.primary" } },
        "animations": {
          "ambient": { "recipe": "pulse-primary" },
          "hover": { "recipe": "lift" }
        }
      }
    }
  }
}
```

Use: `{ "type": "button", "props": { "variant": "ctaPulse", "label": "..." } }`.

## Example — template (composite)

```json
"templates": {
  "button-pulse-cta": {
    "type": "button",
    "defaults": { "variant": "primary" },
    "props": { "label": { "$prop": "label" } },
    "style": { "background": "linear-gradient(135deg, #6366f1, #8b5cf6)", "padding": { "$prop": "padding" } },
    "animations": { "ambient": { "recipe": "pulse-primary" } },
    "children": ["$children"]
  }
}
```

Use: `{ "type": "button-pulse-cta", "props": { "label": "Sign Up", "padding": "10px 20px" } }`.

## Animations cascade across both

`animations` declared at any of these levels merges via the cascade —
identity → variant → elementDef → template → element. See
[[@concept-animation-cascade]].

## Related concepts

- [[@concept-templates]]
- [[@concept-component-variants]]
- [[@concept-animation-cascade]]
- [[@antipattern-style-block-duplication]]

## Sources (raw)

- `docs/consumer/ai-context-patterns.md § Reusable Components — Templates + Variants`
