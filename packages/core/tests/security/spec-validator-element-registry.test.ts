import { describe, it, expect } from 'vitest';
import { validateSpec } from '../../src/security/spec-validator.js';
import { createPrimitiveRegistry } from '../../src/renderer/registry.js';
import { createElementRegistry } from '../../src/elements/composer.js';
import type { Spec } from '../../src/types.js';

describe('spec-validator — ElementRegistry awareness (Layer 3)', () => {
  it('does NOT flag a custom element type as "unknown primitive" when elementRegistry knows it', () => {
    const primitiveRegistry = createPrimitiveRegistry();
    primitiveRegistry.register('stack', () => ({ type: 'stack', props: {}, children: [] }));
    primitiveRegistry.register('text', () => ({ type: 'text', props: {}, children: [] }));

    const elementRegistry = createElementRegistry();
    elementRegistry.register({
      type: 'stat-card',
      props: { label: { type: 'string' } },
      render: { type: 'stack', props: {}, children: [{ type: 'text', props: { content: { $prop: 'label' } } }] },
    });

    const spec: Spec = {
      root: 'r',
      elements: {
        r: { type: 'stat-card', props: { label: 'Hello' } },
      },
    };

    const result = validateSpec(spec, { primitiveRegistry, elementRegistry });
    // Custom element 'stat-card' should NOT trigger "unknown primitive type" error
    const primTypeErrors = result.errors.filter((e) => e.message.includes('unknown primitive type'));
    expect(primTypeErrors).toHaveLength(0);
    expect(result.valid).toBe(true);
  });

  it('still flags genuinely unknown types not in either registry', () => {
    const primitiveRegistry = createPrimitiveRegistry();
    primitiveRegistry.register('stack', () => ({ type: 'stack', props: {}, children: [] }));

    const elementRegistry = createElementRegistry();

    const spec: Spec = {
      root: 'r',
      elements: {
        r: { type: 'totally-bogus-type', props: {} },
      },
    };

    const result = validateSpec(spec, { primitiveRegistry, elementRegistry });
    const primTypeErrors = result.errors.filter((e) => e.message.includes('unknown primitive type'));
    expect(primTypeErrors).toHaveLength(1);
    expect(primTypeErrors[0].message).toContain('totally-bogus-type');
  });
});
