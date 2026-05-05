---
id: concept-environment-store
title: EnvironmentStore — version pointers
kind: concept
sources: [docs/consumer/reference-doc.md#rule-84]
---

# EnvironmentStore

Manages environment promotion pointers. Environments (dev, uat, prod, any
custom name) are pointers to versions:
`{ name, version, promotedAt, promotedBy }`.

## Behavior

- Environments are created **on-demand**.
- `setEnvironment(specId, env, version, author)` creates or moves a pointer.
- Loading by environment = resolve pointer → `loadVersion`.

## Implementations

- `MemoryEnvironmentStore` — in-memory
- `SqlServerEnvironmentStore` — `mythik/server`
- `SupabaseEnvironmentStore` — `mythik` (PostgREST upsert via
  `on_conflict=screen_id,environment`)

## Use case

Multi-env workflow:

1. Push to dev: `mythik push my-screen --author alice`.
2. Promote dev → staging: env pointer for `staging` set to current dev version.
3. Promote staging → prod: env pointer for `prod` set to current staging version.

See [[@concept-promote-gate]] for cross-env validation before promote.

## Related concepts

- [[@concept-storage-table-environments]]
- [[@concept-versioned-store]]
- [[@concept-promote-gate]]
- [[@pattern-git-vs-db-versioning]]

## Sources (raw)

- `docs/consumer/reference-doc.md § rule 84`
