---
id: path-login
title: `/screens/login/*` and `/login/*`
kind: concept
sources: [docs/consumer/ai-context-runtime-semantics.md#25-login]
---

# `/screens/login/*` and `/login/*`

Two conventions for login form state — pick one and use consistently.

## `/screens/login/*` (canonical for AppSpec)

```json
"value": { "$bindState": "/screens/login/email" }
"value": { "$bindState": "/screens/login/password" }
```

Combined with `statePolicy: "reset"` on the login screen, AppEngine
clears `/screens/login` when navigating to the login screen — credentials
auto-clear on logout.

## `/login/*` (framework convention for runtime-semantics)

The runtime-semantics doc and `login` action use `/login/username` /
`/login/password` paths in some examples:

```json
{ "action": "login", "params": {
  "username": { "$state": "/login/username" },
  "password": { "$state": "/login/password" }
}}
```

These are auto-cleared on logout (rule 47).

## Pick one

**For AppSpec apps**: use `/screens/login/*` + `statePolicy: "reset"`.
**For email-convention apps**: use `loginBody` template to map at the spec
level — see [[@pattern-login-body-template]].

## Constraints

- **Don't use `/form/*` for login fields** — root-level paths persist
  across logouts (rule 30).

## Related concepts

- [[@action-login]]
- [[@pattern-login-screen]]
- [[@pattern-login-body-template]]
- [[@concept-state-policies]] — `reset` policy

## Sources (raw)

- `docs/consumer/ai-context-runtime-semantics.md § 2.5`
