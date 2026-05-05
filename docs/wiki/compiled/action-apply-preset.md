---
id: action-apply-preset
title: `applyPreset` — apply curated DNA+Identity
kind: action
sources: [docs/consumer/ai-context.md, docs/consumer/reference-doc.md#presets-system]
---

# `applyPreset` — apply curated DNA+Identity snapshot

Applies a registered preset (DNA + Identity bundle) by ID. Looks up the
preset, calls `updateTokens({ _replace: true, dna, identity })` so every
flag from the previous preset is cleared.

## Shape / Signature

```json
{ "action": "applyPreset", "params": { "preset": "<preset-id>" } }
```

## Examples

```json
{ "action": "applyPreset", "params": { "preset": "startup-saas" } }
```

Bound to a select via `$bindState`:
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

## Constraints / Anti-patterns

- **`'custom'` is a silent no-op** (not a real preset).
- **Unknown preset IDs throw.**
- For consumer-driven preset selection use the
  [[@concept-preset-dropdown-pattern]] — `$bindState` on `value` +
  `$state` in the action params (NOT `$event`).
- Every control that modifies tokens individually should add
  `setState /ui/currentPreset → "custom"` to its own change handler so
  the dropdown reflects "modified" state. See
  [[@concept-custom-detection-pattern]].

## Related concepts

- [[@concept-presets]] — `PresetDefinition` interface
- [[@concept-register-presets]] — `plugins.registerPresets`
- [[@concept-preset-dropdown-pattern]]
- [[@concept-custom-detection-pattern]]
- [[@action-update-tokens]] — underlying mechanism
- [[@path-presets-available]]

## Sources (raw)

- `docs/consumer/ai-context.md` (presets section)
- `docs/consumer/reference-doc.md § Presets System` + rules 167-170
