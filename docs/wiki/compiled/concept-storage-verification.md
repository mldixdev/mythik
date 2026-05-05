---
id: concept-storage-verification
title: Storage — post-apply verification
kind: concept
sources: [docs/consumer/ai-context.md#verification-post-apply]
---

# Storage verification (post-apply)

After applying the DDL, verify the relevant tables exist with correct
columns by querying the target's information schema.

## Standard ANSI query

```sql
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME IN ('screens', 'screen_versions', 'screen_environments')
ORDER BY TABLE_NAME, ORDINAL_POSITION;
```

(Consumers using only the base store can drop `screen_versions` +
`screen_environments` from the `IN (...)` list.)

## Confirm column counts

- 7 columns for `screens` (`id`, `name`, `spec`, `version`, `is_active`,
  `created_at`, `updated_at`)
- 10 columns for `screen_versions`
- 5 columns for `screen_environments`

## Postgres-only — verify triggers

```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'screens';
```

Without the two triggers, `updated_at` and `version` will silently stop
advancing on save.

## If verification fails

If any column is missing or has a wrong NULL/NOT NULL flag, abort and
report — the framework's INSERT/SELECT/UPDATE will fail at runtime.

## Related concepts

- [[@concept-storage-overview]]
- [[@concept-storage-postgres-triggers]]
- [[@concept-storage-postgres-jsonb]]
- [[@concept-storage-idempotency]]

## Sources (raw)

- `docs/consumer/ai-context.md § Verification (post-apply)`
