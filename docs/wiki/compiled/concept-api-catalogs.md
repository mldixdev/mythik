---
id: concept-api-catalogs
title: API catalogs — dropdown sources
kind: concept
sources: [docs/consumer/ai-context-api.md#catalogs]
---

# API catalogs — dropdown sources

Three catalog types for dropdown / picker data.

## Types

```json
"catalogs": {
  "years":        { "from": "TableName", "distinct": "year", "orderBy": "year DESC" },
  "institutions": { "from": "Institution", "value": "id", "label": "name", "orderBy": "name" },
  "categories":   { "from": "Categories", "value": "id", "label": "name", "extra": ["type"] },
  "months":       { "static": [{ "label": "January", "value": "1" }, { "label": "February", "value": "2" }] }
}
```

| Type | Props | Description |
|---|---|---|
| **DB distinct** | `from`, `distinct`, `orderBy` | Unique values from a column |
| **DB value/label** | `from`, `value`, `label`, `extra?`, `orderBy?`, `where?` | Maps columns to `{ label, value }` options |
| **Static** | `static` (array of `{label, value}`) | Hardcoded options |

## Use in frontend

Frontend `select` reads catalog via fetch:
```json
"options": { "$state": "/catalogs/months" }
```

## Related concepts

- [[@concept-api-spec]]
- [[@primitive-select]]
- [[@cli-contract]] — validates frontend filter values match API catalogs

## Sources (raw)

- `docs/consumer/ai-context-api.md § Catalogs`
