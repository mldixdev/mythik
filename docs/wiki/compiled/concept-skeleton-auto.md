---
id: concept-skeleton-auto
title: Auto-skeleton — zero-config loading state
kind: concept
sources: [docs/consumer/reference-doc.md#auto-skeleton-zero-config]
---

# Auto-skeleton — zero-config

When a spec has `initialActions` with a `fetch` action, the renderer
auto-detects loading state and replaces data-dependent primitives with
shimmer skeletons. **No configuration needed.**

## Activation conditions (all must be true)

1. Spec has `initialActions` containing a `fetch` action.
2. `/ui/loading` is `true`.
3. The fetch target path is empty / undefined / empty array.

## Shape mapping

| Primitive | Skeleton |
|---|---|
| `text` | text line |
| `image` | rectangle |
| `button` | button shape |
| `input` / `textarea` / `select` | input rectangle |
| `icon` | circle |
| Charts | large rectangle |
| `table` | table placeholder |
| Layout containers (`stack`, `grid`, `box`, `scroll`) | pass through to children |
| Overlays (`modal`, `drawer`, `tabs`) | skipped |

## Element-level opt-out

```json
{ "type": "text", "props": { "content": "Static Header" }, "skeleton": false }
```

Elements with `skeleton: false` render normally during loading. Use for
static content that doesn't depend on fetched data.

## Disable globally

```tsx
<MythikRenderer spec={spec} instance={svc} autoSkeleton={false} />
```

## Related concepts

- [[@primitive-skeleton]]
- [[@concept-skeleton-manual]]
- [[@action-fetch]]
- [[@pattern-loading-content-empty]]

## Sources (raw)

- `docs/consumer/reference-doc.md § Auto-Skeleton (Zero Config)`
