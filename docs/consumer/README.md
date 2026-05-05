# Mythik — Consumer Documentation

Everything an AI or developer building apps with Mythik needs. **This is the publish surface** — when Mythik publishes to a clean repo, this folder ships verbatim. Nothing outside `docs/consumer/` is part of the public framework distribution.

## What's here

| File | Purpose |
|---|---|
| `ai-context.md` | Core spec-gen reference — expressions, actions, primitives, transactions, forms, derive, dataSources, AppSpec, design tokens, versioning storage setup |
| `ai-context-api.md` | ApiSpec server section — catalogs, endpoints, auth, audit |
| `ai-context-custom-elements.md` | Layer 3 custom element authoring — ElementDefinition, variants, black-box contract |
| `ai-context-patterns.md` | Composition patterns + anti-patterns when combining 2+ features |
| `ai-context-primitives.md` | Per-primitive props tables (38 primitives) |
| `ai-context-runtime-semantics.md` | Runtime behavior reference — expression timing, reserved state paths, server contracts, store coordination |
| `reference-doc.md` | Full rule catalog (283 rules) — exhaustive consumer-facing reference |
| `WHERE-TO-LOOK.md` | Source navigation map — which framework file to read for deep-customization or runtime-debugging cases the docs above do not fully cover. Fallback only; check the relevant `ai-context-*.md` first. |

## Reading order

For first-time spec generation: `ai-context.md` is the entry point. It declares the other files as companion modules to read on demand.

For full rule lookup: `reference-doc.md` is the comprehensive catalog.

For deep customization or "why does X happen" debugging that the other files do not answer: `WHERE-TO-LOOK.md` maps question types to canonical framework source files.

## Bucket criterion (where new docs go)

A document goes in `docs/consumer/` if and only if **a consumer (AI or human) building apps with Mythik needs to read it to do their job**. Examples:

- Spec syntax, primitives, expressions → `docs/consumer/`
- Storage setup specs (e.g., versioning tables) → `docs/consumer/`

A document goes in `docs/` (framework-dev / not in this folder) if it's only useful for **framework contributors, maintainers, or testers**:

- Internal session notes, internal sweeps, audit reports → `docs/`
- Framework roadmap, production-gaps analyses → `docs/`
- Test scenarios + test results for framework validation → `docs/`
- Marketing material, executive overviews → `docs/`
- Design specs and implementation notes → internal docs
- Internal feedback → internal docs

## What's NOT here

The framework's working repo keeps internals — session notes, design specs, implementation notes, feedback, analyses — at `docs/` (parent of this folder). That material does not publish.
