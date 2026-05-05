---
id: concept-custom-element-prop-cascade
title: `$prop` cascade in nested custom elements
kind: concept
sources: [docs/consumer/ai-context-custom-elements.md, docs/consumer/reference-doc.md#rule-231]
---

# `$prop` cascade in nested custom elements

Inside a custom element's expanded tree, `$prop` references resolve
against THAT custom element's `mergedProps`. **Nesting a custom element
pushes a new `propContext` — outer's is shadowed, NOT merged.**

## Behavior

- Nearest-enclosing custom element wins.
- Outer custom-element props are not visible to inner custom-element render trees.
- Matches CSS custom-property scoping semantics.

## Workaround for nested access

Thread values via explicit prop passthrough when nested access is needed:

```json
"render": {
  "type": "stack",
  "children": [
    {
      "type": "inner-custom-element",
      "props": {
        "outerLabel": { "$prop": "label" }
      }
    }
  ]
}
```

The outer element passes its `label` prop down explicitly. The inner
element reads it as `$prop: "outerLabel"`.

## Implementation

Cache dep scanner (`scanDeps` in `deps.ts`) tracks `$prop` references as
`/__prop/<name>` sentinel paths. At custom-element dispatch time, an
`instancePropsCache` diffs current vs previous `mergedProps`; changed
keys are injected into the active changed-paths set (scoped to the
expansion render via `try/finally`) so inner primitives that declared
those prop refs correctly invalidate. See [[@concept-custom-element-cache]].

## Related concepts

- [[@concept-prop-cascade]]
- [[@concept-custom-elements]]
- [[@expression-prop]]
- [[@concept-custom-element-cache]]

## Sources (raw)

- `docs/consumer/ai-context-custom-elements.md` (full)
- `docs/consumer/reference-doc.md § rule 231`
