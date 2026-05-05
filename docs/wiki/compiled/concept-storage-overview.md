---
id: concept-storage-overview
title: Storage setup — three tables
kind: concept
sources: [docs/consumer/ai-context.md#storage-setup, docs/consumer/reference-doc.md#rule-250]
---

# Storage setup — three tables

Mythik stores specs in the consumer's database. **Three tables** depending
on which features the consumer opts into.

| Table | When required |
|---|---|
| **`screens`** (base) | **REQUIRED for every adapter** |
| **`screen_versions`** (opt-in) | Only when using `*VersionedSpecStore` (i.e., `mythik push --author <name>`) |
| **`screen_environments`** (opt-in) | Only when using `*EnvironmentStore` |

**The framework does NOT auto-create any of these tables.** Apply the
schema once during initial setup, then the framework operates against the
running tables.

## Authoritative since v0.1.0

Framework's INSERT/SELECT/UPDATE statements require these exact columns by
name + semantic type. AI applying this schema MUST preserve all columns,
constraints, and indexes; the SQL dialect is free to vary
(NVARCHAR/VARCHAR/TEXT, BIT/BOOLEAN, DATETIME2/TIMESTAMPTZ — pick what
the target DB supports).

## Versioned stores extend the base store

When `SqlServerVersionedSpecStore.saveVersion(id, doc, meta)` runs, it
appends to `screen_versions` AND calls the inherited base `save(id, doc)`
which writes to `screens`. **`screens` MUST exist for every consumer** —
no "versioning-only" mode skips it.

## Why no `mythik migrate` command

Two paths were considered (Item G):
1. Ship a CLI command that generates + executes DDL per adapter.
2. Declare the schema in `ai-context.md` and let the AI apply it.

**Path 2 chosen.** Rationale: Mythik is AI-first; consumer setup already
involves an AI; CLI for AI-only task is redundant. AI faithfully translates
a precise semantic spec across SQL dialects. Schema evolution becomes a doc
update rather than a versioned migration runner. (`mythik migrate` may be
revisited in v0.3+ if multi-store fan-out grows.)

## Bootstrap procedure

1. Configure `.mythikrc` / env vars for the target store.
2. Open `docs/consumer/ai-context.md § Storage Setup`.
3. Hand the schema to your AI assistant; ask it to bootstrap your DB.
4. AI translates → applies idempotently → verifies via INFORMATION_SCHEMA
   (and on Postgres, verifies the two triggers on `screens`).
5. Run `mythik push my-screen --author <name>`.

## Sub-articles

- [[@concept-storage-table-screens]]
- [[@concept-storage-table-versions]]
- [[@concept-storage-table-environments]]
- [[@concept-storage-postgres-jsonb]]
- [[@concept-storage-postgres-triggers]]
- [[@concept-storage-idempotency]]
- [[@concept-storage-verification]]
- [[@concept-storage-custom-names]]
- [[@concept-storage-evolution]]

## Related concepts

- [[@concept-spec-stores-catalog]]
- [[@concept-versioned-store]]
- [[@concept-environment-store]]

## Sources (raw)

- `docs/consumer/ai-context.md § Storage Setup`
- ` § Item G`
- `docs/consumer/reference-doc.md § rule 250`
