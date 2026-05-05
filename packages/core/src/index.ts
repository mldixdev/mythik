// mythik — public API
export * from './types.js';
export { createStateStore } from './state/store.js';
export type { StateStore } from './state/store.js';
export { RESERVED_PATHS } from './state/reserved-paths.js';
export type { ReservedPath } from './state/reserved-paths.js';
export { createExpressionRegistry } from './expressions/registry.js';
export type { ExpressionRegistry } from './expressions/registry.js';
export { createResolver } from './expressions/resolver.js';
export type { Resolver, ResolverConfig } from './expressions/resolver.js';
export { createPrimitiveRegistry } from './renderer/registry.js';
export type { PrimitiveRegistry } from './renderer/registry.js';
export { createRenderEngine } from './renderer/engine.js';
export type { RenderEngine, RenderEngineConfig } from './renderer/engine.js';
export { createPluginLoader } from './plugins/loader.js';
export type { PluginLoader } from './plugins/loader.js';
export { createMythik } from './factory.js';
export type { MythikConfig, MythikInstance } from './factory.js';
export { resolveTokens } from './design/tokens.js';
export type { DesignTokens, DnaSeed, ElevationValue, TypographyScale } from './design/tokens.js';
export { resolveDeepTokens, deepMergeTokens, DEFAULTS } from './design/deep-tokens.js';
export type { DesignTokenResolved } from './design/deep-tokens.js';
export { deriveDna } from './design/dna.js';
export type { PresetDefinition, PresetOption } from './design/presets.js';
export type { IdentityConfig, SurfaceType, StructuredSurfaceStyles, StructuredSurfaceStyleProps, ShadowDef, BorderDef, BlurDef, RadiusPattern, BorderStyle, BorderColorSource, ElevationStyle, TypographyHierarchy, TextDecoration, LabelStyle, HeadingColor, TypographyHierarchyResolved, ColorScheme, ColorWeight, AccentApplication, SchemeColors, ColorWeightColors, ColorWeightResult, ColoredSurfaceLayers, IconIdentity, ImageIdentity, GradientConfig, MotionPersonality } from './design/identity/index.js';
export { resolveSurfaceStyles, resolveRadiusPattern, resolveBorderStyle, resolveElevationStyle, resolveTypographyHierarchy, resolveTextDecoration, resolveTextDecorations, resolveLabelStyle, hexToRgba, resolveSchemeColors, resolveColorWeight, depthScale, COLORED_SURFACE_DEFAULTS } from './design/identity/index.js';
// Background System v2 (plan 2026-04-16)
export type { LayerBackground, LayerConfig, LayerSpec, LayerCommon, LayerCommonProps, SolidLayerConfig, GradientLayerConfig, PatternLayerConfig, GrainLayerConfig, ImageLayerConfig, BlobsLayerConfig, GradientStop, GradientSVG, BlendMode } from './design/identity/index.js';
export { resolveBackgroundLayers, resolveLayer, resolveSolid, resolveGradient, resolveImage, resolvePattern, resolveGrain, sanitizeSVGShapes, gridPatternSVG, dotsPatternSVG, diagonalPatternSVG, isoPatternSVG, crosshatchPatternSVG, chevronPatternSVG, BACKGROUND_RECIPES } from './design/identity/index.js';
// Blob v2 (plan 3 — blob-cascade)
export type {
  BlobShapeName, CuratedBlobName, BlobShapeDef,
  BlobPreset, BlobMotionPreset, BlobMotion,
  BlobInstance, BlobV2Config, BlobRenderStyle, BlobSpec,
} from './design/identity/index.js';
export { BLOB_CATALOG, resolveBlobLayer } from './design/identity/index.js';
export { resolveIdentity } from './design/identity-resolver.js';
export type { ResolveIdentityInput, ResolvedIdentity, SurfaceSerializer } from './design/identity-resolver.js';
export { surfaceToCSS, applyBorderElevationCSS, applyGradientCardsCSS } from './design/surface-to-css.js';
export type { CSSSurfaceStyles, CSSStyleProps, BorderElevationConfig, GradientCardsConfig, GradientCardsMode } from './design/surface-to-css.js';
export { surfaceToRN, applyBorderElevationRN } from './design/surface-to-rn.js';
export type { RNSurfaceStyleProps, RNSurfaceStyles } from './design/surface-to-rn.js';
export { hexToOklch, oklchToHex } from './design/oklch.js';
export { generateTonalPalette, generateTonalStep, generateSemanticColors, generateNeutralPalette } from './design/palette.js';
export { validate, registerValidator, getValidator } from './validation/validators.js';
export type { ValidatorCheck, ValidationResult } from './validation/validators.js';
export { evaluateVisibility } from './visibility/evaluator.js';
export { createWatcherEngine } from './watchers/engine.js';
export type { WatcherConfig, WatcherEngine } from './watchers/engine.js';
export { createActionDispatcher } from './actions/dispatcher.js';
export type { ActionDispatcherConfig, ActionDispatcherInstance } from './actions/dispatcher.js';
export { createTransactionEngine } from './actions/transaction-engine.js';
export type { TransactionEngine, TransactionEngineConfig } from './actions/transaction-engine.js';
export { resolveMotionConfig, calculateTimeline } from './motion/engine.js';
export type { MotionConfig, ResolvedMotionStep, ResolvedMotionSequence } from './motion/engine.js';
export { createRouter } from './navigation/router.js';
export type { NavigationConfig, AuthConfig, ScreenConfig, RouterInstance } from './navigation/router.js';
export { createFetchEngine } from './data/fetch.js';
export type { FetchConfig, FetchEngine } from './data/fetch.js';
export { createDataSourcesEngine } from './data/data-sources.js';
export type { DataSourcesEngine, DataSourcesEngineConfig } from './data/data-sources.js';
export { createOfflineEngine } from './data/offline.js';
export type { OfflineConfig, OfflineEngine, QueuedMutation } from './data/offline.js';
export { createRealtimeEngine } from './data/realtime.js';
export type { RealtimeConfig, RealtimeEngine, RealtimeChannelConfig } from './data/realtime.js';
export { createI18nEngine } from './i18n/engine.js';
export type { I18nConfig, I18nEngine } from './i18n/engine.js';
export { evaluatePermission } from './permissions/evaluator.js';
export type { PermissionResult } from './permissions/evaluator.js';
export { createHistoryEngine } from './interactions/history.js';
export type { HistoryConfig, HistoryEngine } from './interactions/history.js';
export { createEditorSessionEngine } from './editor-session/engine.js';
export type {
  EditorCommitInput,
  EditorSaveInput,
  EditorHistoryEntry,
  EditorResolvedChange,
  EditorSessionSaveError,
  EditorSessionSaveStatus,
  EditorSessionEngine,
  EditorSessionMetadata,
  EditorSessionStatus,
  EditorSessionValidationIssue,
  EditorSessionValidationResult,
} from './editor-session/types.js';
export { applyDataOperations } from './interactions/data-operations.js';
export type { DataOperationsConfig, ActiveFilters, DataOperationsResult } from './interactions/data-operations.js';
export { createDragDropEngine } from './interactions/drag-drop.js';
export type { DragDropConfig, DragDropEngine } from './interactions/drag-drop.js';
export { toCSV, toJSON } from './interactions/export.js';
export type { ExportConfig, ExportColumn } from './interactions/export.js';
export { createElementRegistry, resolveElementProps, expandElementToSpec } from './elements/composer.js';
export type { ElementDefinition, ElementVariantSpec, PropDefinition, ElementRenderNode, ElementRegistry } from './elements/composer.js';
export { generateReferenceDoc } from './reference/generator.js';
export type { ReferenceDocConfig } from './reference/generator.js';
export { applyPatch, applyPatches } from './streaming/patch.js';
export type { JsonPatch } from './streaming/patch.js';
export { createSpecStreamCompiler, compileSpecStream } from './streaming/compiler.js';
export type { SpecStreamCompiler } from './streaming/compiler.js';
export { validateSpec, createUrlGuard, createStateGuard, createSpecSigner, createRateLimiter, isValidIdentifier, assertValidIdentifier, validateApiSpec } from './security/index.js';
export type { SpecValidationResult, ValidationContext, ValidationError, SuggestedFix, UrlGuard, StateGuard, SpecSignerConfig, SpecSigner, RateLimiterConfig, RateLimiter, ApiSpecValidationResult } from './security/index.js';
export { PRIMITIVE_PROP_SCHEMAS, COMMON_PROPS, TABLE_COLUMN_PROPS } from './renderer/prop-schemas.js';
export type { PrimitiveSchema } from './renderer/prop-schemas.js';

