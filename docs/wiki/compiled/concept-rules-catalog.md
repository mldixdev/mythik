---
id: concept-rules-catalog
title: Rules catalog - pointer to the 256 numbered rules
kind: concept
sources: [docs/consumer/reference-doc.md]
---

# Rules catalog

`docs/consumer/reference-doc.md` contains 256 numbered rules. Each rule's
substantive content lives in the appropriate concept article in this
compiled wiki; this article is a pointer/index so you can find the right
article when a doc references a rule by number.

## Range index

| Rules | Topic | Articles |
|---|---|---|
| 1-62 | Spec generation core (flat tree, expressions, actions, transactions, repeat, derive, dataSources, AppSpec, auth, animations, identity, presets) | See [[@concept-spec-structure]], expression-* and action-* articles |
| 63-68 | Custom elements + CustomJWTProvider mapping | [[@concept-custom-elements]], [[@concept-custom-jwt-provider]] |
| 69 | `$row` does not exist | [[@antipattern-row-literal]] |
| 70 | CRUD `:id` collision | [[@antipattern-crud-id-collision]] |
| 71 | `authDomains` port stripping | [[@antipattern-auth-domains-port]] |
| 82-110 | Versioning + presets + DNA + identity | [[@concept-versioned-store]], [[@concept-presets]], [[@concept-dna-seeds]], [[@concept-identity-overview]] |
| 111-170 | Identity system + presets + background v1 | [[@concept-identity-overview]] et al. |
| 171-179 | Background v2 infrastructure (LayerBackground) | [[@concept-layer-background]] et al. |
| 180-200 | Animation engine | [[@concept-animations-engine]] et al. |
| 201-225 | Animation cascade, blob layers, background root mount, and select portal | [[@concept-animation-cascade]], [[@concept-blob-layer]], [[@concept-background-stack]] |
| 226-240 | Layer 3 custom elements (cascade, repeat, error boundary) | [[@concept-custom-elements]] et al. |
| 241-245 | Runtime semantics doc additions | [[@path-ui-selected-row]], [[@concept-expression-timing]], [[@concept-api-crud-endpoint]], [[@concept-api-login-body-contract]], [[@concept-query-envelope]] |
| 248 | CLI is the only approved spec-write path | [[@cli-push]], [[@cli-patch]], [[@antipattern-store-save-bypass]] |
| 251 | `security.exposeErrors` controls render error detail | [[@concept-render-error-visibility]], [[@concept-mythik-renderer]] |
| 252-253 | Icon renderer registration and override contract | [[@primitive-icon]], [[@concept-identity-icons]] |
| 254-256 | CLI input precedence, patch versioning metadata, DB-first sync | [[@cli-patch]], [[@cli-programmatic-api]], [[@pattern-push-vs-patch]] |

## Why one pointer instead of 256 articles

Each rule's substantive content already lives in the relevant concept
article (see the range index above). One catalog article preserves the
ability to look up a rule by number while avoiding hundreds of redundant
micro-articles.

## Related concepts

- [[@concept-where-to-look]]

## Sources (raw)

- `docs/consumer/reference-doc.md` (full - 256 numbered rules)
