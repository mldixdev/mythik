# Changelog

All notable public changes to Mythik are documented in this file.

## 0.1.4

Patch release focused on install-surface hygiene and runtime diagnostics.

### Changed

- Moved SQL adapters (`mssql`, `pg`, `mysql2`, and `better-sqlite3`) from installed-by-default optional dependencies to optional peer dependencies. Browser-only installs no longer pull database drivers; SQL-backed stores and servers install the selected driver explicitly.

### Added

- Added `fetch.params.errorTarget` so direct `fetch` actions can write HTTP/network failures to a screen-owned error path and clear that path on success. This gives critical `initialActions` screen loads a first-class visible error contract without relying only on global `/ui/lastError`.
- Added `select.props.labelKey` and `select.props.valueKey` for catalog-shaped option rows such as `{ id, name }`.
- Added install-command metadata to missing SQL driver errors so optional peer dependency failures point directly to the required package.

### Fixed

- Hardened `select` option normalization so malformed option data renders disabled diagnostics instead of crashing or producing blank clickable rows.
- Documented SQLite's native `better-sqlite3` install path so transitive native-build warnings are understood as adapter-level warnings, not Mythik runtime failures.

## 0.1.3

Compatible release for the `0.1.x` line. This expands the database foundation
with generic SQL drivers and stores while preserving the existing public package
contracts.

### Added

- Added a dialect-aware SQL boundary under `mythik/server` with drivers for SQL Server, PostgreSQL, MySQL, and SQLite.
- Added generic SQL-backed spec stores: `SqlSpecStore`, `SqlVersionedSpecStore`, and `SqlEnvironmentStore`.
- Added canonical SQL store DDL plus `mythik init-store --dialect <sqlserver|postgres|mysql|sqlite>` for explicit table initialization and `--dry-run` review.
- Extended the CLI store resolver so `manifest`, `elements`, `patch`, `validate`, versioned stores, and environment stores work against SQL Server, PostgreSQL, MySQL, and SQLite with one edit loop.
- Added dialect-aware `mythik-server` support for generated CRUD, catalogs, auth provider queries, scope filters, pagination, totals, query endpoints, and spec serving.
- Added integration and smoke coverage across real SQL-backed workflows, including SQLite, SQL Server, PostgreSQL, and MySQL validation paths.

### Changed

- Moved SQL Server runtime access onto the same SQL driver boundary used by the new dialects while keeping SQL Server compatibility stores available from `mythik/server`.
- Kept the browser-safe `mythik` entry free of Node-only SQL imports; SQL drivers and stores remain behind `mythik/server`.
- Declared SQL adapters (`mssql`, `pg`, `mysql2`, and `better-sqlite3`) as optional dependencies of `mythik`. npm and pnpm install them by default unless optional dependencies are omitted.
- Generated MySQL upsert SQL now targets MySQL 8.0.19+.

### Fixed

- Hardened MySQL insert/update responses for non-`RETURNING` behavior by selecting inserted or updated records back through the primary key path.
- Hardened SQL generation and execution edge cases: table overrides, safe scope-filter composition, deterministic pagination fallback, SQL Server aggregate `ORDER BY` stripping, SQL store initialization, timestamp binding, transaction behavior, and shared-driver cleanup in CLI stores.
- Hardened expression and action contracts: dotted `$let` references for `$ref` and `$template`, `params.skipIf` dispatch-time guards, and event arrays containing both actions and transactions.

### Documentation

- Refreshed `docs/consumer`, bundled docs, package READMEs, and the compiled LLM wiki with the new multi-database, SQL-store, CLI, event-binding, and expression contracts.

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
