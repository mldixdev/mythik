---
id: concept-auth-domains
title: `authDomains` — hostname matcher
kind: concept
sources: [docs/consumer/ai-context-runtime-semantics.md#41-authdomains-hostname-only--blocker-5, docs/consumer/reference-doc.md#authentication]
---

# `authDomains` — hostname matcher

Auth headers (Bearer tokens) are auto-injected on fetch/submitForm requests
when the URL's hostname matches any entry in `authDomains`.

## Matching contract

**Port is stripped — hostname only.** Comparison uses `new URL(fetchUrl).hostname`.

| Entry | Matches | Does NOT match |
|---|---|---|
| `"api.example.com"` | `https://api.example.com/...` (any port) | `https://notapi.example.com`, `https://example.com` |
| `"example.com"` | `https://example.com`, `https://api.example.com`, `https://foo.example.com` (subdomain) | `https://notexample.com` |
| `"localhost"` | `http://localhost:5173/...`, `http://localhost:3010/...` | `http://127.0.0.1` |
| `"localhost:5173"` | **nothing** (port is stripped from URL hostname) | everything |

## Subdomain matching

An entry `"example.com"` matches any URL whose hostname **ends with** `.example.com` (note the leading dot — prevents `"api.com"` from matching `"notapi.com"`).

## URL scheme filter

Only `http://` and `https://` URLs are considered. Relative paths
(`/api/rooms`), `file:`, `data:`, etc. return `false` before matching —
auth headers are not injected on those requests.

## Dev-mode guidance

Configure `authDomains: ["localhost"]` (no port). Tokens inject on any
localhost port during dev.

## Constraints / Anti-patterns

- **Never include `:port`** in `authDomains[]` entries — port is silently
  stripped, leading to apparent matches that don't match. See
  [[@antipattern-auth-domains-port]] (also a `mythik lint` rule).

## Related concepts

- [[@concept-auth-config]]
- [[@concept-fetch-interceptors]]
- [[@antipattern-auth-domains-port]]
- [[@cli-lint]] — `spec-auth-domains-port` rule

## Sources (raw)

- `docs/consumer/ai-context-runtime-semantics.md § 4.1`
- `docs/consumer/reference-doc.md § Authentication → authDomains matcher behavior` + rule 71
