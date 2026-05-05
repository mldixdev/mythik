// Forge Identity System — Barrel Re-export
// Types
export type {
  SurfaceType, RadiusPattern, BorderStyle, BorderColorSource,
  ElevationStyle, TypographyHierarchy, TextDecoration, LabelStyle, HeadingColor,
  ColorScheme, ColorWeight, MotionPersonality,
  AccentApplication, ColoredSurfaceLayers,
  IconIdentity, ImageIdentity, GradientConfig,
  IdentityConfig, ShadowDef, BorderDef, BlurDef,
  StructuredSurfaceStyleProps, StructuredSurfaceStyles,
  SchemeColors, ColorWeightColors, ColorWeightResult,
  TypographyHierarchyResolved,
} from './types.js';

// Surface
export { resolveSurfaceStyles } from './surface.js';

// Shape
export { resolveRadiusPattern, resolveBorderStyle } from './shape.js';

// Elevation
export { resolveElevationStyle, depthScale } from './elevation.js';

// Typography
export { resolveTypographyHierarchy, resolveTextDecoration, resolveTextDecorations, resolveLabelStyle } from './typography.js';

// Color
export { resolveSchemeColors, resolveColorWeight, hexToRgba, COLORED_SURFACE_DEFAULTS } from './color.js';

// Background — legacy resolveBackgroundCSS / resolveBlobStyles removed in
// plan 3 Task 21. Background rendering now flows through BackgroundStack
// (renderer package) consuming LayerBackground.

// Motion — legacy resolveMotionEntrance removed in plan 2 (Task 22).
// Element-level animations now live in the animation engine (Element.animations).

// Background System v2 (plan 2026-04-16-plan-background-system)
export type {
  LayerBackground, LayerConfig, LayerSpec, LayerCommon, LayerCommonProps,
  SolidLayerConfig, GradientLayerConfig, PatternLayerConfig, GrainLayerConfig, ImageLayerConfig,
  BlobsLayerConfig,
  GradientStop, GradientSVG, BlendMode,
} from './types.js';
export {
  resolveBackgroundLayers,
  resolveLayer,
  resolveSolid,
  resolveGradient,
  resolveImage,
  resolvePattern,
  resolveGrain,
  sanitizeSVGShapes,
  gridPatternSVG,
  dotsPatternSVG,
  diagonalPatternSVG,
  isoPatternSVG,
  crosshatchPatternSVG,
  chevronPatternSVG,
} from '../background/index.js';
export { BACKGROUND_RECIPES } from '../recipes/index.js';

// Blob v2 (plan 3 — blob-cascade)
export type {
  BlobShapeName, CuratedBlobName, BlobShapeDef,
  BlobPreset, BlobMotionPreset, BlobMotion,
  BlobInstance, BlobV2Config, BlobRenderStyle, BlobSpec,
} from '../background/blobs/index.js';
export { BLOB_CATALOG, resolveBlobLayer } from '../background/blobs/index.js';
