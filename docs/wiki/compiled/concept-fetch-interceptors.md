---
id: concept-fetch-interceptors
title: Fetch interceptors
kind: concept
sources: [docs/consumer/reference-doc.md#fetch-interceptors]
---

# Fetch interceptors

The framework uses a scoped fetch wrapper (NOT `globalThis.fetch`). All
`fetch` and `submitForm` spec actions go through this wrapper. Interceptors
are configured declaratively in AppSpec.

## Shape / Signature

```json
"navigation": {
  "auth": {
    "interceptors": {
      "logging": true,
      "timeout": { "ms": 15000 },
      "retryOnError": { "maxRetries": 2, "statuses": [502, 503] }
    }
  }
}
```

## Interceptors

| Interceptor | Config | Behavior |
|---|---|---|
| **Auth** | Auto when auth configured | Injects Bearer token for `authDomains` URLs. Triggers refresh+retry on 401. |
| **Logging** | `"logging": true` | Logs request method/URL and response status. Redacts sensitive query params (token, password, key). |
| **Timeout** | `"timeout": { "ms": 15000 }` | Aborts request after configured ms via AbortController. |
| **Retry** | `"retryOnError": { ... }` | Retries on transient errors (502, 503, 504) with exponential backoff. |

Auth interceptor is always first in the chain. Custom interceptors from the
host app run after built-in ones.

## Related concepts

- [[@concept-auth-domains]]
- [[@concept-auth-config]]
- [[@concept-action-middleware]] — separate concern (business logic vs networking)
- [[@action-fetch]]

## Sources (raw)

- `docs/consumer/reference-doc.md § Fetch Interceptors`
