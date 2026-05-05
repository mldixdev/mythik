---
id: cli-docs
title: `mythik docs` - bundled AI documentation
kind: cli
sources: [docs/consumer/ai-context.md#public-package-names, docs/consumer/ai-context.md#cli-workflow, docs/consumer/reference-doc.md#cli--spec-modification-via-mythik-cli]
---

# `mythik docs`

The `mythik` npm package includes the documentation an AI agent needs to use the framework:

- `docs/llms.txt`
- `docs/consumer/ai-context.md`
- `docs/consumer/reference-doc.md`
- `docs/wiki/compiled/README.md`
- `docs/wiki/compiled/_index.md`

Use the CLI to locate the bundled docs after install:

```bash
mythik docs path
```

Use `copy` when the workflow needs a project-local folder to hand to an AI agent:

```bash
mythik docs copy ./mythik-docs
```

`copy` refuses to overwrite a non-empty target directory unless `--force` is provided.

## Agent contract

Before generating or modifying specs, point the AI at the docs path and start from
`llms.txt`, `consumer/ai-context.md`, and `wiki/compiled/README.md`.

For existing specs, continue to use the required edit loop in [[@cli-existing-spec-edit-loop]]:
`manifest` -> `elements` -> `patch --from-file` -> verify.

## Related concepts

- [[@cli-overview]]
- [[@cli-existing-spec-edit-loop]]
- [[@concept-public-package-names]]
