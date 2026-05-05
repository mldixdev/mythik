---
id: concept-background-caps
title: `validateBackgroundCaps` — performance caps
kind: concept
sources: [docs/consumer/reference-doc.md#rule-210]
---

# `validateBackgroundCaps` — performance caps

Performance validator for backgrounds. Returns
`{ warnings: string[], errors: string[] }` (shared
`AnimationValidationResult` type with `validateAnimationCaps`).

## Caps

| Scope | Soft (warn) | Hard (error) |
|---|---|---|
| Blobs per background | 8 | 16 |
| Layers per background | 6 | 10 |
| Custom-svg path length | 500 chars | 2000 chars |
| Motion dimensions per blob | 2 | 3 |

## Threshold semantics

**Strictly-over** (`>`) — differs from `validateAnimationCaps`'s `>=`
convention. Each function literal per its own design spec table
(documented in source).

## Constraints

- `custom-svg` path length cap only applies when `shape === 'custom-svg'`
  AND `path` is a string.

## Related concepts

- [[@concept-blob-layer]]
- [[@concept-background-layer-kinds]]
- [[@concept-animation-caps]] — animation parallel

## Sources (raw)

- `docs/consumer/reference-doc.md § rule 210`
