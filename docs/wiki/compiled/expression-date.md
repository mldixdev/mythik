---
id: expression-date
title: `$date` — date operations
kind: expression
sources: [docs/consumer/ai-context.md#math--data, docs/consumer/reference-doc.md#expression-types]
---

# `$date` — date operations

Operations on dates. `now`, `today`, `age`, `diff`, `format`, `add`. Units:
`days`, `months`, `years`, `hours`, `minutes`. Patterns: `short`, `long`,
`numeric`, `time`, `datetime`.

## Shape / Signature

```json
{ "$date": "now" }
{ "$date": "today" }
{ "$date": "age", "from": <expr> }
{ "$date": "diff", "from": <expr>, "to": <expr>, "unit": "days" }
{ "$date": "format", "value": <expr>, "pattern": "short" }
{ "$date": "add", "value": <expr>, "amount": 7, "unit": "days" }
```

## Examples

Current timestamp:
```json
{ "$date": "now" }
```

Patient age:
```json
{ "$date": "age", "from": { "$state": "/patient/birthDate" } }
```

Days between two dates:
```json
{ "$date": "diff", "from": { "$state": "/start" }, "to": { "$state": "/end" }, "unit": "days" }
```

Format a date:
```json
{ "$date": "format", "value": { "$state": "/createdAt" }, "pattern": "short" }
```

Date arithmetic — 7 days from now:
```json
{ "$date": "add", "value": { "$date": "now" }, "amount": 7, "unit": "days" }
```

## Constraints / Anti-patterns

- `now` returns the current instant; `today` returns midnight of the
  current day in the active locale.
- For currency-style number formatting, use [[@expression-format]].

## Related concepts

- [[@expression-format]] — formatting dates inside `$format`
- [[@expression-math]] — combine with arithmetic

## Sources (raw)

- `docs/consumer/ai-context.md § Expressions → Math & Data → $date`
- `docs/consumer/reference-doc.md § Expression Types → $date`
