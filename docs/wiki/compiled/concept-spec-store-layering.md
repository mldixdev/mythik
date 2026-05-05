---
id: concept-spec-store-layering
title: SpecStore layering - `save` vs `saveVersion` vs CLI patch
kind: concept
sources: [docs/consumer/ai-context-runtime-semantics.md#54-specstore-layering--save-vs-saveversion-vs-cli-patch]
---

# SpecStore layering

Persistence layer has distinct paths used at different levels.
Understanding the layering prevents bypassing validation.

## Layers

| Path | Validates? | Use |
|---|---|---|
| `store.save(id, doc)` | **NO** | Low-level persistence primitive. `@internal`. Never from app code. |
| `store.saveVersion(id, doc, meta)` | **NO** | Versioned write. Writes to `screen_versions` and updates the current spec. |
| `SpecEngine.patch(id, patches)` | **YES** | Applies RFC-6902 patches, validates through the document handler, and persists the patched document through `store.save`. |
| `mythik push` / `runPush` | **YES** | Validates and writes through `saveVersion` when a versioned store + author are used. |
| `mythik patch` / `runPatch` | **YES** | Uses `SpecEngine.patch` for patch application + validation. Without author, persists through `store.save`; with a versioned store + author, captures the patched document and writes once through `saveVersion`. |

## Consumer rule

**Never call `store.save()` from application code.** Use:

- `mythik push <id>` / `mythik patch <id> --from-file patch.json` for shell work.
- `runPush` / `runPatch` from `mythik-cli/api` for programmatic work.

See [[@antipattern-store-save-bypass]] and [[@cli-lint]].

## Implementation files

- `packages/core/src/spec-engine/types.ts` - `SpecStore` interface.
- `packages/core/src/spec-engine/engine.ts` - patch validate and base persist flow.
- `packages/cli/src/commands/push.ts` - CLI push versioning path.
- `packages/cli/src/commands/patch.ts` - CLI patch versioning path.

## Related concepts

- [[@concept-spec-store-interface]]
- [[@concept-versioned-store]]
- [[@cli-push]]
- [[@cli-patch]]
- [[@cli-programmatic-api]]
- [[@antipattern-store-save-bypass]]
- [[@concept-spec-engine]]

## Sources (raw)

- `docs/consumer/ai-context-runtime-semantics.md` 5.4
