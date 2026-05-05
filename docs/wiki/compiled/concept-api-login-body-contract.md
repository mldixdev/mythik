---
id: concept-api-login-body-contract
title: `/api/auth/login` body contract
kind: concept
sources: [docs/consumer/ai-context-runtime-semantics.md#32-apiauthlogin-body-contract]
---

# `/api/auth/login` body contract

The framework's `/api/auth/login` expects body `{ "username": string,
"password": string }`. **Not `email`.** Maps to enterprise apps that use
non-email username auth (employee ID, LDAP username, etc.).

## Expected body

```json
{ "username": "alice", "password": "..." }
```

## Response on missing fields

HTTP 400:
```json
{ "error": { "code": "VALIDATION_FAILED", "message": "username and password are required" } }
```

## Response on success

JWT + refresh token shape (exact fields depend on provider config — check
your `auth.provider` response shape).

## Email-convention apps

Use `loginBody` template at the spec level — see
[[@pattern-login-body-template]]. The server validates against the users
table's `usernameColumn`, which can be an email column.

## Related concepts

- [[@pattern-login-body-template]]
- [[@concept-api-auth]]
- [[@action-login]]
- [[@pattern-login-screen]]

## Sources (raw)

- `docs/consumer/ai-context-runtime-semantics.md § 3.2`
