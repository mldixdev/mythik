import { createStateStore, type StateStore } from './state/store.js';
import { createResolver, type Resolver } from './expressions/resolver.js';
import { createPrimitiveRegistry } from './renderer/registry.js';
import { createRenderEngine, type RenderEngine } from './renderer/engine.js';
import { createPluginLoader, type PluginLoader } from './plugins/loader.js';
import { createElementRegistry, type ElementRegistry, type ElementDefinition } from './elements/composer.js';
import { validateSpec, type ValidationError } from './security/spec-validator.js';
import { createUrlGuard, type UrlGuard } from './security/url-whitelist.js';
import { createStateGuard, type StateGuard } from './security/state-protection.js';
import { createProtectionRegistry, type ProtectionRegistry } from './security/protection-registry.js';
import { createRateLimiter, type RateLimiter } from './security/rate-limiter.js';
import type { Spec } from './types.js';
import type { PresetDefinition } from './design/presets.js';
import { resolveDeepTokens, deepMergeTokens } from './design/deep-tokens.js';
import { resolveSchemeColors, resolveColorWeight } from './design/identity/index.js';
import type { ColorScheme, ColorWeight, SchemeColors, ColoredSurfaceLayers } from './design/identity/index.js';
import { COLORED_SURFACE_DEFAULTS } from './design/identity/index.js';

export interface SecurityConfig {
  /** Allowed domains for fetch actions. Empty = allow all. */
  allowedDomains?: string[];
  /** State paths that specs cannot write to. */
  protectedPaths?: string[];
  /** Max actions per second before rate limiting kicks in. Default: 100. */
  maxActionsPerSecond?: number;
  /** Validate spec structure before rendering. Default: true. */
  validateSpecs?: boolean;
  /** Expose detailed error info in UI. Default: true (dev). Set false for production. */
  exposeErrors?: boolean;
}

export interface MythikConfig {
  initialState?: Record<string, unknown>;
  computedFunctions?: Record<string, (args: Record<string, unknown>) => unknown>;
  tokens?: Record<string, unknown>;
  locale?: string;
  translations?: Record<string, Record<string, string>>;
  elements?: ElementDefinition[];
  security?: SecurityConfig;
}

export interface MythikInstance {
  store: StateStore;
  resolver: Resolver;
  engine: RenderEngine;
  plugins: PluginLoader;
  elements: ElementRegistry;
  security: {
    urlGuard: UrlGuard;
    stateGuard: StateGuard;
    rateLimiter: RateLimiter;
    validateSpec: (spec: Spec) => { valid: boolean; errors: ValidationError[] };
    exposeErrors: boolean;
  };
  /** Internal — used by mountSpecRuntime to contribute derive-protected paths via RAII. */
  protectionRegistry: ProtectionRegistry;
  applyPlugins: () => void;
  /** Hot-swap tokens at runtime. Resolves DNA + defaults + overrides, rebuilds resolver & engine, bumps state counter to trigger re-render. */
  updateTokens: (tokens: Record<string, unknown>) => void;
}

