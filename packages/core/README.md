# mythik

Core runtime for Mythik, a spec-driven application framework where UI, state, actions, validation, storage, versioning, and editor workflows are described as JSON and enforced by the framework.

## Install

```bash
npm install mythik
```

## What It Provides

- Bundled AI documentation under `docs/`, including canonical consumer docs, compiled wiki pages, and `llms.txt`.
- Spec and AppSpec types.
- State store and reserved path contracts.
- Expression resolver and expression registry.
- Action dispatcher, transactions, middleware, and fetch helpers.
- Validation, URL guard, state guard, rate limiting, and spec signing helpers.
- Design token, DNA, identity, background, animation, and preset utilities.
- Spec stores: memory and Supabase from the browser-safe entry.
- Node-only stores from the `mythik/server` subpath.
- Versioning: snapshot plus patch-chain stores, structural diffs, promote gate, and rollback helpers.
- Editor sessions: undo/redo, dirty tracking, `editorCommit`, `editorSave`, discard, validation metadata, and save status.
- App engine: navigation, auth integration, screen lists, and dirty editor session guard.

## Basic Usage

```ts
import { MemorySpecStore, validateSpec, type Spec } from 'mythik';

const homeSpec: Spec = {
  root: 'root',
  elements: {
    root: {
      type: 'text',
      props: { content: 'Hello Mythik' },
    },
  },
};

const specStore = new MemorySpecStore({
  home: homeSpec,
});

const loadedSpec = await specStore.load('home') as Spec;
const result = validateSpec(loadedSpec);

if (!result.valid) {
  console.error(result.errors);
}
```

## Browser-Safe and Node-Only Entries

Use the main entry in browser/runtime code:

```ts
import { MemorySpecStore, SupabaseSpecStore } from 'mythik';
```

Use the server subpath for Node-only stores:

```ts
import { FileSpecStore, SqlServerSpecStore } from 'mythik/server';
```

## Related Packages

- `mythik-react` renders Mythik specs in React.
- `mythik-cli` provides the `mythik` command and programmatic CLI API.
- `mythik-server` turns an ApiSpec into a REST server.

React Native work is currently a repository preview track and is not part of the initial npm publish surface.

## AI Documentation

The npm package includes the documentation an AI agent needs to work with Mythik:

```text
node_modules/mythik/docs/llms.txt
node_modules/mythik/docs/consumer/ai-context.md
node_modules/mythik/docs/wiki/compiled/README.md
```

Use the CLI to locate or copy that documentation:

```bash
npx mythik docs path
npx mythik docs copy ./mythik-docs
```

## License

Apache-2.0.

## Status

v0.1.1 public release. APIs are documented for real-world feedback as the framework evolves.
