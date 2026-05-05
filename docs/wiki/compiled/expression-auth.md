---
id: expression-auth
title: `$auth` — authenticated user data
kind: expression
sources: [docs/consumer/ai-context.md#login-screen, docs/consumer/reference-doc.md#expression-types, docs/consumer/reference-doc.md#authentication]
---

# `$auth` — authenticated user data

Reads from the authenticated user's data with a **security whitelist**.
Sensitive fields (token, password, secret, session, and variants) always
return `undefined`. Prefer `$auth` over `$state: "/auth/user/..."` —
`$auth` is whitelisted, has clear semantics, and is stable across framework
versions.

## Shape / Signature

```json
{ "$auth": "<field>" }
```

## Allowed fields

| Field | Returns |
|---|---|
| `isAuthenticated` | boolean — false when no auth state |
| `id`, `email`, `name`, `avatar` | User profile fields |
| `role` | Primary role (string) |
| `roles` | All roles (string[]) |
| `metadata` | Full metadata object |
| `metadata.*` | Nested metadata field (dot notation) |
| `user` | Full user object |
| `loading` | Auth operation in progress |
| `error` | Last auth error message or null |

## Blocked fields (always return `undefined`)

`token`, `accessToken`, `access_token`, `refreshToken`, `refresh_token`,
`password`, `secret`, `session`, `metadata.token`, `metadata.password`.

## Examples

Show user email:
```json
{ "$auth": "email" }
```

Visibility by role:
```json
"visible": { "$auth": "role", "eq": "admin" }
```

Login button label reflecting loading state:
```json
"label": { "$cond": { "$auth": "loading" }, "$then": "Signing in...", "$else": "Login" }
```

Avatar URL for the current user:
```json
{ "$template": "/avatars/${ /auth/user/id }.png" }
```

(Or with `$auth`: `{ "$template": "/avatars/${id}.png" }` after capturing
via `$let`.)

## Constraints / Anti-patterns

- `$auth` in `derive` is NOT available — use `$state` to read from
  `/auth/*` paths in derive expressions. See [[@concept-expression-contexts]].
- Auth state paths (`/auth/*`) are read-only — see [[@path-app-screens]] +
  [[@concept-state-protection]].

## Related concepts

- [[@path-app-screens]] — auto-managed `/auth/*` paths
- [[@concept-auth-security]] — full guarantees + blocked-field list
- [[@action-login]] — `login` action sets `$auth.*`
- [[@concept-role-access]] — paired with `$auth.role`

## Sources (raw)

- `docs/consumer/ai-context.md § AppSpec & Navigation → Login Screen`
- `docs/consumer/reference-doc.md § Expression Types → $auth` + § Authentication
