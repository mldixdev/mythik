---
id: concept-auth-state-paths
title: Auth state paths — `/auth/*`
kind: concept
sources: [docs/consumer/ai-context.md#login-screen, docs/consumer/reference-doc.md#auth-state-paths-read-only-auto-managed]
---

# Auth state paths — `/auth/*`

Auth state paths are **read-only** and auto-managed by the auth engine.
StateGuard blocks spec writes to `/auth/*`.

## Paths

| Path | Type |
|---|---|
| `/auth/isAuthenticated` | boolean |
| `/auth/loading` | boolean |
| `/auth/error` | string \| null |
| `/auth/user/id` | string |
| `/auth/user/email` | string |
| `/auth/user/name` | string \| null |
| `/auth/user/avatar` | string \| null |
| `/auth/user/role` | string (primary) |
| `/auth/user/roles` | string[] (all roles) |
| `/auth/user/metadata` | object \| null |

## Read patterns

Prefer [[@expression-auth]] over `$state: "/auth/user/..."` — `$auth` is
whitelisted (blocks tokens/passwords).

## Tokens NEVER live in state

Tokens (access, refresh) live in engine closure only — never written to
the state store. See [[@concept-auth-security]].

## Related concepts

- [[@expression-auth]]
- [[@concept-auth-security]]
- [[@concept-state-protection]]
- [[@action-login]]

## Sources (raw)

- `docs/consumer/ai-context.md § AppSpec & Navigation → Login Screen`
- `docs/consumer/reference-doc.md § Auth State Paths`
