# mythik-server

The backend counterpart of `mythik-react`. Turns a Mythik `ApiSpec`
— a JSON document describing endpoints, auth, row-level security,
catalogs, and CRUD shape — into a running REST server. Same spec
model the frontend uses, same versioning, same atomic promote, just
covering the API contract instead of the UI.

> See [the framework README on GitHub](https://github.com/mldixdev/mythik#readme)
> for the full Mythik architecture and design philosophy. This file
> documents what `mythik-server` gives you and how to use it.

---

## What Mythik is, briefly

Mythik is an **AI-first, spec-driven framework**. Every UI screen
and API endpoint lives as a JSON spec in a database — not a `.tsx`
file or a hand-coded route handler in a repo. Apps grow by adding
rows, not files. The framework validates every change atomically
and versions everything automatically, so your favorite AI agent
can author and patch specs through the CLI without human supervision
in the loop. This package is the server runtime — it consumes
ApiSpecs and serves them as REST endpoints with auth, RLS, and CRUD
wired in.

## Install

```bash
npm install mythik-server
```

`mythik` is included as a dependency — no separate install required.

## When to install this

Install `mythik-server` when you're building the **backend** of a
Mythik app: the REST API the frontend consumes.

For pure frontend work you don't need this package — but you DO need
it if you want the API contract to be a versioned, validated,
promotable spec instead of hand-written routes.

The frontend (built with `mythik-react`) calls endpoints declared in
your ApiSpec — typically via `fetch` dataSources or action chains in
screen specs. `mythik-cli` cross-validates frontend specs against the
ApiSpec via `mythik contract`, with four rules that go deeper than
just "does the endpoint exist?" — see the cross-validation section
below for what it actually checks.

## What you get

- **`createServer({ spec, database })`** — main bootstrap. Reads an
  ApiSpec, opens the database connection, registers all declared
  endpoints, and exposes a `start(port)` method.

- **Dialect-aware SQL runtime** — generated CRUD, catalogs,
  pagination, auth provider queries, and scope filters compile through
  the selected database driver. Supported dialects are SQL Server,
  PostgreSQL, MySQL, and SQLite.

- **Endpoint patterns** — your ApiSpec declares each endpoint as one
  of four shapes; the server wires the route, validates inputs,
  enforces auth, and applies RLS automatically:
  - `query` — read with parameters
  - `handler` — custom business logic with an escape hatch
  - `crud` — create / read / update / delete a table row
  - `public` — unauthenticated endpoint

- **Auth and security** — JWT issuance and validation, DB-backed auth
  provider, role policy evaluation, row-level security expressions.
  All declared in the ApiSpec; enforced uniformly by the server.

- **Catalogs** — auto-generated lookup endpoints (for dropdown options,
  enums, reference data) declared once in the ApiSpec.

- **Validation** — `validateApiSpec()` runs the same atomic checks as
  the CLI's `mythik validate` and `mythik patch`. The server refuses
  to start if the ApiSpec is invalid; no half-broken backend ever
  comes up.

## Minimal example

```ts
import { createServer } from 'mythik-server';

const server = createServer({
  spec: './api-spec.json',
  database: {
    type: 'postgres',
    connectionString: process.env.DATABASE_URL!,
  },
});

await server.start(3010);
```

`./api-spec.json` is a Mythik ApiSpec describing endpoints, auth
policy, catalogs, and CRUD shape. See `ai-context.md` (bundled in the
`mythik` package) for the ApiSpec schema and patterns.

For local demos and tests, SQLite is a one-file option:

```ts
const server = createServer({
  spec: './api-spec.json',
  database: { type: 'sqlite', filename: './mythik.db' },
});
```

Set `spec.dialect` in the ApiSpec to match the server database when
Mythik should generate CRUD/catalog/pagination/scope SQL for that
dialect. Custom SQL remains dialect-native; Mythik compiles named
params (`@name`) but does not translate a SQL Server query into
PostgreSQL/MySQL/SQLite SQL at runtime. MySQL generated upsert SQL
targets MySQL 8.0.19+.

## ApiSpec philosophy

The ApiSpec describes **what** the API does — not **how**. Routes,
parameters, auth policy, RLS predicates, catalogs, CRUD shape: all
declared. The implementation details — database connection,
environment secrets, custom business logic for `handler` endpoints —
live in host configuration and code, not in the JSON spec.

This separation is load-bearing for the framework's AI-first axiom:

- The ApiSpec is **portable** across environments (`dev`, `staging`,
  `production`) — the same spec serves all of them; only the
  database connection differs.
- The ApiSpec is **versioned** — every change is a row in the spec
  store, with author and timestamp.
- The ApiSpec is **promotable** — `mythik promote --from dev --to
  production` moves the API contract atomically alongside the UI
  contract, so frontend and backend stay in lockstep.
- The ApiSpec is **patchable** — an AI agent can edit endpoints with
  the same RFC 6902 patches it uses for UI screens.

If a change requires touching host configuration or custom code (DB
migration, new third-party SDK), that's a release that goes through
the standard build pipeline. Most product evolution stays in the spec
store.

## Cross-validating frontend and backend

`mythik contract` runs 4 rules across screen specs and the ApiSpec at
author time, before deploy:

| Rule | Level | What it checks |
|---|---|---|
| `endpoints-exist` | error | Every fetch URL in screens matches an endpoint, catalog, or builtin in the ApiSpec |
| `fields-valid` | error | POST/PUT body fields match the CRUD `insertable` / `updatable` lists |
| `params-match` | warning | Query parameters match the endpoint's `params` config |
| `permissions-consistent` | warning | If the AppSpec's `roleAccess` grants a role access to a screen, every endpoint that screen uses must allow that role via `policies` |

All errors include Levenshtein-based "did you mean?" suggestions for
typos and field-name drift.

```bash
$ npx mythik contract --app app-demo --api api-demo
$ npx mythik contract --app app-demo --api api-demo --json   # CI-friendly
```

Run it in CI. Run it after an AI agent patches a spec.

The fourth rule — **permissions-consistent** — is the distinctive
one. It cross-checks "Role X can navigate to screen Y" against "every
endpoint screen Y calls allows role X." When UI visibility and API
permissions live in separate code layers, this kind of drift is hard
to detect; in Mythik both `roleAccess` (frontend) and `policies`
(backend) are declarative JSON, so a single command can compare them.

## Related packages

- [`mythik`](https://github.com/mldixdev/mythik/tree/main/packages/core#readme) — the runtime this server uses (dependency)
- [`mythik-react`](https://github.com/mldixdev/mythik/tree/main/packages/react#readme) — the frontend consuming this API
- [`mythik-cli`](https://github.com/mldixdev/mythik/tree/main/packages/cli#readme) — author and cross-validate ApiSpecs (the AI-first surface)

## Status

Public release line. Use with `mythik contract` to cross-check
frontend specs against backend endpoints before deployment. APIs are
documented for real-world feedback as the framework evolves.

## License

Apache-2.0.
