---
id: concept-template-children-marker
title: `"$children"` — template children slot
kind: concept
sources: [docs/consumer/ai-context.md#templates, docs/consumer/reference-doc.md#element-templates-templates]
---

# `"$children"` — template children slot

Authors mark where consumer-supplied children should be inserted by writing
the **string literal** `"$children"` as an item in the template's `children`
array (NOT an expression object — see anti-patterns).

## Shape / Signature

```json
{
  "templates": {
    "card": {
      "type": "box",
      "defaults": { "padding": 16 },
      "style": { "padding": { "$prop": "padding" }, "borderRadius": 12, "backgroundColor": { "$token": "colors.surface" } },
      "children": ["$children"]
    }
  },
  "elements": {
    "my-card": { "type": "card", "children": ["title", "body"] }
  }
}
```

`"$children"` is replaced with the consuming element's actual children
(`["title", "body"]`) at expansion time.

## Multiple slots

Multiple `"$children"` markers each splice the full consumer children
list — the same children render in each slot position.

## Constraints / Anti-patterns

- **`"$children"` is a string literal** — write the bare string in the
  array, NOT `{ "$children": true }`. The expression-object form is
  silently ignored.
- Same slot semantics apply to custom-element render trees — see
  [[@concept-element-children-slot]].

## Related concepts

- [[@concept-templates]]
- [[@concept-element-children-slot]] — Layer 3 equivalent

## Sources (raw)

- `docs/consumer/ai-context.md § Templates`
- `docs/consumer/reference-doc.md § Element Templates → Templates with children`
