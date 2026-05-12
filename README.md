# Mythik

> The future is not AI writing better code.
> It is AI not needing to write code.

A 5-screen app and a 500-screen app have the same host file in Mythik.
The difference is just rows in a database.

```
┌─────────────────────────────────────────────────────────────────┐
│  Host file (App.tsx) — small, stable                            │
│  └─ <MythikApp specStore={…} appSpec={…} />                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │ fetches at runtime
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Spec store (Supabase / SQL / file / memory)                    │
│  • home.spec.json     • task-manager.spec.json                  │
│  • settings.spec.json • api-spec.json                           │
│  • app-spec.json      • …                                       │
│                                                                 │
│  Every change is a versioned, queryable row.                    │
└─────────────────────────────────────────────────────────────────┘
                           ▲
                           │ patches (RFC 6902) via mythik CLI
                           │
                ┌──────────┴──────────┐
                │  Human  •  AI agent │
                └─────────────────────┘
```

Mythik is available as an early public release. The packages below
are the npm publish surface.

---

## The bet

Mythik starts from a simple bet: an application can live as a validated,
editable, versioned contract in data. If that idea makes sense to you,
the rest of the pieces fit together: specs in a database, agents working
through the same validation flow, and changes that only reach runtime
when the whole contract remains coherent.

### 1. Spec-driven

The source of truth is a JSON document in a database, not code in a
repo. A "screen" is a row, not a `.tsx` file. Changing what users see
is editing data, not deploying code.

A spec change — new screen, new field, new validation rule, new action,
new theme token — ships in milliseconds: a `mythik patch` writes the
new version, the next fetch picks it up, no rebuild, no CDN bust, no
deploy.

### 2. AI-first

Your favorite AI agent can drive Mythik end-to-end. The CLI exposes
the full workflow — read structure, propose patches, validate, promote
between environments, query history — and the same surface is
available as a programmatic API the agent calls without shell-quoting
issues.

Documentation ships *inside* the npm package — at
`node_modules/mythik/docs/` — so the docs an agent reads always match
the installed version of the framework, with no external doc fetching
and no drift between docs and runtime. Errors return structured data:
paths, rule IDs, suggestion text. The agent iterates at network speed,
without human supervision in the loop.

### 3. Contract-first

Every change is validated before it can take effect. A patch that
breaks the contract is rejected before any state changes. A
`mythik promote dev → production` that produces an inconsistent state
is rejected before the pointer moves.

There is no half-baked deployment. Atomic, or nothing.

---

## The problem Mythik solves

Three intersecting problems with how AI builds software today.

**AI slop.** Generative AI produces apps that look like apps but don't
survive contact with reality: hallucinated state shape, forms that
don't validate, no audit trail. The fundamental issue: AI generates
*code*, which is opaque. Reviewers see a blob and can't tell what
changed last week.

**UI is mostly tedium.** Define a form, lay out fields, wire
validation, hook to API, handle errors, write tests, ship. Repeat 500
times. The skill ceiling is low; the labor cost is high.

**Governance is an afterthought.** Once an app ships, every change is
risky. There's no atomic promote-with-validation. Rollbacks rewrite
history. Different environments diverge over time. The team accepts
this because doing it right is expensive — except it's not, if the
framework is designed for it from day zero.

Mythik's bet: if the spec is the source of truth instead of the code,
all three problems collapse into one. AI doesn't generate "the app" —
it generates *specs*, validated against a contract. UI tedium
disappears because the spec is ~10× shorter than the code it
generates. Governance is built into the framework. And because each
spec is its own document, the blast radius of any change is contained:
a bad edit on one screen cannot break another.

---

## The Loop

The fundamental Mythik interaction — between an AI agent and the
framework — is a tight cycle:

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

Every step is a network round-trip — and for an AI agent, every read
is also a token cost. The framework optimizes both: patches are RFC
6902 (small), validation runs in milliseconds, specs are fetched
lazily, errors return machine-readable diagnostics, and `--toon`
output trims the token weight of large manifests and elements so the
agent's context window lasts longer.

**Self-correction is built into `patch`.** When the patch breaks the
contract, the gate rejects atomically and returns structured
diagnostics: failing rule IDs, paths, suggestion text. The agent reads
the error, refines the patch, and retries. No half-baked write ever
lands.

For drafts and candidates *outside* the loop — local files not yet
pushed, or stored specs being audited — `mythik lint --from-file
<draft>.json` and `mythik validate <spec-id>` run the same validators
read-only, no write. Useful when constructing complex multi-step
changes locally before committing to a push.

A working AI agent runs this loop hundreds of times per session. The
framework guarantees that no iteration produces a half-baked
deployment, because validation is atomic.

---

## A real example

Here's what an AI agent does to add a "due date" column to a task
list. The example uses the live `mythik` CLI; output is illustrative.

