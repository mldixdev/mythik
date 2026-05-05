---
id: pattern-login-body-template
title: Pattern — `loginBody` (email→username mapping)
kind: pattern
sources: [docs/consumer/ai-context-runtime-semantics.md#32-apiauthlogin-body-contract]
---

# Pattern — `loginBody` (email→username mapping)

The framework's `/api/auth/login` expects `{ username, password }` —
**not `email`**. For email-convention apps, map at the spec level via
`loginBody`.

## Why `username` and not `email`

The framework supports non-email username auth (employee ID, LDAP username,
etc.). The server validates against `usernameColumn` from the auth
provider, which can be an email column.

## Pattern

```json
{
  "auth": {
    "loginBody": {
      "username": { "$state": "/login/email" },
      "password": { "$state": "/login/password" }
    }
  }
}
```

The `loginBody` template is resolved at login dispatch — consumer's email
field value becomes the server's `username` field value. Server sees
`{ username: <email-string>, password: <pw> }` and validates against the
users table's `usernameColumn`.

## Related concepts

- [[@concept-api-login-body-contract]]
- [[@concept-auth-config]]
- [[@action-login]]
- [[@pattern-login-screen]]

## Sources (raw)

- `docs/consumer/ai-context-runtime-semantics.md § 3.2`
