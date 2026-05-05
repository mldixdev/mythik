---
id: concept-where-to-look
title: Where-to-Look — source navigation map (overview)
kind: concept
sources: [docs/consumer/WHERE-TO-LOOK.md]
---

# Where-to-Look — source navigation map

Fallback for cases the rest of `docs/consumer/` does not fully cover.
**Use it when**:

1. You've checked the relevant `ai-context-*.md` and `reference-doc.md`
   and the answer is not there.
2. You're doing **deep customization beyond documented extension points**
   (custom actions / `SpecStore`s are first-class; custom plugins follow
   the auth pattern but reach into framework internals; custom server
   middleware is plain Express + the framework's chain shape).
3. You're **debugging runtime behavior** that the docs describe at the
   surface but you need the underlying mechanism.

**Do NOT use it for**:

- Spec syntax, expressions, primitives, actions catalog → use
  ai-context.md + companions.
- Rule lookup → [[@concept-rules-catalog]].
- ApiSpec / server contract surface → [[@concept-api-spec]].
- Runtime behavior reference (timing matrix, reserved state paths, store
  coordination) → [[@concept-expression-timing]] etc. **Read those before
  reaching for source.**

## How source paths work

Paths are relative to the framework repo root.

- **In framework repo / unpacked tarball**: `packages/<package>/src/<path>`
  — TypeScript source. **Authoritative for behavior questions.**
- **In `node_modules/<public-mythik-package>/`**: published artifact ships
  `dist/` only (compiled `.js` + `.d.ts`). `.d.ts` is enough for type-shape
  questions; for behavior questions, fetch `src/` from the GitHub repo or
  unpacked tarball.

When in doubt, prefer reading `src/`. `dist/` is generated and may obscure
intent.

## Customization recipes (Section 1)

- [[@concept-customize-action]]
- [[@concept-customize-spec-store]]
- [[@concept-customize-versioned-store]]
- [[@concept-customize-plugin]]
- [[@concept-customize-validator-rule]]
- [[@concept-customize-cli-lint-rule]]
- [[@concept-customize-server-middleware]]
- [[@concept-customize-expression-handler]]

## Debugging entry points (Section 2)

- [[@concept-debugging-runtime-pointers]]

## Source-of-truth references (Section 3)

- [[@concept-source-of-truth-references]]

## When source-reading is misleading (Section 4)

- [[@concept-source-reading-misleading]]

## Reporting gaps

If you needed to read a source file that this map did NOT anticipate,
that's a signal that either (a) the relevant doc in `docs/consumer/`
should cover it directly, or (b) this map needs an entry. Both are valid
framework-feedback signals.

## Sources (raw)

- `docs/consumer/WHERE-TO-LOOK.md` (full)