// Spec Engine — manifest, element detail, patch orchestration
export { generateManifest } from './spec-engine/manifest.js';
export { getElements } from './spec-engine/elements.js';
export { createSpecEngine } from './spec-engine/engine.js';
export type { SpecStore, SpecEngine, SpecEngineConfig, PatchResult, ElementsResult, DocumentHandler, PatchedPathsResult } from './spec-engine/types.js';

// Spec Engine — document handlers
export { getDocumentHandler, screenHandler, appHandler, registerDocumentHandler } from './spec-engine/handlers/index.js';
export { generateAppManifest } from './spec-engine/app-manifest.js';
export { getAppElements, resolveDotPath } from './spec-engine/app-elements.js';
export { validateAppSpec } from './security/app-spec-validator.js';

// Spec Stores — persistence adapters (browser-safe subset).
// Node-only stores (FileSpecStore, SqlServerSpecStore, *Versioned, *Environment)
// live in 'mythik/server'.
export { MemorySpecStore } from './spec-stores/memory.js';
export { SupabaseSpecStore } from './spec-stores/supabase.js';
export type { SupabaseSpecStoreConfig } from './spec-stores/supabase.js';

// Derive — auto-computed state
export { createDeriveEngine } from './derive/evaluator.js';
export type { DeriveEngine, DeriveEngineConfig } from './derive/evaluator.js';

