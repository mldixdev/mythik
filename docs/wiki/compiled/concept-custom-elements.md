---
id: concept-custom-elements
title: Custom elements (Layer 3)
kind: concept
sources: [docs/consumer/ai-context-custom-elements.md, docs/consumer/reference-doc.md#layer-3-custom-elements-plan-custom-element-cascade]
---

# Custom elements (Layer 3)

Authors register reusable components via `plugins.registerElement`. They
participate in the full render contract as **first-class primitives** —
consumers use them with identical syntax to built-ins (`type`, `props`,
`animations`, `hover`, `visible`, `key`, etc.).

## Author registers via plugin

```ts
plugins.registerElement(elementDefinition);
```

`PluginLoader.registerElement(def)` stages the definition; `factory.applyPlugins()`
calls `elements.register(def)` for each, skipping entries already present
(idempotent with `config.elements`). `count()` includes element definitions
(rule 237).

## Consumer uses like a primitive

```json
{
  "type": "rating-stars",
  "props": { "max": 5, "value": { "$bindState": "/form/rating" }, "variant": "compact" },
  "animations": { "mount": { "recipe": "scale-in" } },
  "hover": { "scale": 1.02 },
  "children": ["label"]
}
```

Instance-level `animations` / `hover` / `style` apply to the OUTER
primitive — see [[@concept-custom-element-black-box]].

## What's documented separately

- [[@concept-element-definition]] — `ElementDefinition` shape
- [[@concept-element-render-node]] — render tree
- [[@concept-element-variants]] — author + theme variants
- [[@concept-element-prop-definition]] — `PropDefinition`
- [[@concept-element-children-slot]] — `"$children"` marker
- [[@concept-custom-element-action-props]] — action-chain props via `$prop`
- [[@concept-custom-element-black-box]] — consumer/author boundary
- [[@concept-custom-element-prop-cascade]] — `$prop` scope
- [[@concept-custom-element-repeat]]
- [[@concept-custom-element-cache]]
- [[@concept-custom-element-error-boundary]]

## Validator awareness

`validateSpec` accepts `elementRegistry` in `ValidationContext` — a
non-primitive `el.type` no longer flagged as "unknown" when the registry
knows it. Suggestion candidates merge keys from primitive and element
registries (rule 238).

## Related concepts

- [[@concept-templates]] — simpler reuse mechanism
- [[@concept-templates-vs-variants]]
- [[@concept-animation-cascade]] — 5-level cascade (with elementDef level)

## Sources (raw)

- `docs/consumer/ai-context-custom-elements.md` (full)
- `docs/consumer/reference-doc.md § Layer 3 Custom Elements` (rules 226-240)
