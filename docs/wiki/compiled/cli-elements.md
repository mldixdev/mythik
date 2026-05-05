---
id: cli-elements
title: `mythik elements` — inspect specific elements
kind: concept
sources: [docs/consumer/ai-context.md#cli-workflow, docs/consumer/reference-doc.md#appspec--app-level-configuration]
---

# `mythik elements`

Inspects specific elements by ID. **Supports dot-notation for AppSpec
sections** (tokens, screens, navigation, translations, sharedState).

## Usage

```bash
mythik elements task-manager btn,nav                              # screen-spec elements
mythik elements task-manager btn,nav --toon                        # token-efficient

# AppSpec — dot-notation for non-element sections
mythik elements app-demo tokens.colors
mythik elements app-demo screens.task-manager
mythik elements app-demo navigation.auth
mythik elements app-demo sidebar,nav-item                          # layout elements (simple ID)
mythik elements app-demo sidebar,tokens.colors,screens.task-manager # mixed

# ApiSpec
mythik elements ejecucion-api endpoints.ejecucion-crud
```

## Related concepts

- [[@cli-manifest]]
- [[@cli-toon]]
- [[@cli-app-spec]]

## Sources (raw)

- `docs/consumer/ai-context.md § CLI Workflow`
- `docs/consumer/reference-doc.md § AppSpec → AppSpec — App-Level Configuration`
