---
id: primitive-button
title: `button`
kind: primitive
sources: [docs/consumer/ai-context-primitives.md#button]
---

# `button`

Pressable button. Built-in CSS transitions — only add `hover`/`active`/`focus`
for custom behavior beyond defaults.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | string/expression | — | Button text |
| `variant` | string | — | `primary`, `secondary`, `destructive`, `ghost`, or custom from tokens |
| `disabled` | boolean/expression | `false` | Disable |
| `className` | string | — | CSS class |

## Examples

Primary action:
```json
{ "type": "button", "props": { "label": "Save", "variant": "primary" },
  "on": { "press": { "action": "submitForm", "params": { "formId": "f", "url": "..." } } }
}
```

Conditional label:
```json
{ "type": "button", "props": {
  "label": { "$cond": { "$auth": "loading" }, "$then": "Signing in...", "$else": "Login" },
  "disabled": { "$auth": "loading" }
}}
```

## Notes

- `variant` lives in `props`, not as a top-level field. See
  [[@antipattern-element-variant-top-level]].
- `tokens.identity.gradients.buttons = true` applies primary→accent
  gradient automatically — see [[@concept-identity-gradients]].

## Related concepts

- [[@concept-component-variants]]
- [[@concept-identity-surface]]
- [[@concept-interactive-states]]
- [[@primitive-touchable]] — invisible alternative

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § button`
