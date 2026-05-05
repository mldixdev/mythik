---
id: pattern-loading-content-empty
title: Pattern — Loading / Content / Empty / Error
kind: pattern
sources: [docs/consumer/ai-context.md#loadingcontentempty-pattern, docs/consumer/reference-doc.md#loadingcontentempty-pattern]
---

# Pattern — Loading / Content / Empty / Error

Standard four-state visibility pattern for data-driven screens. The exact
state paths differ between `initialActions + fetch` vs `dataSources`.

## With `initialActions + fetch`

Uses `/ui/loading` and `/ui/lastError`:

```json
"loading": { "visible": { "$and": [
  { "$state": "/ui/loading" },
  { "$not": { "$array": "count", "source": { "$state": "/items" } } }
]}},
"content": { "visible": { "$array": "count", "source": { "$state": "/items" } } },
"empty":   { "visible": { "$and": [
  { "$not": { "$state": "/ui/loading" } },
  { "$not": { "$array": "count", "source": { "$state": "/items" } } }
]}},
"error":   { "visible": { "$state": "/ui/lastError" } }
```

## With `dataSources`

Uses auto-generated `/{target}Loading` and `/{target}Error`:

```json
"loading": { "visible": { "$and": [
  { "$state": "/itemsLoading" },
  { "$not": { "$array": "count", "source": { "$state": "/items" } } }
]}},
"content": { "visible": { "$array": "count", "source": { "$state": "/items" } } },
"empty":   { "visible": { "$and": [
  { "$not": { "$state": "/itemsLoading" } },
  { "$not": { "$array": "count", "source": { "$state": "/items" } } }
]}},
"error":   { "visible": { "$state": "/itemsError" } }
```

## Key rule

Loading skeleton shows ONLY on **initial load** (loading AND no data).
Content stays visible during background re-fetches (data exists,
regardless of loading state). This avoids the flicker pattern of
"data → empty → data".

## Related concepts

- [[@concept-visibility]]
- [[@action-fetch]] — sets `/ui/loading`, `/ui/lastError`
- [[@concept-data-sources]] — sets `/{target}Loading`, `/{target}Error`
- [[@path-ui-loading-error]]
- [[@path-data-source-paths]]
- [[@concept-skeleton-auto]]

## Sources (raw)

- `docs/consumer/ai-context.md § Loading/Content/Empty Pattern`
- `docs/consumer/reference-doc.md § Loading/Content/Empty Pattern`
