---
id: pattern-file-upload-auto
title: Pattern — Auto-upload (autoUpload: true)
kind: pattern
sources: [docs/consumer/ai-context-primitives.md#file-upload]
---

# Pattern — Auto-upload

`autoUpload: true` (default) — file uploaded immediately on selection.
Use for simple cases like avatar uploads.

## Skeleton

```json
{
  "type": "file-upload",
  "props": { "accept": "image/*", "maxSize": 5242880, "autoUpload": true },
  "on": {
    "upload": {
      "action": "uploadFile",
      "params": { "bucket": "avatars", "target": "/form/avatarUrl" }
    }
  }
}
```

## With `path` template

```json
{ "type": "file-upload",
  "props": { "accept": "image/*", "maxSize": 5242880, "autoUpload": true },
  "on": { "upload": {
    "action": "uploadFile",
    "params": {
      "bucket": "avatars",
      "path": { "$template": "users/${/auth/user/id}/${filename}" },
      "target": "/form/avatarUrl"
    }
  }}
}
```

`${filename}` is replaced with original filename.

## Use case

User selects an avatar → upload completes → `/form/avatarUrl` holds the
URL → display via `<image src={ "$state": "/form/avatarUrl" } />`.

## Related concepts

- [[@pattern-file-upload-manual]] — alternative for multi-field forms
- [[@primitive-file-upload]]
- [[@action-upload-file]]
- [[@concept-file-upload-overview]]
- [[@concept-storage-adapter]]

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § file-upload → Auto upload pattern`
