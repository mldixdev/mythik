---
id: concept-public-package-names
title: Public package names
kind: concept
sources: [docs/consumer/ai-context.md, docs/consumer/WHERE-TO-LOOK.md]
---

# Public package names

Mythik publishes unscoped npm packages. Do not generate scoped package imports for public npm consumers.

| Public package | Use |
|---|---|
| `mythik` | Browser-safe core runtime, state, expressions, validation, browser-safe stores |
| `mythik/server` | Node-only stores, SQL drivers, and SQL DDL helpers exported from the core package subpath |
| `mythik-react` | React host, renderer, and web primitives |
| `mythik-cli` | CLI package; installs the `mythik` binary |
| `mythik-cli/api` | Programmatic CLI API: `runPush`, `runPatch`, `runLint`, and related types |
| `mythik-server` | Express server runtime for ApiSpecs |

The `mythik` package also ships the AI documentation under `node_modules/mythik/docs`.
Use [[@cli-docs]] to locate or copy it after install.

Typical React install:

```bash
npm install mythik mythik-react
npm install -D mythik-cli
```

Add `mythik-server` only when building a Mythik-backed Node server. React Native work is a repository preview track, not part of the supported npm publish surface yet.

SQL adapters (`mssql`, `pg`, `mysql2`, `better-sqlite3`) are optional peer dependencies. Install only the selected database adapter:

```bash
npm install pg              # PostgreSQL
npm install mysql2          # MySQL
npm install mssql           # SQL Server
npm install better-sqlite3  # SQLite
```

SQLite uses native `better-sqlite3`; warnings from its transitive native-build helpers are adapter-level install warnings, not Mythik runtime failures. Missing SQL adapter errors include the package name and exact install command for the selected dialect.

Related: [[@cli-docs]], [[@cli-programmatic-api]], [[@concept-spec-stores-catalog]], [[@concept-where-to-look]].
