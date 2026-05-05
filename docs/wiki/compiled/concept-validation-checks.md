---
id: concept-validation-checks
title: Inline validation `checks`
kind: concept
sources: [docs/consumer/ai-context.md#validation, docs/consumer/reference-doc.md#validation]
---

# Inline validation `checks`

Per-input validators declared on the input element. Use for standalone
fields without form coordination. For multi-field forms with `isValid`
gating, prefer [[@concept-forms]].

## Shape / Signature

```json
{ "type": "input", "props": {
  "value": { "$bindState": "/form/email" },
  "checks": [
    { "type": "required", "message": "Required" },
    { "type": "email", "message": "Invalid email" }
  ],
  "validateOn": "blur"
}}
```

## `validateOn`

`"blur"` (default for forms) — validates when field loses focus.
`"change"` — validates on every keystroke.

## Examples

Simple required field:
```json
{ "type": "input", "props": {
  "value": { "$bindState": "/form/title" },
  "checks": [{ "type": "required" }]
}}
```

Multiple rules:
```json
{ "type": "input", "props": {
  "value": { "$bindState": "/form/email" },
  "checks": [
    { "type": "required", "message": "Email required" },
    { "type": "email", "message": "Invalid email" }
  ],
  "validateOn": "blur"
}}
```

## Related concepts

- [[@concept-validators-catalog]] — full validator list
- [[@concept-forms]] — coordinated form-level validation
- [[@expression-bindstate]]

## Sources (raw)

- `docs/consumer/ai-context.md § Validation`
- `docs/consumer/reference-doc.md § Validation`
