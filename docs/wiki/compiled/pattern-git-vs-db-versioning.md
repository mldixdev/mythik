---
id: pattern-git-vs-db-versioning
title: Pattern — Git-backed vs DB-versioned history
kind: pattern
sources: [docs/consumer/ai-context-runtime-semantics.md#62-git-backed-vs-db-versioned-history]
---

# Pattern — Git-backed vs DB-versioned history

Two history models — pick one per project.

## Git-backed history

- Specs in repo, `git log` + `git blame` serve as audit trail.
- No `--author` flag needed on push/patch.
- CLI writes via `store.save` (unversioned path).
- **Best for**: single-env apps, dev-loop iteration, specs-as-code.

## DB-versioned history

- `--author` flag on push/patch activates `store.saveVersion`.
- Writes a row to `screen_versions` table.
- Enables: `mythik diff`, `mythik rollback`, `mythik promote`,
  `mythik bisect`.
- Audit trail queryable in SQL (who changed what, when).
- **Best for**: multi-env deployments, runtime admin UI, compliance.

## When to enable DB versioning

| Signal | Recommendation |
|---|---|
| Single dev env, specs in git | Skip. Git is enough |
| Separate dev + staging + prod DBs | Enable. Use `mythik promote` |
| Admin UI that edits specs at runtime | Enable. Git can't capture runtime edits |
| Compliance (SOX, HIPAA, etc.) — "who changed screen X on date Y" | Enable. Native SQL audit query beats git log |

## Storage dependency

DB versioning requires `screen_versions` + `screen_environments` tables.
Mythik does not auto-create them; apply the declarative schema from
[[@concept-storage-overview]] in the consumer database before using
versioned stores.

## Related concepts

- [[@cli-versioning-author]]
- [[@concept-versioned-store]]
- [[@concept-environment-store]]
- [[@concept-promote-gate]]
- [[@cli-history]]
- [[@pattern-push-vs-patch]]

## Sources (raw)

- `docs/consumer/ai-context-runtime-semantics.md § 6.2`