```bash
# 1. Read the structure (cheap; no patch yet)
$ npx mythik manifest task-manager

screen: layout (45 elements)
root: layout (box)
├── header (box)
├── task-list (list) → bound to /tasks
│   └── task-row (box)
│       ├── title (text)
│       ├── priority (select)
│       └── status (text)
└── new-task-form (box)
    ├── title-input (input)
    ├── priority-select (select)
    └── submit-btn (button)

# 2. Read just the elements you need (use --toon for token-efficient output)
$ npx mythik elements task-manager task-row,new-task-form --json
{
  "task-row": { "type": "box", "children": ["title","priority","status"] },
  "new-task-form": { "type": "box", "children": [...] }
}

# 3. Compose a patch (RFC 6902)
$ cat add-due-date.json
[
  { "op": "add", "path": "/elements/due-date",
    "value": { "type": "text", "props": { "content": "${due_date}" } } },
  { "op": "add", "path": "/elements/task-row/children/-",
    "value": "due-date" },
  { "op": "add", "path": "/elements/due-input",
    "value": { "type": "input", "props": { "kind": "date", "bind": "/draft/due_date" } } },
  { "op": "add", "path": "/elements/new-task-form/children/-",
    "value": "due-input" }
]

# 4. Push through the atomic validation gate
$ npx mythik patch task-manager --from-file add-due-date.json --author claude

✓ Patch applied. v3 → v4. 4 elements modified.

# 5. Test in dev environment
$ npx mythik envs task-manager --set dev=4 --author claude

# 6. Promote when ready
$ npx mythik promote task-manager --from dev --to production --confirm --author mldix

✓ Validated against contract.
✓ Cross-screen consistency check passed.
✓ Pointer moved: production v3 → v4.
   Live in production: 0 ms.
```

No rebuild. No CI. No deploy. The next user to load `task-manager`
sees the new column. History records what changed, who changed it,
and when. The version is queryable, replayable, rollbackable to any
previous state — without rewriting history.

The CLI output above is what a human types. An AI agent does the same
thing through `mythik-cli/api`, with structured input/output, no shell
escaping. **The loop has the same shape for both.**

---

## What comes built in

Three properties that fall out of treating the spec as the source of
truth.

### Versioning is structural, not optional

Every change to a spec creates a new immutable row in `screen_versions`.
Versions are stored as snapshot+patch chains: every Nth version is a
full snapshot, the rest are RFC 6902 patches replayed against the
nearest snapshot. History is queryable with structural diffs:

```bash
$ npx mythik history task-manager
v4 (claude, 2026-05-06, patch)  "Add due date column"
   + element "due-date" added
   + element "due-input" added
   ~ task-row.children: ["title","priority","status"] → [..., "due-date"]
v3 (alice, 2026-05-04, patch)   "Reorder priority field"
   ~ task-row prop position: "after-title" → "before-status"
v2 (alice, 2026-04-24, push)    "Add priority field"
v1 (system, 2026-04-23, push)   "Initial spec"
```

Rollback is **always-forward**: `rollback` creates a new version
whose content equals the target. History is never rewritten.

### Environment pointers + atomic promote

`dev`, `staging`, `production` are not deploy targets — they are rows
in `screen_environments` that point at a specific version of a spec.
Promotion *moves a pointer*, atomically, after running:

1. Structural validation of the source version
2. Cross-screen consistency (all referenced specs/actions exist)
3. AppSpec/ApiSpec contract validation

If any check fails, the gate rejects and the pointer doesn't move.
There is no "partial promotion."

This means: experiments are environments. Multi-tenancy is environments.
Per-customer variation is environments. *No deploy required for any
of these.*

### One vocabulary across UI, API, and tooling

The same spec model — primitives, validation rules, action chains,
expressions, `$token`/`$state`/`$template` references — covers screens,
forms, AppSpec, ApiSpec, identity tokens, presets, translations, editor
sessions, and the backend REST contract.

`mythik contract --app app-demo --api api-demo` cross-validates that
every API call a frontend makes corresponds to a real endpoint, with
matching request/response shapes, **before deploy**. No more frontend
shipped against an old API contract.

---

## Install

For a React app:

```bash
npm install mythik mythik-react
npm install -D mythik-cli
```

For a Mythik-backed REST server:

```bash
npm install mythik-server
```

For SQL-backed spec stores and servers, Mythik supports SQL Server,
PostgreSQL, MySQL, and SQLite through the `mythik/server` SQL boundary:

```bash
npm install mythik mythik-server
npm install pg              # PostgreSQL
npm install mysql2          # MySQL
npm install mssql           # SQL Server
npm install better-sqlite3  # SQLite
npx mythik init-store --dialect sqlite --target ./mythik.db
npx mythik init-store --dialect postgres --dry-run
```

