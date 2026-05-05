---
id: concept-spec-engine
title: `SpecEngine` - patch / validate / save flow
kind: concept
sources: [docs/consumer/ai-context-runtime-semantics.md#54-specstore-layering--save-vs-saveversion-vs-cli-patch]
---

# `SpecEngine`

The validated orchestration layer above `SpecStore` for patch operations.
It applies RFC-6902 patches, runs DocumentHandler validation, short-circuits
on error, and persists the patched document through `store.save`.

## Methods (representative)

- `patch(id, patches)` - validated patch flow.
- `delete(id)` - delete through the store.

Version history is not created inside `SpecEngine.patch`. CLI/API
`runPatch` uses it for patch application + validation; when a versioned
store + author are present, `runPatch` captures the patched document and
writes once through `saveVersion`.

## Why this matters

`SpecStore.save()` is the persistence primitive (no validation).
`SpecEngine` adds the validation gate. Bypassing the CLI/API path is the
root cause of specs that fail later at render time; see
[[@antipattern-store-save-bypass]].

## Source

- `packages/core/src/spec-engine/types.ts` - `SpecStore` interface.
- `packages/core/src/spec-engine/engine.ts` - `SpecEngine.patch`.
- `packages/cli/src/commands/patch.ts` - CLI patch versioning wrapper.

## Related concepts

- [[@concept-spec-store-layering]]
- [[@concept-spec-store-interface]]
- [[@cli-push]]
- [[@cli-patch]]
- [[@antipattern-store-save-bypass]]

## Sources (raw)

- `docs/consumer/ai-context-runtime-semantics.md` 5.4
