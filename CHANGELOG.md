# Changelog

All notable public changes to Mythik are documented in this file.

## 0.1.2

Patch release focused on published-package hardening.

- Fixed DNA numeric seed normalization so legacy `0-100` values such as `roundness: 79` normalize the same way during initial AppSpec load and runtime `updateTokens`.
- Fixed transaction rollback error handling so `/tx/error` is written after rollback and preserves backend error details (`message`, `code`, HTTP `status`, raw `data`) plus custom `Error` properties.
- Fixed scoped offset-pagination totals for generated counts by applying `scopeFilter` before `COUNT(*)`, so `total` matches the same tenant/role slice as returned rows.
- Added `{{scopeWhere[:alias]}}` and `{{scopeAnd[:alias]}}` macros for custom `endpoint.count` SQL with `scopeFilter`, including bypass-role expansion to an empty clause.

## 0.1.1

Patch release for package identity and install-surface alignment.

- Updated workspace package versions and README install examples to the `0.1.1` public package line.
- Kept package names aligned with the public npm surface: `mythik`, `mythik-react`, `mythik-cli`, `mythik-server`, and `mythik-react-native`.

## 0.1.0

Initial public release.

- Published the public npm package surface: `mythik`, `mythik-react`, `mythik-cli`, `mythik-server`, and `mythik-react-native`.
- Added the core spec runtime, state store, expression engine, action dispatcher, validation rules, spec stores, versioning, and editor session infrastructure.
- Added the React runtime with `MythikApp`, built-in primitives, app navigation, auth integration, forms, data sources, transactions, uploads, exports, and runtime diagnostics.
- Added the `spatial-map` primitive for generic SVG-based spatial editors, including selection, item and zone editing, snap/guides, resize/rotate, polygon zone editing, and JSON-first persistence hooks.
- Added the CLI write gate for safe spec workflows: manifest inspection, element inspection, push, patch, validate, lint, history, rollback, promotion, and programmatic API support.
- Added the declarative REST server package for `ApiSpec`-driven endpoints, auth policy, catalogs, CRUD, row-level scope, and server validation.
- Documented React Native as preview while the web, CLI, core, and server packages are the primary public surface.
