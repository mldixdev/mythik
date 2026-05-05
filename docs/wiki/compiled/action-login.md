---
id: action-login
title: `login` / `logout` / `refreshSession`
kind: action
sources: [docs/consumer/ai-context.md#login-screen, docs/consumer/reference-doc.md#auth-actions]
---

# `login` / `logout` / `refreshSession`

Authentication actions managed by the auth engine. Tokens NEVER live in state
— they're stored in engine closure only. Credentials are cleared after
login (success AND failure).

## Shape / Signature

```json
{ "action": "login", "params": { "email": <expr>, "password": <expr> } }
{ "action": "logout" }
{ "action": "refreshSession" }
```

## Examples

Login with form-bound paths:
```json
{ "action": "login", "params": {
  "email": { "$state": "/screens/login/email" },
  "password": { "$state": "/screens/login/password" }
}}
```

Logout button:
```json
{ "type": "button",
  "props": { "label": "Sign out" },
  "on": { "press": { "action": "logout" } }
}
```

## Behavior

- **`login`**: dispatches to auth provider; on success writes user data to
  `/auth/*`, schedules proactive token refresh, navigates to `initialScreen`
  (or first accessible screen if `initialScreen` is denied for the user's
  role). Clears `/login/*` credentials regardless of success.
- **`logout`**: clears tokens, state, persistence; broadcasts to other tabs
  (cross-tab sync); navigates to `loginScreen`. With
  `statePolicy: "reset"` on the login screen, form fields auto-clear.
- **`refreshSession`**: manual token refresh. Normally automatic via
  proactive refresh — only call manually for edge cases.

## Constraints / Anti-patterns

- Use `/screens/login/...` paths for login form state, NOT `/form/...`.
  Combined with `statePolicy: "reset"`, credentials clear on logout.
  See [[@pattern-login-screen]].
- For email-convention apps, map email→username server-side via
  `loginBody` template — see [[@pattern-login-body-template]].

## Related concepts

- [[@expression-auth]] — read auth state
- [[@concept-auth-config]] — AppSpec auth block
- [[@concept-auth-state-paths]] — `/auth/*` read-only paths
- [[@pattern-login-screen]] — full login form pattern
- [[@concept-auth-security]] — security guarantees

## Sources (raw)

- `docs/consumer/ai-context.md § AppSpec & Navigation → Login Screen`
- `docs/consumer/reference-doc.md § Authentication → Auth Actions`
