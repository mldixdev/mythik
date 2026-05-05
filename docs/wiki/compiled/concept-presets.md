---
id: concept-presets
title: Presets — `PresetDefinition`
kind: concept
sources: [docs/consumer/ai-context.md#presets-system, docs/consumer/reference-doc.md#presets-system]
---

# Presets — `PresetDefinition`

Curated DNA + Identity snapshots that transform the entire look of an app
with a single action. The framework provides the **tools** (contract,
registration, application); preset definitions live **outside core** (in
the app, a file, or a future API like mythik.dev).

## Interface

```ts
interface PresetDefinition {
  id: string;           // 'startup-saas'
  name: string;         // 'Startup SaaS'
  description: string;  // 'Clean, professional, outlined'
  tags?: string[];      // ['professional', 'minimal']
  tokens: {
    dna: DnaSeed;
    identity: IdentityConfig;
  };
}
```

## Architectural principle

The framework provides tools, not opinions. Presets live in
consumer/application code; framework supplies registration + activation
infrastructure.

## Related concepts

- [[@concept-register-presets]]
- [[@action-apply-preset]]
- [[@concept-preset-dropdown-pattern]]
- [[@concept-custom-detection-pattern]]
- [[@concept-dna-seeds]]
- [[@concept-identity-overview]]
- [[@path-presets-available]]

## Sources (raw)

- `docs/consumer/ai-context.md § Presets System`
- `docs/consumer/reference-doc.md § Presets System` + rule 167