export function createMythik(config: MythikConfig = {}): MythikInstance {
  const store = createStateStore(config.initialState ?? {});
  // Seed `/tokens/raw` from initial config.tokens so consumers reading this
  // path (e.g. MythikRenderer's v2 LayerBackground root mount) see the
  // starting tokens before any updateTokens call. Later updateTokens calls
  // deep-merge on top of this seed.
  if (config.tokens) {
    store.set('/tokens/raw', config.tokens);
  }
  const plugins = createPluginLoader();
  const primitiveRegistry = createPrimitiveRegistry();
  const elements = createElementRegistry();

  // Security
  const secConfig = config.security ?? {};
  const urlGuard = createUrlGuard(secConfig.allowedDomains);
  const protectionRegistry = createProtectionRegistry({
    defaultPaths: ['/tx/*', '/ui/forms/*', '/auth/*'],
  });
  // User-provided protected paths are a permanent contribution (release token discarded).
  if (secConfig.protectedPaths && secConfig.protectedPaths.length > 0) {
    protectionRegistry.contribute(secConfig.protectedPaths);
  }
  const stateGuard = createStateGuard(() => protectionRegistry.allPaths());
  const rateLimiter = createRateLimiter({ maxActionsPerSecond: secConfig.maxActionsPerSecond ?? 100 });
  const shouldValidate = secConfig.validateSpecs !== false; // Default true
  const exposeErrors = secConfig.exposeErrors !== false; // Default true (dev mode)

  // Register initial element definitions
  if (config.elements) {
    for (const def of config.elements) {
      elements.register(def);
    }
  }

  let resolver: Resolver;
  let engine: RenderEngine;

  // Resolve deep tokens (DNA + defaults + overrides) at initialization
  let resolvedTokens = resolveDeepTokens(config.tokens);
  // Persist resolved tokens to the store so consumers (e.g. MythikRenderer's
  // v2 LayerBackground root mount) can read the fully-resolved tree
  // including DNA-derived colors. Updated on every updateTokens call below.
  store.set('/tokens/resolved', resolvedTokens);
  let currentRawTokens: Record<string, unknown> = config.tokens ?? {};

  /** Compute Phase 3 color values and inject into resolvedTokens for $token access */
  function injectColorTokens(tokens: Record<string, unknown>): void {
    const colors = tokens.colors as Record<string, string> | undefined;
    const identity = tokens.identity as Record<string, unknown> | undefined;
    if (!colors) return;

    const scheme = (identity?.colorScheme as ColorScheme) ?? 'light-surface';
    const weight = (identity?.colorWeight as ColorWeight) ?? 'monochrome';

    const fullColors: SchemeColors = {
      primary: colors.primary, primaryLight: colors.primaryLight, primaryDark: colors.primaryDark,
      accent: colors.accent, accentLight: colors.accentLight,
      surface: colors.surface, background: colors.background,
      text: colors.text, textMuted: colors.textMuted, border: colors.border,
      error: colors.error, success: colors.success, warning: colors.warning,
    };
    const darkColors = (tokens.modes as Record<string, Record<string, unknown>> | undefined)?.dark?.colors as SchemeColors | undefined;

    const layers: ColoredSurfaceLayers | undefined = scheme === 'colored-surface'
      ? {
          background: (identity?.coloredSurfaceLayers as ColoredSurfaceLayers)?.background ?? COLORED_SURFACE_DEFAULTS.background,
          surface: (identity?.coloredSurfaceLayers as ColoredSurfaceLayers)?.surface ?? COLORED_SURFACE_DEFAULTS.surface,
          primitive: (identity?.coloredSurfaceLayers as ColoredSurfaceLayers)?.primitive ?? COLORED_SURFACE_DEFAULTS.primitive,
        }
      : undefined;
    const schemeColors = resolveSchemeColors(scheme, fullColors, darkColors, layers);
    const cwColors = { primary: schemeColors.primary, accent: schemeColors.accent, surface: schemeColors.surface, background: schemeColors.background, text: schemeColors.text, border: schemeColors.border };
    const cwDark = darkColors ? { primary: darkColors.primary, accent: darkColors.accent, surface: darkColors.surface, background: darkColors.background, text: darkColors.text, border: darkColors.border } : undefined;
    const colorWeightResult = resolveColorWeight(weight, cwColors, cwDark);

    tokens.colorWeight = colorWeightResult;
    tokens.schemeColors = schemeColors;

    // Plan 3 Task 21 — `tokens.backgroundCSS` injection removed along with
    // the legacy resolveBackgroundCSS. Background rendering is consumer-owned
    // now: MythikRenderer mounts <BackgroundStack> from identity.background
    // (a LayerBackground). Nothing in the framework reads `tokens.backgroundCSS`
    // anymore (verified via grep at Task 21 migration time).
  }

  injectColorTokens(resolvedTokens);

  // Inject icon renderer if registered via plugins.setIconRenderer()
  function injectIconRenderer(tokens: Record<string, unknown>): void {
    const renderer = plugins.getIconRenderer();
    if (renderer) tokens._iconRenderer = renderer;
  }
  injectIconRenderer(resolvedTokens);

  function buildResolver(): Resolver {
    return createResolver({
      store,
      computedFunctions: config.computedFunctions,
      tokens: resolvedTokens,
      locale: config.locale,
      translations: config.translations,
      extraExpressionHandlers: plugins.getExpressionHandlers(),
    });
  }

  function buildEngine(): RenderEngine {
    return createRenderEngine({
      resolver,
      primitiveRegistry,
      tokens: resolvedTokens,
      elementRegistry: elements,
    });
  }

  resolver = buildResolver();
  engine = buildEngine();

  // Wrap engine.render with spec validation (warnings only — engine isolates errors per element)
  const originalEngine = engine;
  let lastValidatedSpec: unknown = null;
  const secureEngine: RenderEngine = {
    render(spec: Spec, changedPaths?: Set<string>) {
      if (shouldValidate && spec !== lastValidatedSpec) {
        lastValidatedSpec = spec;
        const result = validateSpec(spec, { primitiveRegistry, elementRegistry: elements });
        if (!result.valid) {
          console.warn(`Spec validation warnings: ${result.errors.map((e) => e.message).join('; ')}`);
        }
      }
      return originalEngine.render(spec, changedPaths);
    },
  };
  engine = secureEngine;

  function updateTokens(rawTokens: Record<string, unknown>): void {
    // _replace: true bypasses deep merge — used by reset to fully replace token state
    if (rawTokens._replace) {
      const { _replace, ...tokens } = rawTokens;
      currentRawTokens = tokens;
    } else {
      // Deep merge with previously-applied raw tokens — enables partial updates
      currentRawTokens = deepMergeTokens(currentRawTokens, rawTokens);
    }

    // Normalize DNA seeds: if numeric values > 1, assume 0-100 scale and convert to 0-1
    const normalized = { ...currentRawTokens };
    if (normalized.dna && typeof normalized.dna === 'object') {
      const dna = { ...(normalized.dna as Record<string, unknown>) };
      const numericSeeds = ['roundness', 'density', 'depth', 'formality'];
      for (const key of numericSeeds) {
        if (typeof dna[key] === 'number' && (dna[key] as number) > 1) {
          dna[key] = (dna[key] as number) / 100;
        }
      }
      normalized.dna = dna;
    }
    resolvedTokens = resolveDeepTokens(normalized);
    injectColorTokens(resolvedTokens);
    injectIconRenderer(resolvedTokens);
    resolver = buildResolver();
    const rawEngine = buildEngine();
    lastValidatedSpec = null;
    engine = {
      render(spec: Spec, changedPaths?: Set<string>) {
        if (shouldValidate && spec !== lastValidatedSpec) {
          lastValidatedSpec = spec;
          const result = validateSpec(spec, { primitiveRegistry, elementRegistry: elements });
          if (!result.valid) {
            console.warn(`Spec validation warnings: ${result.errors.map((e) => e.message).join("; ")}`);
          }
        }
        return rawEngine.render(spec, changedPaths);
      },
    };
    // Persist raw config for export/inspection
    store.set('/tokens/raw', currentRawTokens);
    // Persist resolved tree so consumers have DNA-derived colors + full
    // merged identity at a single read path.
    store.set('/tokens/resolved', resolvedTokens);
    // Bump state counter to trigger React re-render
    const currentVersion = (store.get('/internal/tokenVersion') as number) ?? 0;
    store.set('/internal/tokenVersion', currentVersion + 1);
  }

  // Register updateTokens as a framework action so specs can call it
  plugins.registerAction({
    name: 'updateTokens',
    handler: (params) => { updateTokens(params as Record<string, unknown>); },
  });

  function applyPlugins(): void {
    for (const [type, renderer] of plugins.getPrimitives()) {
      if (!primitiveRegistry.has(type)) {
        primitiveRegistry.register(type, renderer);
      }
    }

    // Layer 3 — register element definitions staged via plugins.registerElement.
    // Skip any already in the registry (e.g. from config.elements) to keep applyPlugins idempotent.
    for (const def of plugins.getElements()) {
      if (!elements.has(def.type)) {
        elements.register(def);
      }
    }

    injectIconRenderer(resolvedTokens);
    store.set('/tokens/resolved', resolvedTokens);
    resolver = buildResolver();
    const rawEngine = buildEngine();
    lastValidatedSpec = null;
    engine = {
      render(spec: Spec, changedPaths?: Set<string>) {
        if (shouldValidate && spec !== lastValidatedSpec) {
          lastValidatedSpec = spec;
          const result = validateSpec(spec, { primitiveRegistry, elementRegistry: elements });
          if (!result.valid) {
            console.warn(`Spec validation warnings: ${result.errors.map((e) => e.message).join("; ")}`);
          }
        }
        return rawEngine.render(spec, changedPaths);
      },
    };
  }

  // Wrap registerPresets to bind store + updateTokens (not exposed in PluginLoader interface)
  const originalRegisterPresets = plugins.registerPresets.bind(plugins);
  plugins.registerPresets = (newPresets: PresetDefinition[]): void => {
    originalRegisterPresets(newPresets);
    // Write dropdown options to state for $state consumption
    const options = [
      { value: 'custom', label: 'Custom' },
      ...plugins.getPresets().map(p => ({ value: p.id, label: p.name })),
    ];
    store.set('/presets/available', options);
    // Auto-register applyPreset action if not yet registered
    if (!plugins.getActions().has('applyPreset')) {
      plugins.registerAction({
        name: 'applyPreset',
        handler: (params) => {
          if (typeof params.preset !== 'string') throw new Error('applyPreset requires a "preset" string parameter');
          if (params.preset === 'custom') return; // "Custom" is not a real preset — no-op
          const preset = plugins.getPreset(params.preset);
          if (!preset) throw new Error(`Unknown preset: "${params.preset}"`);
          updateTokens({ _replace: true, dna: preset.tokens.dna, identity: preset.tokens.identity });
        },
      });
    }
  };

  return {
    store,
    get resolver() { return resolver; },
    get engine() { return engine; },
    plugins,
    elements,
    security: {
      urlGuard,
      stateGuard,
      rateLimiter,
      exposeErrors,
      validateSpec: (spec: Spec) => validateSpec(spec, { primitiveRegistry, elementRegistry: elements }),
    },
    protectionRegistry,
    applyPlugins,
    updateTokens,
  };
}
