---
id: cli-validate
title: `mythik validate`
kind: concept
sources: [docs/consumer/ai-context.md#cli-workflow]
---

# `mythik validate`

Validates a spec against framework rules. Per-doctype validation:

| Doctype | Validates |
|---|---|
| Screen | Element tree, expressions, prop names (with Levenshtein "did you mean?") |
| AppSpec | Cross-references (screen existence, roleAccess consistency) |
| ApiSpec | Catalogs, endpoints, auth, audit |

## Usage

```bash
mythik validate task-manager
mythik validate app-demo
mythik validate ejecucion-api
```

## Lint integration

Three new spec validator checks ALSO run during `mythik validate` and
`mythik push` (defense-in-depth — see [[@cli-lint]]):

- `spec-row-literal` (warning)
- `spec-crud-id-collision` (error)
- `spec-auth-domains-port` (warning)

`mythik validate <id>` shows both errors AND `lintWarnings`.

## CLI warnings on unknown props

Unknown prop names get warnings (not errors) with Levenshtein
suggestions: `⚠ unknown prop "inputType" for type "input" — did you
mean "type"?` (rule 64).

## Related concepts

- [[@cli-lint]]
- [[@cli-push]]
- [[@cli-overview]]

## Sources (raw)

- `docs/consumer/ai-context.md § CLI Workflow`
- `docs/consumer/reference-doc.md § rule 64`
