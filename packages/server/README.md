# mythik-server

Declarative REST server for Mythik ApiSpecs.

## Install

```bash
npm install mythik-server
```

## What It Provides

- `createServer({ spec, database })` bootstrap for ApiSpec-driven REST servers.
- Query, handler, CRUD, and public endpoint patterns.
- JWT authentication helpers.
- Role policy evaluation.
- Row-level security helpers.
- Catalog endpoints.
- SQL identifier validation and ApiSpec validation.
- DB-backed auth provider helpers.

## Basic Usage

```ts
import { createServer } from 'mythik-server';

const server = createServer({
  spec: './api-spec.json',
  database: {
    server: process.env.DB_SERVER!,
    database: process.env.DB_NAME!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    trustServerCertificate: true,
  },
});

await server.start(3010);
```

## ApiSpec Philosophy

The ApiSpec should describe routes, parameters, auth policy, row-level scope, catalogs, and CRUD shape. Environment secrets and database connections belong in host configuration, not in the JSON spec.

## License

Apache-2.0.

## Status

v0.1.1 public release. Use with `mythik-cli contract` to cross-check frontend specs against backend endpoints before deployment.
