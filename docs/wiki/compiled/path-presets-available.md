---
id: path-presets-available
title: `/presets/available` — registered presets
kind: concept
sources: [docs/consumer/reference-doc.md#presets-system]
---

# `/presets/available`

State path written by `plugins.registerPresets`. Holds an array of
`{ value, label }` for use as `select.options` in preset-dropdown patterns.

## Shape

```json
[
  { "value": "startup-saas", "label": "Startup SaaS" },
  { "value": "neumorphic-ios", "label": "Neumorphic iOS" }
]
```

## Use in specs

```json
{ "type": "select",
  "props": {
    "options": { "$state": "/presets/available" },
    "value": { "$bindState": "/ui/currentPreset" }
  }
}
```

See [[@concept-preset-dropdown-pattern]] for the full pattern.

## Related concepts

- [[@concept-presets]]
- [[@concept-register-presets]]
- [[@concept-preset-dropdown-pattern]]
- [[@action-apply-preset]]

## Sources (raw)

- `docs/consumer/reference-doc.md § Presets System`
