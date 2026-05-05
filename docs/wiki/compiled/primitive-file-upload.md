---
id: primitive-file-upload
title: `file-upload`
kind: primitive
sources: [docs/consumer/ai-context-primitives.md#file-upload, docs/consumer/reference-doc.md#file-upload]
---

# `file-upload`

God-primitive: preview, progress, validation, drop zone, auto/manual upload
modes. Use the `uploadFile` action wired to `on.upload`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `accept` | string | `"*"` | MIME types or extensions (`image/*`, `.pdf,.docx`) |
| `maxSize` | number | `10485760` | Max file size in bytes |
| `multiple` | boolean | `false` | Allow multiple files |
| `maxFiles` | number | `10` | Max file count |
| `preview` | boolean | `true` | Show file previews |
| `dropZone` | boolean | `false` | Drop-zone UI |
| `autoUpload` | boolean | `true` | Upload immediately on selection |
| `label` | string/expression | — | Button/zone label (supports `$i18n`) |
| `disabled` | boolean/expression | `false` | Disable |

## Events

`on.upload`.

## Examples

Auto-upload avatar:
```json
{
  "type": "file-upload",
  "props": { "accept": "image/*", "maxSize": 5242880, "autoUpload": true },
  "on": { "upload": { "action": "uploadFile", "params": { "bucket": "avatars", "target": "/form/avatarUrl" } } }
}
```

Manual multi-file upload (in submit chain):
```json
{
  "type": "file-upload",
  "props": { "accept": ".pdf,.docx,.xlsx", "multiple": true, "autoUpload": false }
}
```

## Constraints / Anti-patterns

- **Always set `accept` and `maxSize`.** Defaults protect, explicit is safer.
- **Read URLs from `target`, NOT `/ui/uploads/*`** (rule 55) — internal state.

## Related concepts

- [[@action-upload-file]]
- [[@concept-storage-adapter]]
- [[@pattern-file-upload-auto]] / [[@pattern-file-upload-manual]]
- [[@path-uploads]]

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § file-upload`
- `docs/consumer/reference-doc.md § File Upload`
