---
id: concept-custom-element-error-boundary
title: Custom element error boundary
kind: concept
sources: [docs/consumer/reference-doc.md#rule-234]
---

# Custom element error boundary

Errors anywhere inside a custom element's expansion (missing primitive,
resolver throw, etc.) surface as an `_error` `RenderNode` — caught by the
`renderElement` `try/catch` wrapper.

## Behavior

- Per-instance isolation — a broken custom element does NOT crash sibling
  renders.
- Consumer error handling does NOT need to know the author's internal
  structure — errors are isolated.

## Use case

A misbehaving custom element shows its own error indicator while the rest
of the page continues to render normally.

## Related concepts

- [[@concept-custom-elements]]
- [[@concept-where-to-look]] — for source-level debugging

## Sources (raw)

- `docs/consumer/reference-doc.md § rule 234`
