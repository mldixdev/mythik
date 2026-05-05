---
id: concept-customize-server-middleware
title: Customize — custom server middleware (`mythik-server`)
kind: concept
sources: [docs/consumer/WHERE-TO-LOOK.md]
---

# Customize — custom server middleware

Server middleware uses the standard Express `(req, res, next)` shape;
`server.ts` is where the chain is assembled.

## Read order

1. **`packages/server/src/server.ts`** — `createServer` (full Express
   middleware chain composition: CORS, body parser, auth, error handler;
   plus per-endpoint registration in `registerEndpoint`).
2. **`packages/server/src/middleware/cors.ts`** +
   `middleware/error-handler.ts` — existing chain-level middleware.
3. **`packages/server/src/auth/middleware.ts`** — canonical
   request-gating middleware shape.

## Pattern

Insert your middleware into the chain composition in `server.ts`, or
expose it via a config option for `createServer`.

## Related concepts

- [[@concept-where-to-look]]
- [[@concept-api-spec]]
- [[@concept-api-handler-endpoint]]

## Sources (raw)

- `docs/consumer/WHERE-TO-LOOK.md § Section 1 → custom server middleware`
