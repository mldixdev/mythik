---
id: concept-customize-plugin
title: Customize — custom plugin (auth-style)
kind: concept
sources: [docs/consumer/WHERE-TO-LOOK.md]
---

# Customize — custom plugin

For auth-style cross-cutting features.

## Read order

1. **`packages/core/src/plugins/loader.ts`** — `PluginLoader` shape +
   plugin registration.
2. **`packages/core/src/auth/engine.ts`** + `auth/refresh-engine.ts` +
   `auth/persistence.ts` + `auth/cross-tab.ts` — auth as the canonical
   plugin example.
3. **`packages/react/src/MythikApp.tsx`** — `onPlugins` integration point.

## Why auth is the canonical example

Auth registers actions, exposes context, and can wrap fetch — all the
plugin extension points exercised end-to-end.

## Caveat — auth internals are not stable contract

The auth subsystem is the canonical plugin example, but its **internals**
(`engine.ts`, `refresh-engine.ts`, `persistence.ts`, `cross-tab.ts`) can
change between framework versions. Treat as reference for the **shape**
of a plugin, NOT as stable extension contract for the auth-plugin's own
internals (rule from "Section 4").

## Related concepts

- [[@concept-action-middleware]]
- [[@concept-customize-action]]
- [[@concept-where-to-look]]
- [[@concept-source-reading-misleading]]

## Sources (raw)

- `docs/consumer/WHERE-TO-LOOK.md § Section 1 → custom plugin`, § Section 4
