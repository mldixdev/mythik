---
id: concept-package-layout
title: Package layout
kind: concept
sources: [docs/consumer/ai-context.md, docs/consumer/WHERE-TO-LOOK.md]
---

# Package layout

## Public packages

| Package | Purpose |
|---|---|
| `mythik` | Browser-safe core. State, expressions, validation, renderer engine, design, auth, data, security, and browser-safe spec stores |
| `mythik/server` | Node-only spec stores, SQL drivers, and SQL DDL helpers: `FileSpecStore`, `SqlSpecStore`, `SqlVersionedSpecStore`, `SqlEnvironmentStore`, `createSqlDriver`, `getSqlStoreDdl`, and SQL Server compatibility stores |
| `mythik-react` | React host, renderer, and web primitives |
| `mythik-cli` | CLI package; installs the `mythik` command |
| `mythik-cli/api` | Programmatic CLI API: `runPush`, `runPatch`, `runLint`, `parsePatchInput`, and types |
| `mythik-server` | Express server runtime for ApiSpecs |

React Native work lives in the repository as a preview track and is not part of the supported npm publish surface yet.

## Browser vs server core entries

The default `mythik` entry is browser-safe by construction. Node-only stores and SQL drivers live behind the `mythik/server` subpath so browser bundles do not pull `fs`, SQL adapters, or other Node-only dependencies.

SQL adapters (`mssql`, `pg`, `mysql2`, `better-sqlite3`) are optional peer dependencies. Browser-only apps do not install database drivers by default; SQL-backed stores and servers must install exactly the adapter for the selected database. SQLite uses native `better-sqlite3`, so warnings from its transitive native-build helpers belong to that adapter install path. Missing SQL adapter errors include the package name and exact install command.

## Programmatic CLI API

Use `mythik-cli/api` instead of deep imports from `dist`. This keeps CLI automation on the same validated path as the binary.

## Published artifacts

Packages ship compiled `dist/` output and type declarations. Use `.d.ts` for type-shape questions. For behavior questions, read source from the GitHub repo or an unpacked tarball.

Related: [[@concept-public-package-names]], [[@concept-spec-stores-catalog]], [[@cli-programmatic-api]], [[@concept-where-to-look]].
