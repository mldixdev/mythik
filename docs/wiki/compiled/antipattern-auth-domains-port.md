---
id: antipattern-auth-domains-port
title: Anti-pattern — `:port` in `authDomains`
kind: pattern
sources: [docs/consumer/ai-context-runtime-semantics.md#41-authdomains-hostname-only--blocker-5, docs/consumer/reference-doc.md#rule-71]
---

# Anti-pattern — `:port` in `authDomains`

The `authDomains` matcher uses `URL.hostname` for comparison — **port is
silently stripped**. An entry containing `:port` literally never matches
any URL's hostname.

## Wrong

```json
"authDomains": ["localhost:5173"]
```

The matcher compares `URL.hostname` (just `"localhost"`) against the
entry (`"localhost:5173"` — contains `:5173`). Never matches → tokens
never inject in dev → "auth works in prod but not dev with localhost:5173"
symptom.

## Right

```json
"authDomains": ["localhost"]
```

Matches all localhost ports (5173, 3010, etc.).

## Detection

`mythik lint` rule **`spec-auth-domains-port`** (severity: warning).
Also runs during `mythik push` and `mythik validate`. See [[@cli-lint]].

## Related concepts

- [[@concept-auth-domains]]
- [[@concept-fetch-interceptors]]
- [[@cli-lint]]

## Sources (raw)

- `docs/consumer/ai-context-runtime-semantics.md § 4.1` + § 7.4
- `docs/consumer/reference-doc.md § rules 71, 249`
