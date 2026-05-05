import type {
  ExpressionHandlerDefinition,
  ActionDefinition,
  ValidatorDefinition,
  SourceProviderDefinition,
  RenderNode,
} from '../types.js';
import type { PresetDefinition } from '../design/presets.js';
import type { ElementDefinition } from '../elements/composer.js';

type PrimitiveRenderer = (
  props: Record<string, unknown>,
  children: RenderNode[],
) => RenderNode;

export interface PluginLoader {
  registerExpression: (handler: ExpressionHandlerDefinition) => void;
  registerPrimitive: (type: string, renderer: PrimitiveRenderer) => void;
  overridePrimitive: (type: string, renderer: PrimitiveRenderer) => void;
  registerAction: (action: ActionDefinition) => void;
  registerValidator: (validator: ValidatorDefinition) => void;
  registerSourceProvider: (provider: SourceProviderDefinition) => void;
  /** Register a custom element (Layer 3). Definitions are staged here; the factory calls elements.register for each at applyPlugins() time. */
  registerElement: (definition: ElementDefinition) => void;
  getElements: () => ElementDefinition[];
  /** Register a custom icon renderer component. icon.tsx uses it for inner render while keeping identity wrapper (container, weight default). */
  setIconRenderer: (component: unknown) => void;
  getIconRenderer: () => unknown | undefined;
  registerPresets: (presets: PresetDefinition[]) => void;
  getPresets: () => PresetDefinition[];
  getPreset: (id: string) => PresetDefinition | undefined;

  getExpressionHandlers: () => ExpressionHandlerDefinition[];
  getPrimitives: () => Map<string, PrimitiveRenderer>;
  getActions: () => Map<string, ActionDefinition>;
  getValidators: () => Map<string, ValidatorDefinition>;
  getSourceProviders: () => Map<string, SourceProviderDefinition>;

  count: () => number;
}

export function createPluginLoader(): PluginLoader {
  const expressionHandlers: ExpressionHandlerDefinition[] = [];
  const primitives = new Map<string, PrimitiveRenderer>();
  const actions = new Map<string, ActionDefinition>();
  const validators = new Map<string, ValidatorDefinition>();
  const sourceProviders = new Map<string, SourceProviderDefinition>();
  const presets = new Map<string, PresetDefinition>();
  const elements = new Map<string, ElementDefinition>();
  let iconRenderer: unknown | undefined;

  return {
    registerExpression(handler: ExpressionHandlerDefinition): void {
      expressionHandlers.push(handler);
    },

    registerPrimitive(type: string, renderer: PrimitiveRenderer): void {
      if (primitives.has(type)) {
        throw new Error(`Primitive "${type}" is already registered`);
      }
      primitives.set(type, renderer);
    },

    overridePrimitive(type: string, renderer: PrimitiveRenderer): void {
      if (!primitives.has(type)) {
        throw new Error(`Cannot override "${type}" — primitive not registered`);
      }
      primitives.set(type, renderer);
    },

    registerAction(action: ActionDefinition): void {
      if (actions.has(action.name)) {
        throw new Error(`Action "${action.name}" is already registered`);
      }
      actions.set(action.name, action);
    },

    registerValidator(validator: ValidatorDefinition): void {
      if (validators.has(validator.name)) {
        throw new Error(`Validator "${validator.name}" is already registered`);
      }
      validators.set(validator.name, validator);
    },

    registerSourceProvider(provider: SourceProviderDefinition): void {
      if (sourceProviders.has(provider.name)) {
        throw new Error(`Source provider "${provider.name}" is already registered`);
      }
      sourceProviders.set(provider.name, provider);
    },

    registerElement(definition: ElementDefinition): void {
      if (elements.has(definition.type)) {
        throw new Error(`Element "${definition.type}" is already registered`);
      }
      elements.set(definition.type, definition);
    },

    getElements: () => Array.from(elements.values()),

    setIconRenderer(component: unknown): void {
      iconRenderer = component;
    },

    getIconRenderer(): unknown | undefined {
      return iconRenderer;
    },

    registerPresets(newPresets: PresetDefinition[]): void {
      for (const preset of newPresets) {
        if (presets.has(preset.id)) {
          throw new Error(`Preset "${preset.id}" is already registered`);
        }
        presets.set(preset.id, preset);
      }
    },

    getPresets(): PresetDefinition[] {
      return Array.from(presets.values());
    },

    getPreset(id: string): PresetDefinition | undefined {
      return presets.get(id);
    },

    getExpressionHandlers: () => [...expressionHandlers],
    getPrimitives: () => new Map(primitives),
    getActions: () => new Map(actions),
    getValidators: () => new Map(validators),
    getSourceProviders: () => new Map(sourceProviders),

    count(): number {
      return (
        expressionHandlers.length +
        primitives.size +
        actions.size +
        validators.size +
        sourceProviders.size +
        presets.size +
        elements.size
      );
    },
  };
}
