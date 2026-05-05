---
id: antipattern-store-save-bypass
title: Anti-pattern — `store.save()` bypass
kind: pattern
sources: [docs/consumer/ai-context.md#cli-is-the-only-approved-path-for-spec-writes, docs/consumer/ai-context-runtime-semantics.md#54-specstore-layering--save-vs-saveversion-vs-cli-patch]
---

# Anti-pattern — `store.save()` from app code

Calling `SpecStore.save()` directly from application code **bypasses
validation** and produces silently-broken specs that fail only at render
time.

## Wrong

```ts
// In app code:
import { SupabaseSpecStore } from 'mythik';

const store = new SupabaseSpecStore({ ... });
await store.save('my-screen', specObject);   // BAD — no validation
```

## Right — three approved paths

```ts
// Programmatic (best for tooling/CI):
import { runPush } from 'mythik-cli/api';
await runPush({ id: 'my-screen', spec: specObject });
```

```bash
# Shell:
mythik push my-screen --from-file spec.json

# Bulk:
mythik push --from-dir ./specs/
```

## Why

`SpecStore.save()` is `@internal` — JSDoc-marked. The CLI / engine path
runs the document handler validation BEFORE persisting. Bypassing this
skips validation entirely → renders fail with cryptic errors at runtime.

## Detection (lint)

`mythik lint` rule **`code-store-save-bypass`** (severity: **error**)
matches `<Identifier>.save()` callees in code outside `packages/core/`
and `packages/cli/`.

**Known scope limitations** — does NOT detect:
- `this.store.save()`
- `<obj>.<store>.save()`
- `(await getStore()).save()`

These slip through the AST scanner. The lint rule is one layer of
defense-in-depth, not a complete catch.

## Related concepts

- [[@concept-spec-store-interface]]
- [[@concept-spec-store-layering]]
- [[@cli-push]]
- [[@cli-programmatic-api]]
- [[@cli-lint]]

## Sources (raw)

- `docs/consumer/ai-context.md § CLI is the only approved path for spec writes`
- `docs/consumer/ai-context-runtime-semantics.md § 5.4`
- `docs/consumer/reference-doc.md § rules 248, 249`
