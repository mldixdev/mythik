---
id: primitive-table
title: `table`
kind: primitive
sources: [docs/consumer/ai-context-primitives.md#table, docs/consumer/reference-doc.md#table-primitive-enhanced]
---

# `table`

Feature-rich table — sorting, pagination, grouping, selection, formatting,
column actions. Enable features with flags rather than composing from
primitives.

## Top-level props

| Prop | Type | Default | Description |
|---|---|---|---|
| `data` | array/expression | — | Row data array |
| `columns` | array | — | Column definitions (see below) |
| `sorting` | object | — | `{ enabled, mode, default, state }` |
| `pagination` | object | — | `{ enabled, pageSize, mode, state, totalItems }` |
| `selection` | object | — | `{ enabled, mode, state }` |
| `groupBy` | object | — | `{ field, header, footer, expanded, collapsible }` |
| `stickyHeader` | boolean | `false` | Sticky table header |
| `emptyState` | object | — | `{ icon, message }` |
| `rowStyle` | object/expression | — | Per-row style |
| `onRowClick` | action / array / function | — | Action(s) on row click; accepts spec ActionBinding(s) or a programmatic callback |
| `headerStyle` | object | — | Header row style |
| `cellStyle` | object | — | Default cell style |
| `grandTotal` | boolean | `false` | Show grand total row |

## Column props

| Prop | Type | Default | Description |
|---|---|---|---|
| `key` / `field` | string | — | Data field name (both accepted) |
| `label` | string | — | Column header |
| `width` | string | — | CSS grid: `fr` / `px` / `%` |
| `align` | string | `left` | `left` / `center` / `right` |
| `format` | string | — | `currency` / `number` / `percent` / `date` |
| `formatOptions` | object | — | `{ currency, locale, decimals }` |
| `sortable` | boolean | `true` | Allow sorting |
| `visible` | boolean | `true` | Show/hide column |
| `actions` | array | — | `[{ icon, color, onPress }]` |

## Sorting / Pagination modes

- **`client`** — sorts/slices internally.
- **`server`** — writes `{ field, direction }` (sorting) or page number
  (pagination) to `state` path. **`state` is required when mode is `server`.**

## GroupBy

`footer: "subtotal"` auto-sums numeric columns.

## Row interactions

`onRowClick` and `columns[].actions[].onPress` share the same row-context
contract. Before dispatching the action chain, the framework writes the
clicked row to `/ui/selectedRow`. Action params resolve lazily at click
time, so `$state` / `$template` reads against `/ui/selectedRow/<key>` see
the fresh row.

## Examples

Full table:
```json
{
  "type": "table",
  "props": {
    "data": { "$state": "/items" },
    "columns": [
      { "key": "name", "label": "Name", "width": "2fr" },
      { "key": "amount", "label": "Amount", "align": "right",
        "format": "currency", "formatOptions": { "currency": "HNL", "locale": "es-HN" } }
    ],
    "sorting": { "enabled": true, "default": { "field": "amount", "direction": "desc" }, "mode": "client" },
    "pagination": { "enabled": true, "pageSize": 20, "mode": "client" },
    "selection": { "enabled": true, "mode": "multiple", "state": "/selectedIds" },
    "stickyHeader": true,
    "onRowClick": { "action": "openDrawer", "params": { "id": "detail" } }
  }
}
```

Column action with row context:
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

Row click with row context in params:
```json
"onRowClick": [{
  "action": "openDrawer",
  "params": { "id": "detail", "itemId": { "$state": "/ui/selectedRow/id" } }
}]
```

## Constraints / Anti-patterns

- **`onRowClick` and column actions write the row to `/ui/selectedRow`
  automatically** before dispatch (no `setState` needed). See
  [[@path-ui-selected-row]].
- **Use `/ui/selectedRow/<key>`, NOT `$row` literal** — see
  [[@antipattern-row-literal]].
- Row interaction params resolve at press time via `lazyActionPaths`. See

## Related concepts

- [[@path-ui-selected-row]]
- [[@concept-expression-timing]]
- [[@expression-format]]
- [[@action-selection]]

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § Table`
- `docs/consumer/reference-doc.md § Table Primitive (Enhanced)`
