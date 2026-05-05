---
id: concept-source-reading-misleading
title: When source-reading is the wrong tool
kind: concept
sources: [docs/consumer/WHERE-TO-LOOK.md]
---

# When source-reading is misleading

Cases where reading source is **actively misleading**.

## Don't read

| File pattern | Why |
|---|---|
| `packages/*/dist/` | Compiled output — read `src/` instead. `dist/` is regenerated on every `pnpm build` and obscures intent (minified, stripped comments, transpiled control flow) |
| `packages/*/tests/` | Test fixtures often use internal hooks (`MemorySpecStore` constructors with seed data, mocked `loadTypeScript`) that are not part of the public API. Useful for understanding test setup, NOT as a guide to consumer usage |
| `vendor.d.ts` files | Third-party type re-exports (`mssql`, `@supabase/supabase-js`). Not Mythik API |
| `packages/*/src/index.ts` re-exports | Declare the public surface but contain no behavior. For "how does X work?" questions, follow the import to the actual implementation file |
| `packages/core/src/auth/` and other framework-internal plugin-style features | The auth subsystem is the canonical plugin example, but its INTERNALS (`engine.ts`, `refresh-engine.ts`, `persistence.ts`, `cross-tab.ts`) can change between framework versions. Treat as reference for SHAPE of a plugin, not as stable extension contract for the auth-plugin's own internals |

## Reporting gaps

If you needed to read a source file that the WHERE-TO-LOOK map did NOT
anticipate, that's a signal the docs need an entry. Open a docs PR or
record in your issue tracker.

## Related concepts

- [[@concept-where-to-look]]
- [[@concept-source-of-truth-references]]
- [[@concept-debugging-runtime-pointers]]
- [[@concept-customize-plugin]]

## Sources (raw)

- `docs/consumer/WHERE-TO-LOOK.md § Section 4`
