# mythik

The Mythik runtime — types, validation, expressions, actions, spec
stores, and versioning. This is the foundation every Mythik consumer
imports. It also ships the canonical AI documentation bundled inside
the npm tarball — so the docs an agent reads always match the
installed version of the framework, no external doc fetching, no
version drift.

> See [the framework README on GitHub](https://github.com/mldixdev/mythik#readme)
> for the full Mythik architecture and design philosophy. This file
> documents what `mythik` gives you and how to use it.

---

## What Mythik is, briefly

Mythik is an **AI-first, spec-driven framework**. Every UI screen and
API endpoint lives as a JSON spec in a database — not a `.tsx` file
in a repo. Apps grow by adding rows, not files. The framework
validates every change atomically and versions everything
automatically, so your favorite AI agent can author and patch specs
through the CLI without human supervision in the loop. This package
is the runtime that makes all of that work.

## Install

```bash
npm install mythik
```

`mythik` has no peer dependency. It's the foundation.

## When to install this

You install `mythik` whenever you're building anything Mythik-related:

| You want to... | Install |
|---|---|
| Render specs as a React app | `mythik` + `mythik-react` |
| Build a REST API from an ApiSpec | `mythik` + `mythik-server` |
| Author or patch specs from the command line | `mythik` + `mythik-cli` (dev) |
| Validate or query specs from a Node script | `mythik` alone |

## What you get

- **Strict TypeScript types** for `Spec`, `AppSpec`, `ApiSpec`,
  primitives, expressions, actions, and validation results.

- **The validation gate** — `validateSpec()` and `validateApiSpec()`
  are the atomic checks that run on every push and promote. Call them
  directly to validate offline, in CI, or in a test.

- **Spec stores** — load and save specs through a swappable backend
  interface:
  - Browser-safe entry: `MemorySpecStore`, `SupabaseSpecStore`
  - Node-only entry (`mythik/server`): `FileSpecStore`,
    `SqlServerSpecStore`
  - Versioned variants (`SupabaseVersionedSpecStore`,
    `SupabaseEnvironmentStore`) add snapshot+patch-chain history,
    structural diffs, and atomic promote gates

- **Expression and action engines** — the runtime that resolves
  `$token`, `$state`, `$template`, and dispatches action chains,
  transactions, forms, auth, derive, dataSources, uploads, and
  exports. Specs reference these by name; this package implements
  the resolution.

- **App engine** — navigation, auth integration, and screen lifecycle.
  Most consumers reach the app engine through `<MythikApp>` in
  `mythik-react`, but the runtime lives here and can be used directly
  for non-React shells or custom integrations.

## Browser-safe vs Node-only entries

```ts
// Browser-safe (works in any runtime)
import { MemorySpecStore, SupabaseSpecStore } from 'mythik';

// Node-only (file system, SQL Server, anything that needs Node APIs)
import { FileSpecStore, SqlServerSpecStore } from 'mythik/server';
```

Bundlers like Vite or Webpack should always import from `mythik` (the
main entry). The `mythik/server` subpath is for Node scripts and
server processes only — it pulls in modules like `mssql` and
`node:fs` that won't work in a browser.

## Minimal example

Validate a spec in-process:

```ts
import { validateSpec, MemorySpecStore, type Spec } from 'mythik';

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
      props: { content: 'Hello, world', variant: 'heading' },
    },
  },
};

const result = validateSpec(homeSpec);

if (!result.valid) {
  for (const err of result.errors) {
    console.error(`[${err.ruleId}] ${err.path}: ${err.message}`);
  }
  process.exit(1);
}

const store = new MemorySpecStore({ home: homeSpec });
const loaded = await store.load('home');
console.log('Loaded spec for screen:', loaded?.root);
```

`validateSpec()` is the same function the CLI calls when it runs
`mythik validate <spec-id>` and the same gate that `mythik patch`
enforces atomically. Same machine, three surfaces.

For rendering specs as a React UI, see
[`mythik-react`](https://github.com/mldixdev/mythik/tree/main/packages/react#readme).
For an AI agent surface to read, validate, patch, and promote specs
from the command line, see
[`mythik-cli`](https://github.com/mldixdev/mythik/tree/main/packages/cli#readme).

## AI documentation, bundled

This package ships the canonical AI documentation inside the npm
tarball — so the docs travel with the framework (no external doc
fetching, no version drift between docs and runtime):

```text
node_modules/mythik/docs/
├── consumer/
│   ├── ai-context.md                    # spec-generation primer
│   ├── ai-context-primitives.md         # every primitive's props
│   ├── ai-context-runtime-semantics.md  # render-time behavior
│   ├── ai-context-custom-elements.md    # custom expressions/actions
│   ├── reference-doc.md                 # full rule catalog
│   └── WHERE-TO-LOOK.md                 # navigation guide
├── wiki/compiled/                       # 327 atomic per-concept articles
└── llms.txt                             # index for LLM tooling
```

`mythik-cli` adds a small helper to locate or copy these into your
project:

```bash
$ npx mythik docs path
/your-project/node_modules/mythik/docs

$ npx mythik docs copy ./mythik-docs
```

Point your AI agent at the printed path before asking it to author or
modify specs.

## Related packages

- [`mythik-react`](https://github.com/mldixdev/mythik/tree/main/packages/react#readme) — render the specs as a React app
- [`mythik-cli`](https://github.com/mldixdev/mythik/tree/main/packages/cli#readme) — author and patch specs from the command line (the AI-first surface)
- [`mythik-server`](https://github.com/mldixdev/mythik/tree/main/packages/server#readme) — declarative REST server from an `ApiSpec`

React Native work is a repository preview track and is not part of
the initial npm publish surface.

## Status

`v0.1.2` public release. APIs are documented for real-world feedback
as the framework evolves.

## License

Apache-2.0.
