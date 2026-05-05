---
id: antipattern-all-filter-wildcard
title: Anti-pattern — `"all"` is not a wildcard
kind: pattern
sources: [docs/consumer/ai-context-patterns.md#all-filter-is-not-a-wildcard]
---

# Anti-pattern — `"all"` is not a wildcard

`$array: "filter"` with value `"all"` matches the **literal string `"all"`**,
not "everything". Common bug when using a single dropdown for filter +
"show all" option.

## Wrong

```json
{
  "$array": "filter",
  "source": { "$state": "/items" },
  "where": { "field": "status", "eq": { "$state": "/filter" } }
}
```

If `/filter` is `"all"`, this filters for items with status literally
equal to `"all"` — typically zero matches.

## Right — bypass with `$cond`

```json
{
  "$cond": { "$state": "/filter", "eq": "all" },
  "$then": { "$state": "/items" },
  "$else": {
    "$array": "filter",
    "source": { "$state": "/items" },
    "where": { "field": "status", "eq": { "$state": "/filter" } }
  }
}
```

When `/filter` is `"all"`, return the full source unmodified. Otherwise
filter normally.

## Note for dataSources

The `dataSources.params` filter handles this differently — values
`null`, `undefined`, `""`, or `"all"` are **automatically omitted** from
the query string. So if your filter is server-side via `dataSources`,
this anti-pattern doesn't apply.

## Related concepts

- [[@expression-array]]
- [[@expression-cond]]
- [[@concept-data-sources]]

## Sources (raw)

- `docs/consumer/ai-context-patterns.md § "all" filter is not a wildcard`
