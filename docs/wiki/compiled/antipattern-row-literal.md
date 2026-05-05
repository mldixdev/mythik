---
id: antipattern-row-literal
title: Anti-pattern — `$row` literal
kind: pattern
sources: [docs/consumer/ai-context-runtime-semantics.md#21-uiselectedrow--blocker-1, docs/consumer/ai-context-primitives.md#table, docs/consumer/reference-doc.md#rule-69]
---

# Anti-pattern — `$row` literal

**`$row` does NOT exist** as an expression handler. Writing
`{ "$row": "name" }` in `setState` params, `$template`, or anywhere else
treats the literal string `"$row"` as a value — silent failure.

## Wrong

```json
{ "content": { "$row": "name" } }                                                  // BAD
{ "action": "setState", "params": { "statePath": "/edit/id", "value": "$row" } }   // BAD
```

## Right

Read row data via `$state` from `/ui/selectedRow/<key>` (framework writes
clicked row before column action or `onRowClick` dispatch):

```json
{ "content": { "$state": "/ui/selectedRow/name" } }
{ "content": { "$template": "Editing: ${ /ui/selectedRow/name }" } }
```

For column actions:
```json
"onPress": [{
  "action": "openModal",
  "params": { "id": "edit-modal", "itemId": { "$state": "/ui/selectedRow/id" } }
}]
```

For `onRowClick`:
```json
"onRowClick": [{
  "action": "openDrawer",
  "params": { "id": "detail", "itemId": { "$state": "/ui/selectedRow/id" } }
}]
```

## Why this matters

The framework writes the clicked row to `/ui/selectedRow` before dispatching
table row interactions. Use that path. See [[@path-ui-selected-row]].

## Detection

`mythik lint` rule **`spec-row-literal`** (severity: warning) catches `$row`
in any spec value. Also runs during `mythik validate` and `mythik push`.
See [[@cli-lint]].

## Related concepts

- [[@path-ui-selected-row]]
- [[@primitive-table]]
- [[@expression-state]]
- [[@expression-template]]
- [[@cli-lint]]

## Sources (raw)

- `docs/consumer/ai-context-runtime-semantics.md § 2.1`
- `docs/consumer/ai-context-primitives.md § Table`
- `docs/consumer/reference-doc.md § rule 69, 249`
