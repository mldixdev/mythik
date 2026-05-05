---
id: concept-export-action
title: Export — CSV + adapters
kind: concept
sources: [docs/consumer/reference-doc.md#export-action]
---

# Export — CSV + adapters

Declarative data export with **CSV built-in** (zero deps) and adapter
pattern for XLSX/PDF.

## CSV (always available)

Format `"csv"` is RFC 4180 escaping. Downloads as `.csv` file. Zero deps.

```json
{ "action": "export", "params": {
  "source": "/items",
  "columns": [{ "field": "name", "label": "Name" }, { "field": "price", "label": "Price", "format": "currency" }],
  "filename": "items",
  "format": "csv"
}}
```

## XLSX / PDF — via adapter

Register adapters via `exportAdapters` prop on `MythikRenderer`:

```tsx
<MythikRenderer
  spec={spec}
  instance={svc}
  exportAdapters={{ xlsx: myXlsxAdapter, pdf: myPdfAdapter }}
/>
```

Adapters implement:
```ts
interface ExportAdapter {
  generate(data: ExportData, format: string): Promise<Blob>;
}
```

`ExportData` includes both raw `rows` and pre-formatted `formattedRows`.
XLSX adapters may use raw values with number formatting; PDF adapters
may use formatted strings.

## Related concepts

- [[@action-export]]
- [[@expression-format]]

## Sources (raw)

- `docs/consumer/reference-doc.md § Export Action`
