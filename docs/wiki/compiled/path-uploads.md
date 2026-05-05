---
id: path-uploads
title: `/ui/uploads/*` — internal upload state
kind: concept
sources: [docs/consumer/ai-context-runtime-semantics.md#27-upload-state-paths]
---

# `/ui/uploads/*`

Per-upload state paths reserved for upload lifecycle (active upload ID,
progress, error, result). **Internal — don't read directly from specs.**

## Internal shape (informational)

For an upload element with id `<elementId>`:
- `/ui/uploads/{elementId}/files` — `[{ name, size, type, progress, status, previewUrl, error }]`

## Why not read directly

The primitive reads `/ui/uploads/*` automatically. The spec author should
read the **`target` path** of `uploadFile` for the final URL(s). Reading
internal state paths breaks future-compatibility.

## Related concepts

- [[@action-upload-file]]
- [[@primitive-file-upload]]
- [[@concept-storage-adapter]]

## Sources (raw)

- `docs/consumer/ai-context-runtime-semantics.md § 2.7`
