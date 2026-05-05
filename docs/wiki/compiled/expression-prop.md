---
id: expression-prop
title: `$prop` — template/element-def prop reference
kind: expression
sources: [docs/consumer/ai-context.md#expressions, docs/consumer/ai-context-custom-elements.md#elementrendernode, docs/consumer/ai-context-runtime-semantics.md#14-prop-cascade-layer-3-custom-elements]
---

# `$prop` — template/element-def prop reference

`$prop` references a prop passed to a template OR a custom element. Inside a
template's body or a custom element's `render` tree, `$prop` reads from the
nearest enclosing element's merged props (consumer props + defaults).

## Shape / Signature

```json
{ "$prop": "<propName>" }
```

## Examples

Inside a template body:
```json
"templates": {
  "monetary-col": {
    "type": "text",
    "defaults": { "color": "#0F172A", "currency": "HNL" },
    "props": {
      "content": { "$format": "currency", "value": { "$prop": "value" }, "currency": { "$prop": "currency" } }
    },
    "style": { "color": { "$prop": "color" } }
  }
}
```

Inside a custom element render tree:
```json
{
  "type": "rating-stars",
  "props": { "max": { "type": "number", "default": 5 } },
  "render": {
    "type": "icon",
    "props": { "name": "star" },
    "repeat": { "count": { "$prop": "max" } }
  }
}
```

Action-chain prop (Layer 3 custom element):
```json
"render": {
  "type": "touchable",
  "on": { "press": { "$prop": "onSelect" } }
}
```

## Resolution scope

`$prop` is **nearest-enclosing-scoped**:
- Inside a template: resolves against THAT template's merged props.
- Inside a custom element render tree: resolves against THAT custom
  element's merged props.
- Nesting a custom element pushes a new prop context — outer's props are
  shadowed, NOT inherited.

## Constraints / Anti-patterns

- **`$prop` in `$template` needs `$let` to bridge.** `$template` references
  `${name}` only resolve `$let` bindings. Use `$let` to capture `$prop` first.
- **Pass values explicitly when nested access is needed.** Don't assume
  `$prop` reaches into outer custom-element props.
- `$prop` is resolved **eagerly** at each cascade level with the consumer's
  values. Inner `$state`/`$template` inside a consumer-supplied `$prop`
  action chain stay LAZY (resolved at dispatch).

## Related concepts

- [[@concept-prop-cascade]] — full cascade contract
- [[@concept-templates]] — template prop usage
- [[@concept-custom-elements]] — Layer 3 authoring
- [[@concept-custom-element-prop-cascade]] — nesting semantics
- [[@concept-custom-element-action-props]] — action-chain props
- [[@expression-let-ref]] — bridge `$prop` into `$template`

## Sources (raw)

- `docs/consumer/ai-context.md § Expressions → State & Binding → $prop`
- `docs/consumer/ai-context-custom-elements.md` (full)
- `docs/consumer/ai-context-runtime-semantics.md § 1.4`
