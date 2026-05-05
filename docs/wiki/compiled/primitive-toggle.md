---
id: primitive-toggle
title: `toggle` — boolean switch
kind: primitive
sources: [docs/consumer/ai-context-primitives.md#toggle]
---

# `toggle`

Boolean switch (visual switch, not checkbox). Bind via `checked`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `checked` | boolean/expression | — | Bind via `$bindState`. **NOT `value`** |
| `label` | string/expression | — | Label text |
| `disabled` | boolean/expression | `false` | Disable |

## Events

`on.change`.

## Examples

```json
{ "type": "toggle", "props": {
  "checked": { "$bindState": "/preferences/darkMode" },
  "label": "Dark Mode"
}}
```

## Constraints / Anti-patterns

- **Use `checked`, NOT `value`.** See
  [[@antipattern-checkbox-toggle-value]].

## Related concepts

- [[@primitive-checkbox]]
- [[@expression-bindstate]]
- [[@action-toggle-theme]]

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § toggle`
