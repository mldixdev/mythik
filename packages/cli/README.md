# mythik-cli

The AI-first surface to Mythik. The `mythik` command and its
programmatic sibling (`mythik-cli/api`) are how an AI agent — or a
human — reads, validates, patches, versions, and promotes Mythik
specs.

> See [the framework README on GitHub](https://github.com/mldixdev/mythik#readme)
> for the full Mythik architecture and design philosophy. This file
> documents what `mythik-cli` gives you and how to use it.

---

## What Mythik is, briefly

Mythik is an **AI-first, spec-driven framework**. Every UI screen and
API endpoint lives as a JSON spec in a database — not a `.tsx` file
in a repo. Apps grow by adding rows, not files. The framework
validates every change atomically, versions everything automatically,
and promotes between environments (`dev`, `staging`, `production`) by
atomic pointer move. Your favorite AI agent drives the full workflow
through this CLI — no GUI in the loop.

## Install

```bash
npm install -D mythik-cli
```

The package exposes the `mythik` binary:

```bash
npx mythik --help
```

## The canonical workflow

The Mythik loop is four steps, all served by this package:

```
       ┌──────────────────────────────────────────────────┐
       │                                                  │
       ▼                                                  │
   manifest  ──▶  elements  ──▶  patch  ──▶  observe
   (read           (read just     (RFC 6902      (the
    structure)      what you       diff;           next
                    need)          atomic          manifest)
                                   validation
                                   on push)
```

Each step is one command:

```bash
# 1. Read structure
$ npx mythik manifest task-manager

# 2. Read just the elements you need (use --toon for token-efficient output)
$ npx mythik elements task-manager task-row,new-task-form --json

# 3. Apply a patch (validates atomically; rejected if it breaks the contract)
$ npx mythik patch task-manager --from-file add-due-date.json --author claude
✓ Patch applied. v3 → v4. 4 elements modified.

# 4. Observe — read the new structure
$ npx mythik manifest task-manager
```

When `patch` fails (the candidate breaks the contract), the gate
returns structured diagnostics: rule IDs, paths, suggestion text. The
agent reads the error, refines the patch, and retries. No half-baked
write ever lands.

## Moving across environments

`dev`, `staging`, `production` are not deploy targets — they are
pointers to specific versions of a spec. Move them with `envs`;
promote across them atomically with `promote`:

```bash
# Move the dev pointer to the new version
$ npx mythik envs task-manager --set dev=4 --author claude

# Promote dev → production (validates atomically; rejected if inconsistent)
$ npx mythik promote task-manager --from dev --to production --confirm --author mldix
✓ Validated against contract.
✓ Cross-screen consistency check passed.
✓ Pointer moved: production v3 → v4.

# List current environment pointers
$ npx mythik envs task-manager --json
```

## Read-only previews

For drafts and audits *outside* the canonical loop:

```bash
# Validate a stored spec (read-only check; no write)
$ npx mythik validate task-manager

# Lint a local file (draft not yet pushed) or a directory
$ npx mythik lint --from-file draft.json
$ npx mythik lint --from-dir ./specs

# Cross-validate a frontend spec against an ApiSpec (catches drift before deploy)
$ npx mythik contract --app app-demo --api api-demo
```

All three run the same validators that `patch` and `promote` enforce
atomically — useful when constructing complex multi-step changes
locally before committing to a push.

## Store backends

The CLI can operate against memory, file, Supabase, SQL Server,
PostgreSQL, MySQL, and SQLite stores. SQL stores share the same edit
loop: inspect with `manifest`, read exact nodes with `elements`, write
with `patch --from-file`, then verify.

```bash
# SQLite: local development, demos, tests
npx mythik init-store --dialect sqlite --target ./mythik.db
npx mythik patch floor-editor --from-file patch.json --store sqlite --filename ./mythik.db --author ai-agent

# PostgreSQL
npx mythik init-store --dialect postgres --dry-run
npx mythik patch floor-editor --from-file patch.json --store postgres --url "$DATABASE_URL" --author ai-agent

# MySQL
npx mythik init-store --dialect mysql --dry-run
npx mythik patch floor-editor --from-file patch.json --store mysql --url "$DATABASE_URL" --author ai-agent

# SQL Server
npx mythik init-store --dialect sqlserver --server localhost --database Mythik --user "$DB_USER" --password "$DB_PASSWORD" --encrypt false --trust-server-certificate
npx mythik patch floor-editor --from-file patch.json --store sqlserver --server localhost --database Mythik --user "$DB_USER" --password "$DB_PASSWORD" --author ai-agent
```

`init-store --dry-run` prints the idempotent DDL for review or for a
team-managed migration pipeline. Runtime reads and writes do not
silently create missing store tables. MySQL generated upsert SQL
targets MySQL 8.0.19+.

## History and rollback

```bash
# Show version history with structural diffs
$ npx mythik history task-manager

# Compare two versions or two environments
$ npx mythik diff task-manager 3 4
$ npx mythik diff task-manager dev production

# Always-forward rollback (creates a new version with old content)
$ npx mythik rollback task-manager --to 3 --author mldix
```

Rollback never rewrites history. The new version `v5` will hold the
content of `v3`. `v4` stays in the history with its own author and
timestamp.

## Output formats

| Flag | When to use |
|---|---|
| `--json` | Machine-readable output for scripts and IDE integrations |
| `--toon` (where supported) | Token-efficient agent reads — same shape, fewer tokens, useful for paginating large manifests or element catalogs |

## Programmatic API

When a script, IDE integration, or AI agent should avoid shell
quoting, use `mythik-cli/api`:

```ts
import { runPatch, runValidate, runPromote } from 'mythik-cli/api';

const result = await runPatch({
  screen: 'task-manager',
  fromFile: 'add-due-date.json',
  author: 'claude',
  json: true,
});

if (!result.ok) {
  console.error(result.diagnostics);
}
```

The programmatic API uses the same implementation path as the binary —
nothing is special-cased. Whatever the CLI does, the API does
identically.

## Bundled AI documentation

The `mythik` package (peer dependency) ships canonical AI docs at
`node_modules/mythik/docs/`. Locate or copy them:

```bash
$ npx mythik docs path
/your-project/node_modules/mythik/docs

$ npx mythik docs copy ./mythik-docs
```

Point your AI agent at the printed path before asking it to author or
modify specs. Inside that directory:

- `consumer/ai-context.md` — spec-generation primer (rules and traps)
- `consumer/ai-context-primitives.md` — every primitive's props
- `consumer/reference-doc.md` — full rule catalog
- `wiki/compiled/` — atomic per-concept articles (one page per action,
  primitive, rule, expression) optimized for AI lookup
- `llms.txt` — index for AI tools that read it

## Related packages

- [`mythik`](https://github.com/mldixdev/mythik/tree/main/packages/core#readme) — the runtime this CLI manipulates
- [`mythik-react`](https://github.com/mldixdev/mythik/tree/main/packages/react#readme) — render the specs as a React app
- [`mythik-server`](https://github.com/mldixdev/mythik/tree/main/packages/server#readme) — declarative REST server from an `ApiSpec`

## Status

Public release line. The binary name is `mythik`; the npm package name
is `mythik-cli`. APIs are documented for real-world feedback as the
framework evolves.

## Releases

Release notes and patch details are published in the
[CHANGELOG](https://github.com/mldixdev/mythik/blob/main/CHANGELOG.md)
and on
[GitHub Releases](https://github.com/mldixdev/mythik/releases).

## License

Apache-2.0.
