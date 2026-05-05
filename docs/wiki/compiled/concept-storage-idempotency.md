---
id: concept-storage-idempotency
title: Storage — idempotency requirement
kind: concept
sources: [docs/consumer/ai-context.md#idempotency-requirement]
---

# Storage idempotency

The applied DDL **MUST be idempotent** — re-running it on a database that
already has the tables MUST NOT fail and MUST NOT recreate.

## Per-dialect "if not exists"

| Dialect | Form |
|---|---|
| SQL Server | `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '...') CREATE TABLE ...` |
| Postgres / Supabase | `CREATE TABLE IF NOT EXISTS ...` |
| MySQL / MariaDB | `CREATE TABLE IF NOT EXISTS ...` |

## Indexes + triggers

Apply the same idempotent guard to indexes and triggers (`CREATE INDEX IF
NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS …;
CREATE TRIGGER …`).

## Related concepts

- [[@concept-storage-overview]]
- [[@concept-storage-verification]]
- [[@concept-storage-evolution]]

## Sources (raw)

- `docs/consumer/ai-context.md § Idempotency requirement`
