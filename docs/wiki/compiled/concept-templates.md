---
id: concept-templates
title: `templates` — reusable element definitions
kind: concept
sources: [docs/consumer/ai-context.md#templates, docs/consumer/reference-doc.md#element-templates-templates]
---

# `templates` — reusable element definitions

Define reusable element shapes once, reference by custom type name in any
screen. Reduces repetition for monetary columns, stat cards, button
variants with content slots, etc.

## Shape / Signature

```json
{
  "templates": {
    "monetary-col": {
      "type": "text",
      "defaults": { "color": "#0F172A", "currency": "HNL" },
      "props": {
        "content": { "$format": "currency", "value": { "$prop": "value" }, "currency": { "$prop": "currency" }, "locale": "es-HN" }
      },
      "style": {
        "textAlign": "right", "fontFamily": "monospace",
        "color": { "$prop": "color" }
      }
    }
  },
  "elements": {
    "col-amount": { "type": "monetary-col", "props": { "value": { "$item": "amount" } } },
    "col-total": { "type": "monetary-col", "props": { "value": { "$item": "total" }, "color": "#D97706" } }
  }
}
```

## Template properties

| Property | Type | Description |
|---|---|---|
| `type` | string | Primitive type the template wraps |
| `defaults` | object | Default prop values |
| `props` | object | Props using `$prop` for parameterization |
| `style` | object | Style using `$prop` |
| `children` | string[] | Child element IDs. Use `"$children"` marker to insert consumer's children |

Templates support all Element fields: `visible`, `hover`, `active`, `motion`,
`animations`, etc.

## Sharing

- AppSpec-level templates available to all screens.
- Screen-level templates override app-level with same name.

## Composite templates with `$let`

When `$prop` needs to flow into `$template`, bridge via `$let`:

```json
"stat-card": {
  "type": "text",
  "defaults": { "label": "Count", "value": 0 },
  "props": {
    "content": {
      "$let": { "l": { "$prop": "label" }, "v": { "$prop": "value" } },
      "$in": { "$template": "${l}: ${v}" }
    }
  }
}
```

## Constraints / Anti-patterns

- Templates are **single elements** — one `type` with props/style/defaults.
  For multi-element compositions, the consuming element defines children
  alongside the template type.
- **Don't duplicate style blocks across specs** — extract to a template or
  variant. See [[@antipattern-style-block-duplication]] +
  [[@concept-templates-vs-variants]].

## Related concepts

- [[@expression-prop]]
- [[@expression-let-ref]]
- [[@concept-template-children-marker]]
- [[@concept-templates-vs-variants]]
- [[@concept-component-variants]]

## Sources (raw)

- `docs/consumer/ai-context.md § Templates`
- `docs/consumer/reference-doc.md § Element Templates (templates)`
