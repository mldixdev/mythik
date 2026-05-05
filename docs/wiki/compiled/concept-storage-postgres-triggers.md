---
id: concept-storage-postgres-triggers
title: Storage — Postgres triggers for `screens`
kind: concept
sources: [docs/consumer/ai-context.md#postgres--supabase-triggers-for-screensupdated_at-and-screensversion]
---

# Postgres / Supabase: triggers for `screens.updated_at` and `screens.version`

On Postgres-flavored backends, these two columns MUST be maintained by
**`BEFORE UPDATE` triggers** because the Supabase save path sends only
the `spec` field — it does NOT update `updated_at` or `version` itself.

## Why SQL Server doesn't need this

SQL Server stores set both columns app-level inside the MERGE
(`sqlserver.ts:74`: `UPDATE SET spec = @spec, updated_at = GETUTCDATE(),
version = version + 1`).

## Recommended trigger pair on Postgres

```sql
CREATE OR REPLACE FUNCTION screens_update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION screens_increment_version()
RETURNS TRIGGER AS $$ BEGIN NEW.version = OLD.version + 1; RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER screens_updated_at_trigger
  BEFORE UPDATE ON screens
  FOR EACH ROW EXECUTE FUNCTION screens_update_updated_at();

CREATE TRIGGER screens_version_trigger
  BEFORE UPDATE ON screens
  FOR EACH ROW EXECUTE FUNCTION screens_increment_version();
```

Trigger function names are arbitrary (use any unique name); the framework
does not introspect them.

## Other tables don't need triggers

`screen_versions` and `screen_environments` are append-only / upsert-on-PK
and the framework writes all columns explicitly on each INSERT/UPSERT.

## Verification

Verify the triggers exist via `information_schema.triggers WHERE
event_object_table = 'screens'`. Without them, `updated_at` and `version`
will silently stop advancing on save.

## Related concepts

- [[@concept-storage-overview]]
- [[@concept-storage-postgres-jsonb]]
- [[@concept-storage-verification]]

## Sources (raw)

- `docs/consumer/ai-context.md § Postgres / Supabase: triggers for screens.updated_at and screens.version`
