---
id: concept-custom-jwt-provider
title: Custom JWT provider response mapping
kind: concept
sources: [docs/consumer/ai-context.md#auth-config, docs/consumer/reference-doc.md#rule-68]
---

# Custom JWT provider response mapping

The Custom JWT provider maps login and refresh responses with explicit dot
paths.

## Token and user paths

`tokenPath`, `refreshTokenPath`, and `userPath` are dot paths against the
full login/refresh response.

## Role paths

`rolePath` and `rolesPath` use a compat dual contract:

- Plain keys such as `"role"` or `"roles"` resolve inside the extracted
  `userPath` object.
- Dotted paths such as `"user.role"` or `"data.user.role"` resolve against
  the full response.

If no role or roles are found, Mythik uses `defaultRole` (`"user"` by
default) and warns in development.

## Example

```ts
createCustomJWTProvider({
  tokenPath: "token",
  refreshTokenPath: "refreshToken",
  userPath: "data.user",
  rolePath: "role",
  rolesPath: "roles",
  defaultRole: "user",
});
```

For a response where the role lives outside `data.user`, use the full
dotted path:

```ts
createCustomJWTProvider({
  userPath: "data.user",
  rolePath: "data.authorization.role",
});
```

## Related concepts

- [[@concept-auth-config]]
- [[@concept-auth-security]]
- [[@action-login]]
- [[@concept-role-access]]

## Sources (raw)

- `docs/consumer/ai-context.md` - Auth Config
- `docs/consumer/reference-doc.md` - rule 68
