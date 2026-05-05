---
id: antipattern-event-expression
title: Anti-pattern — `$event` expression
kind: pattern
sources: [docs/consumer/ai-context.md#rule-61, docs/consumer/reference-doc.md#rules-61-169]
---

# Anti-pattern — `$event`

**`$event` is NOT a valid expression handler.** Do NOT use
`{ "$event": "value" }` in action params. The literal string `"$event"`
is treated as a value.

## Wrong

```json
{ "type": "select",
  "on": { "change": [{ "action": "applyPreset", "params": { "preset": { "$event": "value" } } }] }
}
```

## Right — `$bindState` + `$state` pattern

For select / control `on:change`, use `$bindState` on the value prop for
two-way binding, then read the value via `$state` in the action:

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
`$state`. Action chains commit state between steps.

## Related concepts

- [[@expression-bindstate]]
- [[@expression-state]]
- [[@concept-action-chains]]
- [[@concept-preset-dropdown-pattern]]

## Sources (raw)

- `docs/consumer/ai-context.md § rule 61`
- `docs/consumer/reference-doc.md § rules 61, 169`
