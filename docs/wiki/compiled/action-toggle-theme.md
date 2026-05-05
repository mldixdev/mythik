---
id: action-toggle-theme
title: `toggleTheme` — switch dark/light
kind: action
sources: [docs/consumer/ai-context.md#action-reference, docs/consumer/reference-doc.md#action-reference]
---

# `toggleTheme`

Switches between dark and light theme by toggling `/preferences/theme`.
`$token` automatically reads `/preferences/theme` — all primitives re-render
with the new tokens. No manual switching code needed.

## Shape / Signature

```json
{ "action": "toggleTheme" }
```

(No params.)

## Examples

```json
{ "type": "button",
  "props": { "label": "Toggle theme" },
  "on": { "press": { "action": "toggleTheme" } }
}
```

Conditional icon based on current theme:
```json
"theme-icon": {
  "type": "icon",
  "props": {
    "name": { "$cond": { "$state": "/preferences/theme", "eq": "dark" }, "$then": "sun", "$else": "moon" }
  }
}
```

## Related concepts

- [[@expression-token]] — auto-reads theme
- [[@concept-auto-dark-mode]] — DNA-derived `modes.dark`
- [[@concept-token-system]] — three-layer resolution

## Sources (raw)

- `docs/consumer/ai-context.md § Actions → Action Reference`
- `docs/consumer/reference-doc.md § Actions → Action Reference`
