---
id: concept-preset-dropdown-pattern
title: Preset dropdown pattern (`$bindState` + `$state`)
kind: concept
sources: [docs/consumer/ai-context.md#rule-62, docs/consumer/reference-doc.md#rule-169]
---

# Preset dropdown pattern

Pattern for letting users pick a preset from a select. **Use `$bindState`
on `value` and `$state` in the action params** — `$event` does NOT
exist as an expression.

## Pattern

```json
{ "type": "select",
  "props": {
    "options": { "$state": "/presets/available" },
    "value": { "$bindState": "/ui/currentPreset" }
  },
  "on": { "change": [
    { "action": "applyPreset", "params": { "preset": { "$state": "/ui/currentPreset" } } }
  ]}
}
```

## Why this works

`$bindState` writes the new value to `/ui/currentPreset` BEFORE the
`on.change` chain runs. The action then reads the just-written value via
`$state`. No `$event` needed.

## Constraints / Anti-patterns

- **`$event` is NOT a valid expression.** Do NOT use
  `{ "$event": "value" }` in action params. See
  [[@antipattern-event-expression]].

## Related concepts

- [[@expression-bindstate]]
- [[@action-apply-preset]]
- [[@concept-presets]]
- [[@concept-custom-detection-pattern]]
- [[@antipattern-event-expression]]
- [[@path-presets-available]]

## Sources (raw)

- `docs/consumer/ai-context.md § rule 62`
- `docs/consumer/reference-doc.md § rules 61, 169`
