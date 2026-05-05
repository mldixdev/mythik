---
id: cli-app-spec
title: CLI on AppSpecs
kind: concept
sources: [docs/consumer/reference-doc.md#appspec--app-level-configuration]
---

# CLI on AppSpecs

Same CLI commands work on AppSpec documents (`type: "app"`). **Detection
is automatic.**

## Examples

```bash
mythik manifest app-demo                                    # tree
mythik elements app-demo tokens.colors                       # dot-notation for tokens
mythik elements app-demo screens.task-manager                # dot-notation for screens
mythik elements app-demo navigation.auth                     # dot-notation for navigation
mythik elements app-demo sidebar,nav-item                    # layout elements (simple ID)
mythik elements app-demo sidebar,tokens.colors,screens.task-manager  # mixed

mythik patch app-demo '[{"op":"replace","path":"/tokens/colors/primary","value":"#2563EB"}]'
mythik patch app-demo '[{"op":"replace","path":"/layout/elements/sidebar/props/style/width","value":280}]'
mythik patch app-demo '[{"op":"add","path":"/screens/reports","value":{"label":"Reports","icon":"chart-bar"}}]'

mythik validate app-demo
```

## Key differences from screen specs

- **Elements live under `/layout/elements/`** (NOT `/elements/`).
  See [[@antipattern-element-variant-top-level]] for the typical mix-up.
- **Dot-notation** in `elements` for inspecting tokens, screens,
  navigation, translations, sharedState.
- **Patch paths** use full JSON Pointer: `/tokens/...`, `/screens/...`,
  `/layout/elements/...`.
- **Validation** includes cross-reference checks (screen existence,
  roleAccess consistency).
- **Translation key mismatches** are warnings, not errors.

## Related concepts

- [[@concept-app-spec]]
- [[@cli-elements]]
- [[@cli-patch]]
- [[@cli-validate]]
- [[@cli-overview]]

## Sources (raw)

- `docs/consumer/reference-doc.md § AppSpec — App-Level Configuration`
- `docs/consumer/reference-doc.md § rule 62`
