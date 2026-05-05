# Mythik

> The future is not AI writing better code.
> It is AI not needing to write code.

Mythik is a spec-driven application framework for React apps and declarative REST APIs. A Mythik app is a set of JSON documents that the framework validates, renders, edits, versions, and persists.

Mythik is available as an early public `0.1.1` release. The packages below are the npm surface.

## Why Mythik

- **AI works against a contract, not a guess.** Screens, actions, forms, data sources, auth, editor sessions, and backend APIs are described as JSON specs with validation rules.
- **Bad specs are rejected before they become runtime bugs.** CLI writes and patches pass through validation, linting, URL/state guards, and rule diagnostics before persistence.
- **A broken screen is contained to that screen.** Specs are separate documents, renderer errors are isolated, and corrective patches can recover without rewriting the host app.
- **Spec changes do not require a host rebuild.** Changing screens, AppSpecs, ApiSpecs, tokens, translations, or editor layouts is a data update in the spec store; host code changes still go through the normal build pipeline.
- **Frontend and backend share one vocabulary.** The same spec-first model covers UI, CRUD, auth policy, row-level security, catalogs, contracts, versioning, and environment promotion.
- **The framework owns the architecture.** AI agents compose from documented primitives, expressions, actions, rules, and extension points instead of inventing architecture under context-window pressure.

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

## Packages

| Package | Purpose | Status |
|---|---|---|
| `mythik` | Core runtime: spec types, state, expressions, actions, validation, stores, versioning, editor sessions | 0.1.1 |
| `mythik-react` | React renderer, `MythikApp`, built-in primitives, app shell integration | 0.1.1 |
| `mythik-cli` | `mythik` command plus programmatic CLI API | 0.1.1 |
| `mythik-server` | Declarative REST server from `ApiSpec` | 0.1.1 |

## Minimal React App

```tsx
import { MemorySpecStore, type AppSpec, type Spec } from 'mythik';
import { MythikApp } from 'mythik-react';

const appSpec: AppSpec = {
  type: 'app',
  name: 'Demo App',
  navigation: {
    type: 'tabs',
    initialScreen: 'home',
  },
  screens: {
    home: { label: 'Home' },
  },
  layout: {
    root: 'app-shell',
    elements: {
      'app-shell': {
        type: 'box',
        props: { style: { minHeight: '100vh', padding: 24 } },
        children: ['outlet'],
      },
      outlet: {
        type: 'screen-outlet',
      },
    },
  },
};

const homeSpec: Spec = {
  root: 'root',
  elements: {
    root: {
      type: 'box',
      props: {
        style: { padding: 24 },
      },
      children: ['title'],
    },
    title: {
      type: 'text',
      props: {
        content: 'Hello from Mythik',
        variant: 'heading',
      },
    },
  },
};

const specStore = new MemorySpecStore({
  home: homeSpec,
});

export default function App() {
  return <MythikApp appSpec={appSpec} specStore={specStore} />;
}
```

## CLI

Install the CLI as a dev dependency:

```bash
npm install -D mythik-cli
```

Use the `mythik` binary to inspect, validate, and patch specs:

```bash
npx mythik docs path
npx mythik manifest home
npx mythik elements home root,title
npx mythik validate home
npx mythik patch home --from-file patch.json
```

For AI agents, run `npx mythik docs path` first and point the agent at the printed directory. The npm package `mythik`
bundles the canonical AI documentation under `node_modules/mythik/docs`, including `consumer/ai-context.md`,
`consumer/reference-doc.md`, `wiki/compiled/README.md`, and `llms.txt`.

To copy the documentation into a project-local folder:

```bash
npx mythik docs copy ./mythik-docs
```

Use the programmatic API when shell quoting would get in the way:

```ts
import { runPatch } from 'mythik-cli/api';

await runPatch({
  screen: 'home',
  fromFile: 'patch.json',
  json: true,
});
```

## Safe Spec Workflow

Use the CLI as the write gate for specs:

```bash
npx mythik manifest home
npx mythik elements home root,submit-button
npx mythik patch home --from-file patch.json
npx mythik validate home
```

This loop keeps edits surgical: inspect the manifest, read only the elements you need, apply an RFC 6902 patch, then validate. Programmatic tools should use `mythik-cli/api` instead of writing directly to a `SpecStore`.

## Minimal Server

```ts
import { createServer } from 'mythik-server';

const server = createServer({
  spec: './api-spec.json',
  database: {
    server: process.env.DB_SERVER!,
    database: process.env.DB_NAME!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    trustServerCertificate: true,
  },
});

await server.start(3010);
```

The server package turns an `ApiSpec` into REST endpoints with auth policy, row-level scope, catalogs, CRUD routes, and handler escape hatches.

## What Mythik Owns

- A JSON spec model for screens, app navigation, design tokens, identity, translations, forms, data sources, actions, transactions, editor sessions, and backend APIs.
- A validation gate with numbered framework rules, lint findings, suggestions, and `ruleId` diagnostics.
- A React renderer with 38 built-in primitives, including `spatial-map` for SVG/data-first spatial editors.
- A CLI workflow for safe spec writes: `manifest -> elements -> patch -> validate`.
- Built-in runtime engines for expressions, action chains, forms, auth, transactions, derive, dataSources, uploads, exports, and app navigation.
- Versioned spec storage with snapshot plus patch-chain history when using versioned stores.
- Generic editor infrastructure: undo/redo, dirty tracking, `editorCommit`, `editorSave`, discard, validation metadata, and dirty navigation guard actions.
- A declarative server package for REST APIs with auth, role policies, row-level security, catalogs, and CRUD.
- Cross-contract tooling such as `mythik contract`, which checks frontend specs against backend ApiSpecs before deployment.
- An AI-oriented documentation corpus in `docs/consumer/`, with a generated wiki derived from those canonical docs.

## Spatial Editors

Mythik includes a generic `spatial-map` primitive for SVG-based spatial workflows: floor plans, seating charts, warehouse layouts, parking maps, hospital beds, and similar authoring surfaces.

The primitive is domain-neutral. It provides selection, canvas press context, item and zone editing, snap/guides, resize/rotate, polygon zone editing, and JSON-first persistence hooks. Domain behavior such as restaurant table actions, inspectors, save buttons, and delete confirmation is composed outside the primitive using normal Mythik JSON.

## Documentation

Consumer-facing documentation lives in `docs/consumer/` in the repository and is bundled into the `mythik` npm package:

- `ai-context.md` is the core AI spec-generation reference.
- `ai-context-primitives.md` documents all primitive props.
- `ai-context-runtime-semantics.md` documents runtime timing and state ownership.
- `reference-doc.md` is the full rule catalog.

The generated wiki is derived from the consumer documentation. It is not edited directly. Installed projects can locate
the bundled docs with `npx mythik docs path` or copy them with `npx mythik docs copy ./mythik-docs`.

## License

Apache-2.0.

## Release Status

Mythik 0.1.1 is the first usable public npm release. The core React, CLI, and server packages are the supported npm publish surface. React Native work remains in the repository as a preview track and is intentionally not part of the initial npm release.

The public GitHub repository is:

```text
https://github.com/mldixdev/mythik
```
