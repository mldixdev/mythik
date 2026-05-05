---
id: expression-format
title: `$format` — value formatting
kind: expression
sources: [docs/consumer/ai-context.md#math--data, docs/consumer/reference-doc.md#expression-types]
---

# `$format` — value formatting

Formats values for display. Operations: `currency`, `number`, `percent`,
`phone`, `uppercase`, `lowercase`, `capitalize`, `truncate`. Extended options
for `currency` and `number` (locale, notation, signDisplay, useGrouping).

## Shape / Signature

```json
{ "$format": "<op>", "value": <expr>, "<...op-specific>": ... }
```

## Examples

Currency:
```json
{ "$format": "currency", "value": { "$state": "/price" }, "currency": "USD" }
{ "$format": "currency", "value": 1234, "currency": "HNL", "locale": "es-HN" }
```

Number with options:
```json
{ "$format": "number", "value": 1234.5, "decimals": 2 }
{ "$format": "number", "value": 1234567, "notation": "compact" }
{ "$format": "number", "value": -500, "signDisplay": "always", "decimals": 2 }
```

Percent:
```json
{ "$format": "percent", "value": 0.75 }
```

Strings:
```json
{ "$format": "uppercase", "value": { "$state": "/name" } }
{ "$format": "capitalize", "value": "hello world" }
{ "$format": "truncate", "value": "long text...", "length": 20 }
```

Phone (display mask, stores raw digits):
```json
{ "$format": "phone", "value": { "$state": "/phone" } }
```

## Extended options for currency / number

| Param | Type | Default | Description |
|---|---|---|---|
| `locale` | string \| Expression | context locale | Override locale per-field |
| `notation` | `"standard"` \| `"compact"` \| `"scientific"` \| `"engineering"` | `"standard"` | Number notation style |
| `signDisplay` | `"auto"` \| `"always"` \| `"exceptZero"` \| `"negative"` | `"auto"` | Sign display mode |
| `useGrouping` | boolean | `true` | Thousands separator on/off |

All optional — existing specs work unchanged.

## Constraints / Anti-patterns

- Use `$format` only in props/derive — not in transactions or `$template`
  (see [[@concept-expression-contexts]]).
- For per-locale formatting, set `locale` (e.g. `"es-HN"`) — overrides the
  context locale per-field.

## Related concepts

- [[@expression-math]]
- [[@expression-date]]
- [[@concept-export-action]] — same column-format options

## Sources (raw)

- `docs/consumer/ai-context.md § Expressions → Math & Data → $format`
- `docs/consumer/reference-doc.md § Expression Types → $format`
