---
id: concept-file-upload-overview
title: File upload — overview
kind: concept
sources: [docs/consumer/ai-context-primitives.md#file-upload, docs/consumer/reference-doc.md#file-upload]
---

# File upload — overview

The `file-upload` primitive is a god-primitive: preview, progress,
validation, drop zone, auto/manual upload modes. Wired via `uploadFile`
action.

## Architecture

| Layer | Owns |
|---|---|
| Spec author | `<file-upload>` element + `on.upload → uploadFile` action |
| Framework primitive | UI, progress tracking, retries, `/ui/uploads/*` internal state |
| `uploadFile` action | Validation, dispatch to StorageAdapter, write URL to `target` |
| StorageAdapter (host-app) | The actual upload — Supabase, custom URL, etc. |

## Two upload modes

- **Auto** (default): file uploaded immediately on selection. Use for
  simple cases (avatar). See [[@pattern-file-upload-auto]].
- **Manual**: file selected + previewed; upload triggered later in an
  action chain (typically before `submitForm`). See
  [[@pattern-file-upload-manual]].

## Required props on every file-upload

Always set `accept` (MIME types) and `maxSize`. Defaults protect (10 MB,
any type), but explicit is safer for UX and security (rule 53).

## URL handling

- Single file → `target` receives a URL string.
- Multiple files → `target` receives a URL array.
- **Read URLs from `target`, NOT from `/ui/uploads/*`** — that path is
  internal (rule 55). See [[@path-uploads]].

## Related concepts

- [[@primitive-file-upload]]
- [[@action-upload-file]]
- [[@concept-storage-adapter]]
- [[@pattern-file-upload-auto]]
- [[@pattern-file-upload-manual]]
- [[@path-uploads]]

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § file-upload`
- `docs/consumer/reference-doc.md § File Upload`
