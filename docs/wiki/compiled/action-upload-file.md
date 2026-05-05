---
id: action-upload-file
title: `uploadFile` / `deleteFile`
kind: action
sources: [docs/consumer/ai-context-primitives.md#file-upload, docs/consumer/reference-doc.md#file-upload]
---

# `uploadFile` / `deleteFile`

File-upload actions. Use **`uploadFile`** instead of custom `fetch` with
FormData — the action handles validation, progress tracking, retry, and
state management.

## Shape / Signature

```json
{ "action": "uploadFile", "params": {
  "bucket": "<storage-bucket>",
  "target": "/state/path",
  "path"?: "<string-or-$template>"
}}

{ "action": "deleteFile", "params": {
  "path": "<file-path>",
  "bucket": "<storage-bucket>"
}}
```

## Examples

Auto-upload (avatar):
```json
{
  "type": "file-upload",
  "props": { "accept": "image/*", "maxSize": 5242880, "autoUpload": true },
  "on": { "upload": { "action": "uploadFile", "params": {
    "bucket": "avatars",
    "path": { "$template": "users/${/auth/user/id}/${filename}" },
    "target": "/form/avatarUrl"
  }}}
}
```

Manual upload with custom path (in a submit chain):
```json
"on": { "press": [
  { "action": "uploadFile", "params": { "bucket": "docs", "target": "/form/attachmentUrl" } },
  { "action": "submitForm", "params": { "formId": "my-form", "url": "...", "method": "POST", "body": { "attachment": { "$state": "/form/attachmentUrl" } } } }
]}
```

Delete:
```json
{ "action": "deleteFile", "params": { "path": { "$state": "/form/avatarPath" }, "bucket": "avatars" } }
```

## Behavior

- Validates against `accept` + `maxSize`.
- Uploads via configured StorageAdapter with progress tracking.
- Single file → `target` receives a URL string.
- Multiple files → `target` receives a URL array.
- Progress tracked at `/ui/uploads/{elementId}/files` (internal — don't
  read directly).
- On failure: 1 automatic retry after 1s, then `error` status with retry
  button.

## Constraints / Anti-patterns

- **Always set `accept` and `maxSize`** on the `file-upload` element —
  framework defaults (10MB, any type) protect, but explicit is safer
  (rule 53).
- **Read URLs from `target`, NOT from `/ui/uploads/*`** — internal state
  is for the primitive's progress UI (rule 55).
- Path supports `${filename}` placeholder for original filename.

## Related concepts

- [[@primitive-file-upload]]
- [[@concept-storage-adapter]] — host-app StorageAdapter
- [[@pattern-file-upload-auto]] / [[@pattern-file-upload-manual]]
- [[@path-uploads]]

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § file-upload`
- `docs/consumer/reference-doc.md § File Upload`
