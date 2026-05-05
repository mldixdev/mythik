# mythik-cli

Command-line tooling for Mythik specs.

## Install

```bash
npm install -D mythik-cli
```

The package exposes the `mythik` binary:

```bash
npx mythik --help
```

## Common Commands

```bash
npx mythik docs path
npx mythik docs copy ./mythik-docs
npx mythik manifest home
npx mythik elements home root,submit-button
npx mythik validate home
npx mythik patch home --from-file patch.json
npx mythik push home --from-file home.json
npx mythik pull home
npx mythik lint --from-file home.json
npx mythik contract --app app-demo --api api-demo
```

Use `--json` for machine-readable output and `--toon` where supported for token-efficient agent workflows.

## AI Documentation

`mythik` bundles the AI documentation corpus inside the core package. Use:

```bash
npx mythik docs path
```

Point the AI agent at the printed directory before asking it to create or modify Mythik specs. To copy the docs into a
project-local folder:

```bash
npx mythik docs copy ./mythik-docs
```

## Programmatic API

Use `mythik-cli/api` when a script, IDE integration, or AI agent should avoid shell quoting issues:

```ts
import { runPatch, runPush, runLint } from 'mythik-cli/api';

await runPatch({
  screen: 'home',
  fromFile: 'patch.json',
  json: true,
});
```

The programmatic API uses the same implementation path as the CLI.

## License

Apache-2.0.

## Status

v0.1.1 public release. The binary name is `mythik`; the npm package name is `mythik-cli`.
