---
id: concept-action-middleware
title: Action middleware
kind: concept
sources: [docs/consumer/reference-doc.md#action-middleware]
---

# Action middleware

Pre/post/onError hooks that run on EVERY dispatcher action (not just
`fetch`). Configured at the host-app level via `MythikApp` props.

## Host-app config

```tsx
<MythikApp
  auth={{
    provider: createSupabaseAuthProvider(client),
    middleware: [myLoggingMiddleware, myAnalyticsMiddleware],
  }}
/>
```

## Middleware shape

```ts
{
  name: "my-middleware",
  before: (ctx) => { /* runs before action; ctx.action, ctx.params, ctx.getState(), ctx.setParam() */ },
  after: (ctx, result) => { /* after successful action */ },
  onError: (ctx, error) => { /* on action failure (isolated per handler) */ }
}
```

## Behavior

- Executes in registration order.
- `before` can modify params via `ctx.setParam()`.
- `onError` handlers are isolated — one failing handler doesn't prevent
  others from running.

## Separation of concerns

- **Fetch interceptors** = networking (headers, retry, timeout). See
  [[@concept-fetch-interceptors]].
- **Action middleware** = business logic (logging, analytics, auth lifecycle).

## Related concepts

- [[@concept-fetch-interceptors]]
- [[@concept-customize-plugin]] — for cross-cutting framework features

## Sources (raw)

- `docs/consumer/reference-doc.md § Action Middleware`
