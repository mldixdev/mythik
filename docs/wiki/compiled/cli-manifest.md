---
id: cli-manifest
title: `mythik manifest` — structural tree
kind: concept
sources: [docs/consumer/ai-context.md#cli-workflow]
---

# `mythik manifest`

Shows the structural tree of a spec — colorized output, tree view.

## Usage

```bash
mythik manifest task-manager       # screen spec — element tree
mythik manifest app-demo           # AppSpec — layout + screens + tokens
mythik manifest ejecucion-api      # ApiSpec — catalogs + endpoints + auth
```

## Output adapts per doctype

- **Screen spec**: element tree.
- **AppSpec**: layout + screens + tokens summary.
- **ApiSpec**: catalogs + endpoints + auth config.

## Workflow

1. `manifest` — see structure, decide what to modify
2. `elements` — inspect specific elements
3. `patch` — apply surgical changes
4. `manifest` — verify

## Related concepts

- [[@cli-elements]]
- [[@cli-patch]]
- [[@cli-overview]]
- [[@cli-app-spec]]

## Sources (raw)

- `docs/consumer/ai-context.md § CLI Workflow`
- `docs/consumer/reference-doc.md § Workflow: Manifest → Elements → Patch`
