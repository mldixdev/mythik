---
id: action-export
title: `export` — data export
kind: action
sources: [docs/consumer/ai-context.md#skeleton--export, docs/consumer/reference-doc.md#export-action]
---

# `export` — data export

Declarative data export. CSV format is built-in (zero deps); XLSX/PDF require
host-app adapters.

## Shape / Signature

```json
{ "action": "export", "params": {
  "source": "/state/path",
  "columns": [{ "field": "<name>", "label": "<header>", "format"?: "...", "formatOptions"?: { ... } }],
  "filename": "<basename>",
  "format"?: "csv" | "xlsx" | "pdf" | "<custom>"
}}
```

## Examples

CSV export:
```json
{ "action": "export", "params": {
  "source": "/items",
  "columns": [
    { "field": "name", "label": "Name" },
    { "field": "price", "label": "Price", "format": "currency", "formatOptions": { "currency": "USD" } },
    { "field": "createdAt", "label": "Created", "format": "date" }
  ],
  "filename": "report",
  "format": "csv"
}}
```

## Column formatting

| Format | Output | Options |
|---|---|---|
| `currency` | `$1,234.50` | `currency` (code), `decimals`, `locale` |
| `number` | `1,234.50` | `decimals`, `locale` |
| `percent` | `75%` | `decimals`, `locale` |
| `date` | `4/5/2026` | `locale` |

Same Intl formatters as `$format`.

## Constraints / Anti-patterns

- **CSV is always available** — RFC 4180 escaping, downloads as `.csv`.
- **XLSX/PDF require adapters** registered via `exportAdapters` prop on
  `MythikRenderer`. Adapters implement `ExportAdapter.generate(data,
  format) → Promise<Blob>`.

## Related concepts

- [[@expression-format]] — same option set
- [[@primitive-table]] — common pairing

## Sources (raw)

- `docs/consumer/ai-context.md § Skeleton & Export`
- `docs/consumer/reference-doc.md § Export Action`
