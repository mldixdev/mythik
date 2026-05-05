---
id: primitive-wizard
title: `wizard` — multi-step flow
kind: primitive
sources: [docs/consumer/ai-context-primitives.md#wizard]
---

# `wizard`

Multi-step wizard. Renders progress bar + "Step X of Y". Use `visible`
conditions on children to show/hide per step. Navigate by setting the step
number with `setState`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `currentStep` | number/expression | — | 0-based step index. Use `$state` (read-only display) |
| `totalSteps` | number | — | Total step count |

## Examples

```json
{
  "type": "wizard",
  "props": { "currentStep": { "$state": "/wizard/step" }, "totalSteps": 3 },
  "children": ["step-1", "step-2", "step-3"]
},
"step-1": { "type": "box", "visible": { "$state": "/wizard/step", "eq": 0 }, "children": [...] },
"next-btn": {
  "type": "button",
  "on": { "press": { "action": "setState", "params": { "statePath": "/wizard/step", "value": 1 } } }
}
```

## Related concepts

- [[@action-set-state]]
- [[@concept-visibility]]

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § wizard`
