---
id: concept-storage-custom-names
title: Storage — custom table names + identifier safety
kind: concept
sources: [docs/consumer/ai-context.md#custom-table-names]
---

# Storage — custom table names + identifier safety

All three table names are independently configurable; overriding one does
not require overriding the others.

## Override per store

```ts
new SqlServerSpecStore({ ..., table: 'my_screens' })
new SqlServerVersionedSpecStore({ ..., table: 'my_screens', versionsTable: 'my_versions' })
new SqlServerEnvironmentStore({ ..., table: 'my_envs' })
```

(`SqlServerVersionedSpecStore` accepts both `table` and `versionsTable`
since it extends `SqlServerSpecStore`.)

## AI applies custom names directly

If a consumer overrides any name, AI applies the same schema under the
chosen name.

## Identifier-safety scope (SQL Server)

SQL Server stores enforce `assertValidIdentifier` on every configured
name:
- regex `/^[a-zA-Z_][a-zA-Z0-9_.]*$/`
- max 128 chars

Source: `packages/core/src/security/identifier-guard.ts`. Validator
invoked in constructors of `SqlServerSpecStore` (line 26),
`SqlServerVersionedSpecStore` (line 25), `SqlServerEnvironmentStore`.

This blocks SQL injection via table-name interpolation in
`[${table}]` / `[${versionsTable}]` template literals.

## Supabase does NOT validate

Supabase stores do NOT validate any configured name (it flows directly
into the REST URL via `${this.tableName}`); consumer code passing
user-controlled table names to a Supabase store **must validate them
upstream**.

## CLI `--table` flag

Overrides store table for any command:
```bash
mythik validate my-api --table api_specs
```

Environment and version tables are NOT affected — they always use their
fixed names (`screen_environments`, `screen_versions`) (rule 91).

## Related concepts

- [[@concept-storage-overview]]
- [[@concept-spec-stores-catalog]]
- [[@cli-overview]]

## Sources (raw)

- `docs/consumer/ai-context.md § Custom table names`
- `docs/consumer/reference-doc.md § rule 91`
