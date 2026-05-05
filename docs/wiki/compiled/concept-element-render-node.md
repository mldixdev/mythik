---
id: concept-element-render-node
title: `ElementRenderNode` — render tree
kind: concept
sources: [docs/consumer/ai-context-custom-elements.md#elementrendernode]
---

# `ElementRenderNode`

Render-tree root and all descendants. Supports the **full primitive
declarative surface**.

## Supported fields

| Field | Notes |
|---|---|
| `type` | Primitive type or nested custom element |
| `props` | Accepts `$prop`, `$state`, `$item`, all expressions |
| `style` | Accepts expressions including `$prop` |
| `children` | `Array<ElementRenderNode \| "$children">` — `"$children"` is the slot marker |
| `repeat` | `{ count, statePath, source, key }` |
| `on` | Event handlers (can be `{ $prop: "..." }` for action-chain consumer prop) |
| `visible` | Show/hide condition |
| `hover` | Style overrides on pointer enter |
| `active` | Style overrides on press |
| `focus` | Style overrides on keyboard focus |
| `transition` | `{ duration, ease }` |
| `motion` | Framer-Motion-style (legacy) |
| `animations` | Animation engine config — this is the `elementDef` cascade level |
| `key` | Forces remount on change |

## `$prop` inside render trees

`{ "$prop": "max" }` reads from the **nearest enclosing** custom-element's
merged props. Nested custom elements push a new prop context — outer
props are shadowed, not inherited (see [[@concept-custom-element-prop-cascade]]).

## `"$children"` marker

Write the literal string `"$children"` as an item in `children` to mark
where consumer-supplied children are inserted. Multiple markers each
splice the full consumer children. Authors can position the slot anywhere.

## Spec-level templates inside render trees

A custom element's render tree may use a type that resolves to a
spec-level template. The expansion propagates `spec.templates` AND
non-colliding `spec.elements` entries onto the expanded sub-spec so the
recursive template dispatch finds the definition (rule 236).

## Related concepts

- [[@concept-element-definition]]
- [[@concept-element-children-slot]]
- [[@concept-custom-element-prop-cascade]]
- [[@concept-custom-element-black-box]]
- [[@concept-custom-element-action-props]]

## Sources (raw)

- `docs/consumer/ai-context-custom-elements.md § ElementRenderNode`
- `docs/consumer/reference-doc.md § rules 227, 236`
