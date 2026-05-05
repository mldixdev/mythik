import { describe, it, expect } from 'vitest';
import { generateReferenceDoc } from '../../src/reference/generator.js';
import type { ReferenceDocConfig } from '../../src/reference/generator.js';
import type { ElementDefinition } from '../../src/elements/composer.js';
import type { DesignTokens } from '../../src/design/tokens.js';

describe('Reference Document Generator', () => {
  const baseConfig: ReferenceDocConfig = {
    name: 'TestApp',
    primitives: ['box', 'text', 'stack', 'button', 'input'],
  };

  it('generates a non-empty document', () => {
    const doc = generateReferenceDoc(baseConfig);
    expect(doc.length).toBeGreaterThan(100);
  });

  it('includes the project name in the header', () => {
    const doc = generateReferenceDoc(baseConfig);
    expect(doc).toContain('# TestApp');
  });

  it('lists all primitives', () => {
    const doc = generateReferenceDoc(baseConfig);
    expect(doc).toContain('`box`');
    expect(doc).toContain('`text`');
    expect(doc).toContain('`stack`');
    expect(doc).toContain('`button`');
    expect(doc).toContain('`input`');
  });

  it('includes all expression types', () => {
    const doc = generateReferenceDoc(baseConfig);
    expect(doc).toContain('$state');
    expect(doc).toContain('$bindState');
    expect(doc).toContain('$token');
    expect(doc).toContain('$cond');
    expect(doc).toContain('$template');
    expect(doc).toContain('$computed');
    expect(doc).toContain('$let');
    expect(doc).toContain('$ref');
    expect(doc).toContain('$i18n');
    expect(doc).toContain('$breakpoint');
    expect(doc).toContain('$item');
    expect(doc).toContain('$index');
    expect(doc).toContain('$prop');
  });

  it('includes built-in actions', () => {
    const doc = generateReferenceDoc(baseConfig);
    expect(doc).toContain('setState');
    expect(doc).toContain('navigate');
    expect(doc).toContain('openModal');
    expect(doc).toContain('toggleTheme');
    expect(doc).toContain('showNotification');
  });

  it('includes built-in validators', () => {
    const doc = generateReferenceDoc(baseConfig);
    expect(doc).toContain('required');
    expect(doc).toContain('email');
    expect(doc).toContain('minLength');
    expect(doc).toContain('pattern');
    expect(doc).toContain('requiredIf');
  });

  it('includes spec structure documentation', () => {
    const doc = generateReferenceDoc(baseConfig);
    expect(doc).toContain('Flat Tree');
    expect(doc).toContain('"root"');
    expect(doc).toContain('"elements"');
  });

  it('includes rules', () => {
    const doc = generateReferenceDoc(baseConfig);
    expect(doc).toContain('$token');
    expect(doc).toContain('$i18n');
    expect(doc).toContain('flat tree');
  });

  it('includes custom elements when provided', () => {
    const ratingStars: ElementDefinition = {
      type: 'rating-stars',
      props: {
        max: { type: 'number', default: 5 },
        label: { type: 'string' },
        size: { type: 'enum', values: ['sm', 'md', 'lg'], default: 'md' },
      },
      render: { type: 'stack', children: [] },
    };

    const doc = generateReferenceDoc({ ...baseConfig, elements: [ratingStars] });
    expect(doc).toContain('rating-stars');
    expect(doc).toContain('max');
    expect(doc).toContain('(default: 5)');
    expect(doc).toContain('sm, md, lg');
  });

  it('includes design tokens when provided', () => {
    const tokens: DesignTokens = {
      colors: { primary: '#E63946', secondary: '#457B9D' },
      spacing: { unit: 8 },
      radius: { sm: 4, lg: 16 },
    };

    const doc = generateReferenceDoc({ ...baseConfig, tokens });
    expect(doc).toContain('colors.primary');
    expect(doc).toContain('#E63946');
    expect(doc).toContain('spacing.unit');
    expect(doc).toContain('radius.lg');
  });

  it('includes token modes when present', () => {
    const tokens: DesignTokens = {
      colors: { background: '#fff' },
      modes: {
        dark: { colors: { background: '#1d1d2b' } },
        light: { colors: { background: '#ffffff' } },
      },
    };

    const doc = generateReferenceDoc({ ...baseConfig, tokens });
    expect(doc).toContain('dark');
    expect(doc).toContain('light');
    expect(doc).toContain('Available modes');
  });

  it('includes custom actions', () => {
    const doc = generateReferenceDoc({
      ...baseConfig,
      actions: [{ name: 'submitPatient', handler: async () => {} }],
    });
    expect(doc).toContain('submitPatient');
  });

  it('includes custom validators', () => {
    const doc = generateReferenceDoc({
      ...baseConfig,
      validators: [{ name: 'isValidRUT', validate: () => true, message: 'Invalid RUT' }],
    });
    expect(doc).toContain('isValidRUT');
    expect(doc).toContain('Invalid RUT');
  });

  it('generates valid markdown (no broken sections)', () => {
    const doc = generateReferenceDoc({
      ...baseConfig,
      elements: [{
        type: 'status-badge',
        props: { status: { type: 'enum', values: ['active', 'inactive'], default: 'active' }, label: { type: 'string' } },
        render: { type: 'box', children: [] },
      }],
      tokens: { colors: { primary: '#000' } },
      actions: [{ name: 'custom', handler: async () => {} }],
      validators: [{ name: 'custom', validate: () => true }],
    });

    // Every section header should be present
    expect(doc).toContain('## Expression Types');
    expect(doc).toContain('## Available Primitives');
    expect(doc).toContain('## Custom Elements');
    expect(doc).toContain('## Design System Tokens');
    expect(doc).toContain('## Actions');
    expect(doc).toContain('## Validation');
    expect(doc).toContain('## Spec Structure');
    expect(doc).toContain('## Rules');
  });
});
