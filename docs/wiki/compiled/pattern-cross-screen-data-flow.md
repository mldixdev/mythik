---
id: pattern-cross-screen-data-flow
title: Pattern — Cross-screen data flow
kind: pattern
sources: [docs/consumer/ai-context.md#cross-screen-data-flow]
---

# Pattern — Cross-screen data flow

Two channels for passing data between screens:

1. **`/ui/selectedRow`** — framework-reserved magic path. Auto-written
   when a table row is clicked. Persists across navigation, drawer,
   modal until next row interaction dispatch.
2. **`/navigation/params`** — extra params on `navigateScreen`. **Reset
   on each navigation** — for one-shot context.

## Master → Detail (via `/ui/selectedRow`)

```json
// List screen: row click (framework auto-writes row to /ui/selectedRow) + navigate
"onRowClick": [
  { "action": "navigateScreen", "params": { "screen": "item-detail" } }
]

// Detail screen: reads /ui/selectedRow directly
"props": { "content": { "$state": "/ui/selectedRow/name" } }
```

The framework writes the clicked row to `/ui/selectedRow` BEFORE
dispatching the action chain. `onRowClick` params resolve lazily at click
time, so they can read `/ui/selectedRow/<key>` directly. No explicit
`setState` needed.

**Do NOT use `"$row"` literal** — there is no `$row` expression. See
[[@antipattern-row-literal]].

## Navigation with params

```json
// Source
{ "action": "navigateScreen", "params": { "screen": "profile", "employeeId": 42 } }

// Target
"props": { "content": { "$state": "/navigation/params/employeeId" } }
```

`/navigation/params` is reset on each navigation — for data that persists
across back-navigation, use `/ui/selected*`.

## Column action buttons follow the same pattern

When a button in `columns[].actions[]` is clicked, the framework writes
the row to `/ui/selectedRow` BEFORE dispatching. Action params resolve
at press time (lazy, not render-time):

```json
"columns": [{
  "id": "actions-col",
  "actions": [{
    "icon": "pencil-simple",
    "onPress": [{
      "action": "openModal",
      "params": { "id": "edit-modal", "itemId": { "$state": "/ui/selectedRow/id" } }
    }]
  }]
}]
```

Direct `onRowClick` ActionBinding(s) use the same lazy row-context contract.

## Related concepts

- [[@path-ui-selected-row]]
- [[@path-navigation]]
- [[@action-navigate]]
- [[@primitive-table]]
- [[@antipattern-row-literal]]
- [[@concept-expression-timing]]

## Sources (raw)

- `docs/consumer/ai-context.md § Cross-Screen Data Flow`
