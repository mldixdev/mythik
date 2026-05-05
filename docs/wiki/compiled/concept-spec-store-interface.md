---
id: concept-spec-store-interface
title: `SpecStore` interface — 4 methods
kind: concept
sources: [docs/consumer/ai-context-runtime-semantics.md#54-specstore-layering--save-vs-saveversion-vs-cli-patch, docs/consumer/WHERE-TO-LOOK.md]
---

# `SpecStore` interface

Persistence primitive. **4 methods**: `load`, `save`, `list`, `delete`.

## Interface

```ts
interface SpecStore {
  load(id: string): Promise<unknown | null>;
  save(id: string, doc: unknown): Promise<void>;
  list(): Promise<string[]>;
  delete(id: string): Promise<void>;
}
```

Source: `packages/core/src/spec-engine/types.ts:8-13`.

## `save()` is `@internal`

`SpecStore.save()` is JSDoc-marked `@internal` to signal "persistence
primitive — not for application code". The public `SpecStore` interface
is unchanged; custom adapters still implement `save()`. The signal is
documentation-only — no `--stripInternal` configured. **It warns IDE / AI
readers without breaking the consumer adapter contract.**

## Approved consumer paths (3 forms)

Never call `SpecStore.save()` from app code. Use:
- **Shell**: `mythik push <id> --from-file spec.json`
- **Bulk**: `mythik push --from-dir <folder>`
- **Programmatic**: `runPush` / `runPatch` from `mythik-cli/api`

See [[@cli-push]] + [[@antipattern-store-save-bypass]].

## Custom adapter authoring

If you need a custom store (MongoDB, DynamoDB, etc.), implement the 4
methods. See [[@concept-customize-spec-store]] for the recipe.

## Related concepts

- [[@concept-spec-stores-catalog]]
- [[@concept-spec-store-layering]]
- [[@concept-customize-spec-store]]
- [[@concept-versioned-store]]
- [[@cli-push]]
- [[@antipattern-store-save-bypass]]

## Sources (raw)

- `docs/consumer/ai-context-runtime-semantics.md § 5.4`
- `docs/consumer/WHERE-TO-LOOK.md § Section 1`
