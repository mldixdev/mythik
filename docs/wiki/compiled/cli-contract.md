---
id: cli-contract
title: `mythik contract` — frontend↔backend cross-validation
kind: concept
sources: [docs/consumer/reference-doc.md#typed-contract-sp4]
---

# `mythik contract`

Cross-validates screen specs against api-specs before deploy. Only
possible because both sides are declarative JSON.

## Usage

```bash
# Single api-spec
mythik contract --app app-demo --api ejecucion-api

# Multiple api-specs (modular backends)
mythik contract --app app-demo --api presupuesto-api,rrhh-api

# Api-specs in separate table
mythik contract --app app-demo --api ejecucion-api --api-table api_specs

# Strip base URL
mythik contract --app app-demo --api ejecucion-api --base-url http://localhost:3010

# JSON output for CI/CD (exit code 1 on errors)
mythik contract --app app-demo --api ejecucion-api --json
```

## 4 rules

| Rule | Level | Checks |
|---|---|---|
| `endpoints-exist` | error | Every fetch URL in screens matches an endpoint, catalog, or builtin |
| `fields-valid` | error | POST/PUT body fields exist in CRUD `insertable` / `updatable` |
| `params-match` | warning | Query params match endpoint `params` config. `page`/`pageSize` always valid |
| `permissions-consistent` | warning | If AppSpec `roleAccess` grants role access to a screen, endpoints used by that screen allow that role via `policies` |

All include Levenshtein "did you mean?" suggestions.

## Why this is unique

The permissions-consistent rule — "Role X can access screen Y but API
denies the action" — is only possible because both frontend (`roleAccess`)
and backend (`policies`) are declarative JSON. In code-based systems, UI
visibility and API permissions live in separate layers (rule 76).

## Notes

- **Duplicate findings collapsed** with `count` field (rule 79).
- **Template domain URLs** (`http://${authDomain}/api/items`) normalized
  to relative paths before matching (rule 80).
- **`--base-url` is explicit only** — no auto-detection from authDomains.
  Absolute URLs without `--base-url` emit a warning (rule 81).

## Extensibility

Rules are pluggable — adding a new rule is one file implementing
`ContractRule` + adding to the rules array. No engine changes needed.

## Related concepts

- [[@pattern-fullstack-coherence]]
- [[@concept-app-spec]]
- [[@concept-api-spec]]
- [[@concept-role-access]]
- [[@cli-overview]]

## Sources (raw)

- `docs/consumer/reference-doc.md § Typed Contract (SP4)`
