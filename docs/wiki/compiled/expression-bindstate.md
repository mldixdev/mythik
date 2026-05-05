---
id: expression-bindstate
title: `$bindState` — two-way binding
kind: expression
sources: [docs/consumer/ai-context.md#expressions, docs/consumer/reference-doc.md#expression-types]
---

# `$bindState` — two-way binding

`$bindState` reads AND writes a state path. Use it on form-input value props
(`input`, `textarea`, `select`, `checkbox`, `toggle`, `slider`, `tabs`) so the
input reads its current value AND writes back to state on every change event.

## Shape / Signature

```json
{ "$bindState": "/path/to/value" }
```

## Examples

Text input bound to form state:
```json
{ "type": "input", "props": { "value": { "$bindState": "/form/email" } } }
```

Checkbox uses `checked` (NOT `value`):
```json
{ "type": "checkbox", "props": { "checked": { "$bindState": "/form/agreed" }, "label": "I agree" } }
```

Tabs:
```json
{ "type": "tabs", "props": { "value": { "$bindState": "/ui/activeTab" }, "items": [...] } }
```

## Resolution timing

`$bindState` is **eager read at render** + **write on event**. There is no
"resolve at press" semantics — the framework wires both directions at render.

## Constraints / Anti-patterns

- `checkbox` and `toggle` use the `checked` prop, **not `value`** — see
  [[@antipattern-checkbox-toggle-value]].
- Don't use `$bindState` on display-only props (`text.content`,
  `image.src`) — there's nothing to write back. Use [[@expression-state]].
- For dropdown patterns where consumer drives `applyPreset`, use
  `$bindState` on `value` + `$state` in the action params (see
  [[@concept-preset-dropdown-pattern]]). `$event` does NOT exist as an
  expression — see [[@antipattern-event-expression]].

## Related concepts

- [[@expression-state]] — read-only equivalent
- [[@expression-binditem]] — two-way binding inside `repeat`
- [[@concept-forms]] — coordinated form state via `$bindState`
- [[@antipattern-event-expression]]

## Sources (raw)

- `docs/consumer/ai-context.md § Expressions → State & Binding`
- `docs/consumer/reference-doc.md § Expression Types → $bindState`