/** @internal Used by mythik-react and mythik-react-native renderers — NOT consumer API. */
export { mountSpecRuntime } from './runtime/mount-spec-runtime.js';
/** @internal */
export type { SpecRuntime, MountSpecRuntimeDeps } from './runtime/mount-spec-runtime.js';

// Device — platform-agnostic device context contract
export type { DeviceContext } from './device/context.js';

// Forms — declarative form-level validation
export { createFormEngine } from './forms/engine.js';
export type { FormConfig, FormFieldConfig, FormEngine, FormEngineConfig } from './forms/types.js';

// App — multi-screen app composition
export { createAppEngine } from './app/app-engine.js';
export type {
  AppAuthConfig,
  AppEditorSessionGuardConfig,
  AppEngine,
  AppEngineConfig,
  AppNavigationConfig,
  AppSpec,
  NavigationGuardDirtySession,
  NavigationGuardPending,
  ScreenDefinition,
} from './app/app-engine.js';

// Auth — authentication engine with provider adapters
export { createAuthEngine } from './auth/engine.js';
export type { AuthProvider, AuthResult, AuthUser, AuthEvent, AuthEngineConfig, AuthEngine, MockAuthProviderConfig } from './auth/types.js';
export { createMockAuthProvider } from './auth/providers/mock.js';
export { createSupabaseAuthProvider } from './auth/providers/supabase.js';
export type { SupabaseAuthClient, SupabaseAuthProviderConfig } from './auth/providers/supabase.js';
export { createCustomJWTProvider } from './auth/providers/custom-jwt.js';
export type { CustomJWTProviderConfig } from './auth/providers/custom-jwt.js';
export { createAuthPersistence } from './auth/persistence.js';
export type { AuthPersistence, PersistedAuthData } from './auth/persistence.js';
export { createCrossTabSync } from './auth/cross-tab.js';
export type { CrossTabSync } from './auth/cross-tab.js';
export { createRefreshEngine } from './auth/refresh-engine.js';
export type { RefreshEngine, RefreshEngineConfig } from './auth/refresh-engine.js';
export { createLoginRateLimiter } from './auth/rate-limiter.js';
export type { LoginRateLimiter, LoginRateLimiterConfig } from './auth/rate-limiter.js';

