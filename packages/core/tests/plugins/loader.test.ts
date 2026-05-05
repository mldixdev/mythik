import { describe, it, expect } from 'vitest';
import { createPluginLoader } from '../../src/plugins/loader.js';
import type { ExpressionHandlerDefinition, ActionDefinition, ValidatorDefinition, SourceProviderDefinition, RenderNode } from '../../src/types.js';
import type { ElementDefinition } from '../../src/elements/composer.js';

describe('PluginLoader', () => {
  it('registers an expression handler plugin', () => {
    const loader = createPluginLoader();
    const handler: ExpressionHandlerDefinition = { key: '$custom', resolve: (expr) => `custom:${(expr as Record<string, unknown>).$custom}` };
    loader.registerExpression(handler);
    expect(loader.getExpressionHandlers()).toContainEqual(handler);
  });

  it('registers a primitive plugin', () => {
    const loader = createPluginLoader();
    const renderer = (props: Record<string, unknown>, children: RenderNode[]) => ({ type: 'custom-box', props, children });
    loader.registerPrimitive('custom-box', renderer);
    expect(loader.getPrimitives().has('custom-box')).toBe(true);
  });

  it('registers an action plugin', () => {
    const loader = createPluginLoader();
    const action: ActionDefinition = { name: 'customAction', handler: async (params) => params };
    loader.registerAction(action);
    expect(loader.getActions().has('customAction')).toBe(true);
  });

  it('registers a validator plugin', () => {
    const loader = createPluginLoader();
    const validator: ValidatorDefinition = { name: 'isEven', validate: (value) => (value as number) % 2 === 0, message: 'Must be even' };
    loader.registerValidator(validator);
    expect(loader.getValidators().has('isEven')).toBe(true);
  });

  it('registers a source provider plugin', () => {
    const loader = createPluginLoader();
    const provider: SourceProviderDefinition = { name: 'supabase', fetch: async () => ({ data: [] }) };
    loader.registerSourceProvider(provider);
    expect(loader.getSourceProviders().has('supabase')).toBe(true);
  });

  it('prevents duplicate action registrations', () => {
    const loader = createPluginLoader();
    loader.registerAction({ name: 'dup', handler: async () => {} });
    expect(() => loader.registerAction({ name: 'dup', handler: async () => {} })).toThrow('Action "dup" is already registered');
  });

  it('prevents duplicate primitive registrations', () => {
    const loader = createPluginLoader();
    const renderer = (props: Record<string, unknown>, children: RenderNode[]) => ({ type: 'dup', props, children });
    loader.registerPrimitive('dup', renderer);
    expect(() => loader.registerPrimitive('dup', renderer)).toThrow('Primitive "dup" is already registered');
  });

  it('overrides an existing primitive', () => {
    const loader = createPluginLoader();
    const original = (props: Record<string, unknown>, children: RenderNode[]) => ({ type: 'icon', props, children });
    const override = (props: Record<string, unknown>, children: RenderNode[]) => ({ type: 'icon', props: { ...props, custom: true }, children });
    loader.registerPrimitive('icon', original);
    loader.overridePrimitive('icon', override);
    const result = loader.getPrimitives().get('icon')!({}, []);
    expect(result.props).toHaveProperty('custom', true);
  });

  it('throws when overriding non-existent primitive', () => {
    const loader = createPluginLoader();
    const renderer = (props: Record<string, unknown>, children: RenderNode[]) => ({ type: 'x', props, children });
    expect(() => loader.overridePrimitive('nonexistent', renderer)).toThrow('Cannot override "nonexistent"');
  });

  it('counts total registered plugins', () => {
    const loader = createPluginLoader();
    loader.registerExpression({ key: '$x', resolve: () => null });
    loader.registerAction({ name: 'a', handler: async () => {} });
    loader.registerValidator({ name: 'v', validate: () => true });
    expect(loader.count()).toBe(3);
  });

  it('registers an element definition', () => {
    const loader = createPluginLoader();
    const def: ElementDefinition = {
      type: 'rating-stars',
      props: { max: { type: 'number', default: 5 } },
      render: { type: 'stack', props: {} },
    };
    loader.registerElement(def);
    expect(loader.getElements()).toContainEqual(def);
  });

  it('prevents duplicate element registrations', () => {
    const loader = createPluginLoader();
    const def: ElementDefinition = {
      type: 'rating-stars',
      props: {},
      render: { type: 'stack', props: {} },
    };
    loader.registerElement(def);
    expect(() => loader.registerElement(def)).toThrow('Element "rating-stars" is already registered');
  });

  it('counts elements alongside other plugin registrations', () => {
    const loader = createPluginLoader();
    loader.registerExpression({ key: '$x', resolve: () => null });
    loader.registerElement({ type: 'rating-stars', props: {}, render: { type: 'stack', props: {} } });
    expect(loader.count()).toBe(2);
  });
});
