---
id: concept-render-error-visibility
title: Render error visibility
kind: concept
sources: [docs/consumer/reference-doc.md#render-error-visibility, docs/consumer/ai-context-runtime-semantics.md#28-render-errors-and-securityexposeerrors]
---

# Render error visibility

`createMythik({ security: { exposeErrors } })` controls how much render
error detail the UI exposes.

## Host setup

```ts
const svc = createMythik({
  security: { exposeErrors: false },
});

<MythikRenderer spec={spec} instance={svc} />
```

Default is exposed mode: `security.exposeErrors !== false`.

## Error surfaces

- **Renderer `_error` nodes**: emitted by the render engine for spec or
  resolution failures. When exposure is enabled, `MythikRenderer` renders
  the `_error` placeholder and writes diagnostics to `/ui/renderErrors`.
- **Thrown primitive/component exceptions**: caught by the
  `MythikRenderer` render error boundary. In development with exposure
  enabled, the boundary shows a visible overlay with the error message and
  component stack.

## Production / no-expose mode

In production, or when `security.exposeErrors: false`, thrown render
exceptions render a neutral placeholder without leaking error details.

The boundary resets when the `spec` prop changes, so replacing a broken
spec with a valid one can recover without remounting the host app.

## Scope

This is a host/runtime security setting. Spec authors do not configure it
inside JSON specs.

## Related concepts

- [[@concept-mythik-renderer]]
- [[@concept-custom-element-error-boundary]]
- [[@path-ui-loading-error]]

## Sources (raw)

- `docs/consumer/reference-doc.md` - Render Error Visibility + rule 251
- `docs/consumer/ai-context-runtime-semantics.md` - section 2.8
