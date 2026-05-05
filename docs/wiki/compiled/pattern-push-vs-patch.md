---
id: pattern-push-vs-patch
title: Pattern - Push vs Patch (file-first vs DB-first)
kind: pattern
sources: [docs/consumer/ai-context-runtime-semantics.md#61-push-vs-patch--file-first-vs-db-first]
---

# Pattern - Push vs Patch

Two paradigms for modifying specs. Pick one per project; mixing creates
issues.

## Push paradigm (file-first)

- Specs live in git under `specs/*.json`.
- Modify locally, then run `mythik push <id>`.
- Diff-reviewable in CI through normal JSON file diffs.
- Full-spec bandwidth cost per write.

## Patch paradigm (DB-first)

- Specs live in the DB; local files are optional working snapshots.
- Modify via `mythik patch <id> --from-file patch.json` for shell-safe
  surgical writes.
- Requires `mythik pull <id>` to refresh any local `specs/*.json` snapshot
  after a DB patch.

## Decision table

| Use case | Recommended | Rationale |
|---|---|---|
| Specs committed to git, CI gating | Push | Git log is the source of truth |
| Single-spec surgical edit | Patch | Surgical change |
| Runtime admin UI editing specs | Patch (DB-first) | DB is the source of truth |
| Multi-environment deploy | Push + DB versioning | Git for dev, versioned promote for env move |
| Large refactor across many specs | Push | Bulk easier; patch chains get fragile |

## Mixing warning

Do not `patch` and later `push` from stale `specs/*.json`. In DB-first
workflows, the DB is source of truth; local files are bootstrap/snapshot
artifacts until refreshed from `mythik pull <id>`.

## Related concepts

- [[@cli-push]]
- [[@cli-patch]]
- [[@cli-pull]]
- [[@pattern-git-vs-db-versioning]]
- [[@cli-versioning-author]]

## Sources (raw)

- `docs/consumer/ai-context-runtime-semantics.md` 6.1