// Fetch — framework fetch with interceptors
export { createFrameworkFetch } from './fetch/framework-fetch.js';
export type { FetchInterceptor, FrameworkFetchConfig, FrameworkFetch } from './fetch/types.js';
export { createAuthInterceptor } from './fetch/interceptors/auth.js';
export type { AuthInterceptorConfig } from './fetch/interceptors/auth.js';
export { createLoggingInterceptor } from './fetch/interceptors/logging.js';
export { createTimeoutInterceptor } from './fetch/interceptors/timeout.js';
export { createRetryInterceptor } from './fetch/interceptors/retry.js';
export type { RetryInterceptorConfig } from './fetch/interceptors/retry.js';

// Middleware — dispatcher action middleware
export { createMiddlewareChain } from './actions/middleware.js';
export type { ActionMiddleware, MiddlewareContext, MiddlewareChain } from './actions/middleware.js';

// Storage — file upload adapters
export type { StorageAdapter, StorageAdapterConfig, UploadFileState } from './storage/types.js';
export { createSupabaseStorageAdapter } from './storage/supabase.js';
export type { SupabaseStorageAdapterConfig } from './storage/supabase.js';
export { createUrlStorageAdapter } from './storage/url.js';
export type { UrlStorageAdapterConfig } from './storage/url.js';

// Variants — component variant resolution
export { resolveVariant, resolveTokenRefs } from './renderer/variants.js';
export type { ResolvedVariant } from './renderer/variants.js';

// Export — data export with adapter pattern
export type { ExportAdapter, ExportData, ExportColumn as ExportColumnDef } from './export/types.js';
export { formatExportValue } from './export/format.js';
export { generateCSV } from './export/csv.js';
export { downloadBlob } from './export/download.js';

// Contract — cross-validate frontend specs against backend api-specs
export { runContract } from './contract/index.js';
export type { RunContractInput, ContractResult, ContractFinding } from './contract/index.js';

// Versioning — spec version history, environments, promote, rollback
export { computePatches } from './versioning/index.js';
export { computeStructuralDiff } from './versioning/index.js';
export { runPromoteGate } from './versioning/index.js';
export { computeRollbackImpact, executeRollback } from './versioning/index.js';
export { MemoryVersionedSpecStore, MemoryEnvironmentStore } from './versioning/index.js';
export type {
  VersionMeta, VersionEntry, VersionRecord,
  EnvironmentPointer,
  StructuralChange, StructuralDiff, StructuralChangeKind,
  PromoteResult,
  RollbackImpact, RollbackResult,
  VersionedSpecStore, EnvironmentStore,
} from './versioning/index.js';
export type { PromoteGateInput } from './versioning/index.js';
export type { RollbackImpactInput, ExecuteRollbackInput } from './versioning/index.js';
export type { MemoryVersionedSpecStoreConfig } from './versioning/index.js';
export { SupabaseVersionedSpecStore, SupabaseEnvironmentStore } from './versioning/index.js';
export type { SupabaseVersionedSpecStoreConfig, SupabaseEnvironmentStoreConfig } from './versioning/index.js';

// Utils
export { levenshtein, suggest } from './utils/levenshtein.js';

// Animation engine v1 (plan 2 — Deep Backgrounds & Motion)
export type {
  TransformValue,
  FilterValue,
  KeyframeSnapshot,
  StaggerConfig,
  InlineAnimation,
  AnimationRef,
  StateChangeAnimation,
  ElementAnimations,
  AnimationTrigger,
  AnimationSpec,
  AnimationContext,
  NormalizedKeyframe,
  NormalizedTransformRN,
  BuiltCSSKeyframes,
  ReanimatedSpec,
  AnimationValidationResult,
  BackgroundValidationInput,
} from './design/animation/index.js';
export {
  resolveAnimation,
  normalizeKeyframeSnapshot,
  parseAtToFraction,
  buildKeyframes,
  buildCSSKeyframes,
  buildReanimatedSpec,
  applyReducedMotion,
  validateAnimationCaps,
  validateBackgroundCaps,
  HARD_PER_TRIGGER,
  mergeElementAnimations,
} from './design/animation/index.js';
export { ANIMATION_RECIPES, WEB_ONLY_RECIPES } from './design/recipes/animations.js';
export { toArray } from './util/to-array.js';
