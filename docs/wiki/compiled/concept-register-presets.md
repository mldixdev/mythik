---
id: concept-register-presets
title: `plugins.registerPresets`
kind: concept
sources: [docs/consumer/reference-doc.md#presets-system]
---

# `plugins.registerPresets`

Host-app API that stores presets and prepares them for use in specs.

## Usage

```ts
const svc = createMythik({ tokens: { dna: { primary: '#0D9488' } } });
svc.plugins.registerPresets(myPresets);
svc.applyPlugins();
```

## Side effects

`registerPresets` automatically:

1. Stores presets in an internal `Map`.
2. Writes dropdown options to `/presets/available` as
   `Array<{ value, label }>` for spec consumption.
3. Auto-registers the `applyPreset` action (so specs can dispatch it
   without host-app code).

## Accessors

- `plugins.getPresets()` — returns all registered presets.
- `plugins.getPreset(id)` — returns one by ID.

## Related concepts

- [[@concept-presets]]
- [[@action-apply-preset]]
- [[@concept-preset-dropdown-pattern]]
- [[@path-presets-available]]

## Sources (raw)

- `docs/consumer/reference-doc.md § Presets System` + rule 167
