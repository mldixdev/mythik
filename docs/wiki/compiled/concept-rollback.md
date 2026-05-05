---
id: concept-rollback
title: Rollback — `executeRollback`
kind: concept
sources: [docs/consumer/reference-doc.md#rule-88]
---

# Rollback — `executeRollback`

`executeRollback(specId, toVersion)` creates **vN+1 with the content of
the target version**. Never rewrites history.

## Behavior

- All intermediate versions are **preserved**.
- Impact analysis shows lost changes with author attribution and affected
  environments.
- Moving an environment pointer is a separate operation via `envs --set`.

## Why never rewrite history

Rewriting history (deleting versions or in-place edits) breaks audit
trails. Always-forward versioning preserves the full history while still
letting you "undo" by promoting a previous version's content as the new
current state.

## Related concepts

- [[@concept-versioned-store]]
- [[@concept-environment-store]]
- [[@cli-history]]
- [[@concept-versioning-snapshots-patches]]

## Sources (raw)

- `docs/consumer/reference-doc.md § rule 88`
