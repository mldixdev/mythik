---
id: primitive-input
title: `input` — text input
kind: primitive
sources: [docs/consumer/ai-context-primitives.md#input]
---

# `input`

Single-line text input. Supports `type` (text, password, email, number,
date, tel, url, color), validators (`checks`), and display masks (`format`).

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | expression | — | Bind via `$bindState` |
| `type` | string | `text` | `text`, `password`, `email`, `number`, `date`, `tel`, `url`, `color` |
| `placeholder` | string/expression | — | Placeholder text |
| `label` | string/expression | — | Field label |
| `disabled` | boolean/expression | `false` | Disable input |
| `readOnly` | boolean | `false` | Read-only mode |
| `required` | boolean | `false` | Visual required indicator |
| `format` | string | — | `phone`, `currency` — display format |
| `formatOptions` | object | — | `{ currency, locale, decimals }` |
| `selectOnFocus` | boolean | `false` | Select all text on focus |
| `checks` | array | — | Inline validators |
| `validateOn` | string | — | `blur` or `change` |

## Events

`on.change`, `on.submit` (fires on Enter — use for login/search).

## Examples

Basic email input:
```json
{ "type": "input", "props": {
  "type": "email",
  "value": { "$bindState": "/form/email" },
  "label": "Email"
}}
```

Currency display mask:
```json
{ "type": "input", "props": {
  "type": "number",
  "value": { "$bindState": "/form/amount" },
  "format": "currency",
  "formatOptions": { "currency": "USD" }
}}
```

Login submit on Enter:
```json
{ "type": "input", "props": { "type": "password", "value": { "$bindState": "/login/password" } },
  "on": { "submit": { "action": "login", "params": { ... } } }
}
```

Color picker:
```json
{ "type": "input", "props": { "type": "color", "value": { "$bindState": "/form/color" } } }
```

## Constraints / Anti-patterns

- **Use `type`, NOT `inputType`.** See [[@antipattern-input-type-name]].
- **`label` is display-only** — does NOT auto-prepend the value.

## Related concepts

- [[@expression-bindstate]]
- [[@concept-validation-checks]]
- [[@concept-forms]]
- [[@concept-identity-label-style]]

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § input`