SQL adapters are optional peer dependencies. Install only the driver
for the database you actually use. SQLite uses the native
`better-sqlite3` adapter; warnings from its transitive native-build
helpers are adapter-level install noise, not a Mythik runtime failure.
If a SQL adapter is missing at runtime, Mythik reports the package name
and exact `npm install ...` command required for the selected dialect.
MySQL generated upsert SQL targets MySQL 8.0.19+.

## Minimal React app

```tsx
import { MemorySpecStore, type AppSpec, type Spec } from 'mythik';
import { MythikApp } from 'mythik-react';

const appSpec: AppSpec = {
  type: 'app',
  name: 'Demo App',
  navigation: { type: 'tabs', initialScreen: 'home' },
  screens: { home: { label: 'Home' } },
  layout: {
    root: 'app-shell',
    elements: {
      'app-shell': {
        type: 'box',
        props: { style: { minHeight: '100vh', padding: 24 } },
        children: ['outlet'],
      },
      outlet: { type: 'screen-outlet' },
    },
  },
};

const homeSpec: Spec = {
  root: 'root',
  elements: {
    root: {
      type: 'box',
      props: { style: { padding: 24 } },
      children: ['title'],
    },
    title: {
      type: 'text',
      props: { content: 'Hello from Mythik', variant: 'heading' },
    },
  },
};

const specStore = new MemorySpecStore({ home: homeSpec });

export default function App() {
  return <MythikApp appSpec={appSpec} specStore={specStore} />;
}
```

This renders a full Mythik app with one screen. Replace `MemorySpecStore`
with `SupabaseSpecStore` or with `SqlSpecStore` from `mythik/server`
backed by SQL Server, PostgreSQL, MySQL, or SQLite. The host file does
not change as the app grows.

## Packages

| Package | Purpose | Status |
|---|---|---|
| [`mythik`](packages/core/) | Core runtime: spec types, validation, expressions, actions, stores, versioning, editor sessions | published |
| [`mythik-react`](packages/react/) | React renderer, app shell, primitive registry with 38 built-ins | published |
| [`mythik-cli`](packages/cli/) | The `mythik` command + programmatic CLI API. The AI-first surface to the framework | published |
| [`mythik-server`](packages/server/) | Declarative REST server from an `ApiSpec` — auth, RLS, catalogs, CRUD | published |
| [`mythik-react-native`](packages/react-native/) | Repository preview track. Not part of the supported npm publish surface yet | preview |

Each package's README focuses on its specific role within the
framework. Read them for installation specifics and per-package
examples.

## CLI

The `mythik` binary is the AI-first surface to the framework. The
canonical workflow:

```bash
npx mythik manifest <spec-id>           # read structure
npx mythik elements <spec-id> <ids>     # read specific elements
npx mythik patch <spec-id> --from-file patch.json  # apply RFC 6902 patch
npx mythik validate <spec-id>           # standalone validation
npx mythik envs <spec-id> --set dev=N   # move dev pointer
npx mythik promote <spec-id> --from dev --to production --confirm
npx mythik history <spec-id>            # version history
npx mythik diff <spec-id> <from> <to>   # structural diff
```

Use `--json` for machine-readable output and `--toon` (where supported)
for token-efficient agent workflows.

```bash
npx mythik docs path                    # locate bundled AI documentation
npx mythik docs copy ./mythik-docs      # copy AI docs into project root
```

Programmatic use bypasses shell quoting:

```ts
import { runPatch } from 'mythik-cli/api';

await runPatch({
  screen: 'task-manager',
  fromFile: 'patch.json',
  json: true,
});
```

## Documentation

The `mythik` npm package bundles the canonical AI documentation under
`node_modules/mythik/docs/`. After install, point an AI agent at the
printed path:

```bash
npx mythik docs path
# /your/project/node_modules/mythik/docs
```

Inside that directory:

- `consumer/ai-context.md` — spec-generation primer (rules and traps)
- `consumer/ai-context-primitives.md` — every primitive's props
- `consumer/ai-context-runtime-semantics.md` — render-time behavior
- `consumer/reference-doc.md` — full rule catalog
- `wiki/compiled/` — atomic per-concept articles (one page per action, primitive, rule, expression) optimized for AI lookup
- `llms.txt` — index for AI tools that read it

The wiki is generated from the canonical consumer docs. It is not
edited directly.

## Release status

The core, React, CLI, and server packages are the supported npm
publish surface. React Native work remains in the repository as a
preview track and is intentionally not part of the supported publish
surface yet.

The framework is shipped for real-world feedback. APIs are documented
and stable enough to build production apps; expect refinements as
patterns emerge.

## Releases

Release notes and patch details are published in the
[CHANGELOG](https://github.com/mldixdev/mythik/blob/main/CHANGELOG.md)
and on
[GitHub Releases](https://github.com/mldixdev/mythik/releases).

## License

Apache-2.0.
