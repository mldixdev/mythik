---
id: concept-custom-detection-pattern
title: Custom-detection pattern (preset → "custom" on edit)
kind: concept
sources: [docs/consumer/reference-doc.md#rule-170]
---

# Custom-detection pattern

When the user modifies any token-related control individually, the preset
dropdown should switch back to "Custom" so they know they've left the
preset.

## Pattern

Every control that modifies tokens should include in its `on:change` array:

```json
{ "action": "setState", "params": { "statePath": "/ui/currentPreset", "value": "custom" } }
```

## Example — DNA roundness slider

```json
{ "type": "slider",
  "props": { "value": { "$bindState": "/dna/roundness" }, "min": 0, "max": 100 },
  "on": { "change": [
    { "action": "updateTokens", "params": { "dna": { "roundness": { "$state": "/dna/roundness" } } } },
    { "action": "setState", "params": { "statePath": "/ui/currentPreset", "value": "custom" } }
  ]}
}
```

## Why `applyPreset 'custom'` is a no-op

`applyPreset` with `preset: 'custom'` is a silent no-op (not a real
preset). This means clicking "Custom" in the dropdown doesn't fire any
token change — only the dropdown indicator updates.

## Related concepts

- [[@concept-preset-dropdown-pattern]]
- [[@action-apply-preset]]
- [[@action-update-tokens]]
- [[@concept-presets]]

## Sources (raw)

- `docs/consumer/reference-doc.md § rule 170`
