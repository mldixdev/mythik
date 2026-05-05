---
id: concept-custom-element-cache
title: Custom element cache invalidation
kind: concept
sources: [docs/consumer/reference-doc.md#rule-233]
---

# Custom element cache invalidation

Cache dep scanner tracks `$prop` references as `/__prop/<name>` sentinel
paths. At custom-element dispatch time, an `instancePropsCache` diffs
current vs previous `mergedProps`; changed keys are injected into the
active changed-paths set (scoped to the expansion render via `try/finally`)
so inner primitives that declared those prop refs correctly invalidate.

## Behavior

- `$prop: "label"` is registered as a dependency on `/__prop/label`.
- When consumer prop `label` changes, the sentinel path is added to the
  changed-paths set during the next expansion.
- Inner primitives that scan-deps include `/__prop/label` re-render.

## Limitations

**Shallow reference equality** — object/array props sourced from `$state`
(which produces new references each render) over-invalidate every render
even when contents are equal. Deep-equality diff deferred pending profiling
(see `engine.ts` docstring).

## Related concepts

- [[@concept-custom-elements]]
- [[@concept-custom-element-prop-cascade]]
- [[@expression-prop]]
- [[@concept-mythik-renderer]]

## Sources (raw)

- `docs/consumer/reference-doc.md § rule 233`
