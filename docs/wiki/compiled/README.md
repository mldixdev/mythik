# Mythik - Compiled Wiki

Compiled from `docs/consumer/` into **327 atomic articles**. The wiki is optimized for AI consumption: each article is one concept, and `_index.md` is the flat searchable graph.

## Reading order for first-time spec authoring

1. [concept-spec-structure](concept-spec-structure.md) - flat tree shape, root, elements, and initial actions.
2. [concept-element-properties](concept-element-properties.md) - what every element accepts.
3. [concept-spec-types](concept-spec-types.md) - Screen vs AppSpec vs ApiSpec.
4. [concept-expression-contexts](concept-expression-contexts.md) and [concept-expression-timing](concept-expression-timing.md) - where expressions work and when they resolve.
5. [concept-primitives-overview](concept-primitives-overview.md) and [primitive-spatial-map](primitive-spatial-map.md) - primitives, including the spatial-map editor surface.
6. [cli-existing-spec-edit-loop](cli-existing-spec-edit-loop.md) - required loop for modifying existing persisted specs.
7. [cli-docs](cli-docs.md) - locate or copy the bundled AI documentation after `npm install`.

## Publish notes

- Public package names are unscoped: `mythik`, `mythik-react`, `mythik-cli`, `mythik-server`.
- React Native work is a repository preview track, not part of the initial npm publish surface.
- The wiki metadata folder is not publish content.
- `docs/consumer` remains the canonical source.

## Catalog

- [Actions](#actions) - 19
- [Anti-patterns](#anti-patterns) - 21
- [CLI](#cli) - 19
- [Concepts](#concepts) - 177
- [Expressions](#expressions) - 22
- [Paths](#paths) - 13
- [Patterns](#patterns) - 18
- [Primitives](#primitives) - 38

See [_index.md](_index.md) for the flat article graph and [_lint.md](_lint.md) for current health checks.
