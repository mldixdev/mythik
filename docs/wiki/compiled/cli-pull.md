---
id: cli-pull
title: `mythik pull` — export spec
kind: concept
sources: [docs/consumer/ai-context.md#cli-workflow, docs/consumer/reference-doc.md#cli--spec-modification-via-mythik-cli]
---

# `mythik pull`

Exports a full spec to stdout.

## Examples

```bash
mythik pull task-manager > task-manager.json     # backup
mythik pull task-manager --json                  # always JSON
mythik pull task-manager --store memory          # different store

# Cross-store migration
mythik pull <id> --store A | mythik push <id> --store B
```

## Use cases

- Backup before destructive operation.
- Cross-store migration.
- Inspect / diff specs locally.

## Related concepts

- [[@cli-push]]
- [[@cli-overview]]
- [[@cli-manifest]] — alternative to `pull` for structural inspection
- [[@cli-history]] — for versioned specs

## Sources (raw)

- `docs/consumer/ai-context.md § CLI Workflow`
- `docs/consumer/reference-doc.md § CLI Workflow → Full Spec Lifecycle`
