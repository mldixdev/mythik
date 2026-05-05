// Forge Identity System — Type Definitions

export const SURFACE_TYPES = ['elevated', 'flat', 'outlined', 'glass', 'bold', 'neo'] as const;
export const RADIUS_PATTERNS = ['all', 'top', 'bottom', 'left', 'right', 'diagonal', 'inverse-diagonal', 'single', 'single-tr', 'single-bl', 'single-br'] as const;
export const BORDER_STYLES = ['solid', 'dashed', 'dotted', 'double', 'none'] as const;
export const BORDER_COLOR_SOURCES = ['neutral', 'primary', 'accent', 'text'] as const;
export const ELEVATION_STYLES = ['diffuse', 'solid', 'color', 'none'] as const;
export const ELEVATION_COLORS = ['dark', 'primary', 'accent'] as const;
export const TYPOGRAPHY_HIERARCHIES = ['dramatic', 'uniform', 'editorial', 'display', 'mono', 'contrast'] as const;
export const TEXT_DECORATIONS = ['none', 'stroke', 'underline-accent', 'highlight', 'overline', 'shadow'] as const;
export const LABEL_STYLES = ['normal', 'uppercase', 'accent-colored'] as const;
export const HEADING_COLORS = ['default', 'primary', 'accent', 'primary-dark'] as const;
export const COLOR_SCHEMES = ['light-surface', 'dark-surface', 'colored-surface'] as const;
export const COLOR_WEIGHTS = ['monochrome', 'branded-nav', 'gradient-hero', 'ambient', 'dark-native'] as const;
export const CARD_LINE_POSITIONS = ['top', 'left', 'bottom', 'right'] as const;
export const GRADIENT_MODES = ['vibrant', 'soft', 'muted'] as const;
export const ICON_WEIGHTS = ['thin', 'light', 'regular', 'bold', 'fill', 'duotone'] as const;
export const ICON_CONTAINERS = ['none', 'circle', 'square', 'rounded-square'] as const;
export const ICON_CONTAINER_COLORS = ['primary', 'accent', 'muted', 'surface'] as const;
export const IMAGE_CORNERS = ['match-card', 'circle', 'square', 'rounded'] as const;
export const IMAGE_OVERLAYS = ['none', 'gradient-bottom', 'color-tint'] as const;

export type SurfaceType = typeof SURFACE_TYPES[number];
export type RadiusPattern = typeof RADIUS_PATTERNS[number];
export type BorderStyle = typeof BORDER_STYLES[number];
export type BorderColorSource = typeof BORDER_COLOR_SOURCES[number];
export type ElevationStyle = typeof ELEVATION_STYLES[number];
export type ElevationColor = typeof ELEVATION_COLORS[number];
export type TypographyHierarchy = typeof TYPOGRAPHY_HIERARCHIES[number];
export type TextDecoration = typeof TEXT_DECORATIONS[number];
export type LabelStyle = typeof LABEL_STYLES[number];
export type HeadingColor = typeof HEADING_COLORS[number];
export type ColorScheme = typeof COLOR_SCHEMES[number];
export type ColorWeight = typeof COLOR_WEIGHTS[number];
// MotionEntrance + MotionHover removed in plan 2 (Task 22). Element-level
// animations now live in Element.animations (ElementAnimations) consumed by
// the animation engine. Plan 3 adds identity-level cascade for that field.
export type MotionPersonality = 'gentle' | 'fluid' | 'snappy' | 'energetic' | 'none';

export interface AccentApplication {
  buttons?: boolean;
  navItems?: boolean;
  cardLine?: (typeof CARD_LINE_POSITIONS[number])[];
  links?: boolean;
  backgrounds?: boolean;
  iconContainers?: boolean;
}

export interface ColoredSurfaceLayers {
  background: number;  // tonal step 0-100
  surface: number;     // tonal step 0-100
  primitive: number;   // tonal step 0-100
}

export interface IconIdentity {
  weight?: typeof ICON_WEIGHTS[number];
  container?: typeof ICON_CONTAINERS[number];
  containerColor?: typeof ICON_CONTAINER_COLORS[number];
}

export interface ImageIdentity {
  corners?: typeof IMAGE_CORNERS[number];
  overlay?: typeof IMAGE_OVERLAYS[number];
  border?: boolean;
}

export interface GradientConfig {
  buttons?: boolean | typeof GRADIENT_MODES[number];
  cards?: boolean | typeof GRADIENT_MODES[number];
  headers?: boolean;
  text?: boolean | typeof GRADIENT_MODES[number];
}

export interface ShadowDef {
  magnitude: number;
  blur: number;
  opacity: number;
  color: { r: number; g: number; b: number };
  inset: boolean;
  spread?: number;
}

export interface BorderDef {
  width: number;
  style: 'solid' | 'dashed' | 'dotted' | 'double' | 'none';
  color: string;
}

export interface BlurDef {
  radius: number;
}

export interface StructuredSurfaceStyleProps {
  backgroundColor?: string;
  color?: string;
  border?: BorderDef;
  borderTop?: BorderDef;
  borderRight?: BorderDef;
  borderBottom?: BorderDef;
  borderLeft?: BorderDef;
  shadows: ShadowDef[];
  blur?: BlurDef;
  backgroundOpacity?: number;
}

export interface StructuredSurfaceStyles {
  card: StructuredSurfaceStyleProps;
  input: StructuredSurfaceStyleProps;
  inputFocus: StructuredSurfaceStyleProps;
  buttonPrimary: StructuredSurfaceStyleProps;
  buttonSecondary: StructuredSurfaceStyleProps;
  modal: StructuredSurfaceStyleProps;
}

export interface SchemeColors {
  primary: string; primaryLight: string; primaryDark: string;
  accent: string; accentLight: string;
  surface: string; background: string;
  text: string; textMuted: string; border: string;
  error: string; success: string; warning: string;
}

export interface ColorWeightColors {
  primary: string; accent: string;
  surface: string; background: string;
  text: string; border: string;
}

export interface ColorWeightResult {
  navBg: string;
  navText: string;
  sectionBg: string;
  heroBg: string;
  heroGradient: string;
}

export interface TypographyHierarchyResolved {
  headingScale: number;
  headingWeight: number;
  headingLetterSpacing?: string;
  headingFontFamily?: 'mono';
}

export interface IdentityConfig {
  surface?: SurfaceType;
  radiusPattern?: RadiusPattern;
  borderWidth?: 0 | 1 | 2 | 3;
  borderStyle?: BorderStyle;
  borderColor?: BorderColorSource;
  elevationStyle?: ElevationStyle;
  elevationColor?: ElevationColor;
  /** When true, identity border/elevation values override surface-produced borders+shadows on card/modal. Default: false (surface controls everything). */
  overrideSurfaceBorders?: boolean;
  /** When true, identity border/elevation values override input/buttonPrimary/buttonSecondary. Independent from overrideSurfaceBorders. Default: false. */
  overrideInputButtons?: boolean;
  typographyHierarchy?: TypographyHierarchy;
  textDecoration?: TextDecoration | TextDecoration[];
  labelStyle?: LabelStyle;
  /** Color applied to headings. 'default' = inherit from container. Gradient text overrides this when active. */
  headingColor?: HeadingColor;
  depth?: number;         // 0-1, controls shadow intensity/offset/blur
  shadowAngle?: number;   // 0-360 degrees, controls shadow cast direction
  colorScheme?: ColorScheme;
  colorWeight?: ColorWeight;
  accentApplication?: AccentApplication;
  coloredSurfaceLayers?: ColoredSurfaceLayers;
  background?: LayerBackground;
  gradients?: GradientConfig;
  icons?: IconIdentity;
  images?: ImageIdentity;
  /**
   * App-wide animation defaults (plan 3 Task 15 landed consumer-facing
   * cascade; formalized on IdentityConfig here at Task 23 to unblock typed
   * preset migrations). Merged per-trigger with
   * variant / template / element levels in `mergeElementAnimations`. Whole-
   * field `null` is cascade-neutral (coerced to `undefined` by the renderer);
   * per-trigger `null` disables that trigger and blocks inheritance.
   */
  animations?: import('../animation/types.js').ElementAnimations | null;
}

// ===== BACKGROUND SYSTEM v2 TYPES =====
// Plan 2026-04-16-plan-background-system introduced the layered shape; Plan 3
// (Task 21) deleted the legacy BackgroundConfig/BlobStyle so LayerBackground
// is now the ONLY background surface. Per-element blob rendering in Box was
// removed at the same time; app-level background lives exclusively at
// identity.background, mounted by MythikRenderer as <BackgroundStack>.

export type LayerBackground = {
  color?: string;
  layers?: LayerConfig[];
};

export type BlendMode =
  | 'normal' | 'multiply' | 'screen' | 'overlay'
  | 'soft-light' | 'hard-light' | 'color-dodge' | 'color-burn';

export type LayerCommonProps = {
  opacity?: number;
  blendMode?: BlendMode;
  zIndex?: number;
};

export type GradientStop = {
  color: string;
  opacity?: number;
  at: string;
};

export type SolidLayerConfig = LayerCommonProps & {
  type: 'solid';
  color: string;
};

export type GradientLayerConfig = LayerCommonProps & {
  type: 'gradient';
  kind: 'linear' | 'radial' | 'conic';
  angle?: number;
  shape?: 'circle' | 'ellipse';
  size?: string;
  position?: string;
  stops: GradientStop[];
};

export type PatternLayerConfig = LayerCommonProps & {
  type: 'pattern';
  kind: 'grid' | 'dots' | 'diagonal' | 'iso' | 'crosshatch' | 'chevron' | 'custom-svg';
  spacing?: number;
  thickness?: number;
  color?: string;
  angle?: number;
  dotRadius?: number;
  shapes?: string;
  tileSize?: number;
};

export type GrainLayerConfig = LayerCommonProps & {
  type: 'grain';
  intensity?: number;
  scale?: number;
  monochrome?: boolean;
};

export type ImageLayerConfig = LayerCommonProps & {
  type: 'image';
  url: string;
  size?: string;
  position?: string;
  repeat?: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';
};

// Blob layer — plan 3 Task 16.
//
// Wraps the BlobV2Config surface as a layer type inside LayerBackground.layers[].
//
// Opacity naming: LayerCommonProps.opacity is the LAYER-CONTAINER opacity,
// applied to the outer compositing element — it controls how the whole stack
// blends with siblings. BlobV2Config.opacity is the PER-BLOB FILL default,
// applied to each SVG <path>/<circle> fill. These compose multiplicatively
// when both are set on the same layer (container 0.4 × blob fill 0.4 = 0.16
// perceived) so keeping both exposed under the same name would collapse the
// two axes and produce counter-intuitive results.
//
// Resolution: we rename the per-blob fill default to `blobOpacity` at the
// layer level. BlobLayer (Task 18) maps it back to BlobV2Config.opacity when
// calling resolveBlobLayer. The layer-container `opacity` stays on
// LayerCommonProps and is applied by the compositing wrapper.
export type BlobsLayerConfig = LayerCommonProps & {
  type: 'blobs';
} & Omit<import('../background/blobs/types.js').BlobV2Config, 'opacity'> & {
  /**
   * Default per-blob fill opacity for preset-form blobs (0..1). Distinct from
   * LayerCommonProps.opacity which controls the whole layer's compositing
   * alpha. Ignored by explicit-form blobs (each BlobInstance carries its own
   * opacity).
   *
   * Maps to BlobV2Config.opacity at the render boundary (BlobLayer, Task 18).
   */
  blobOpacity?: number;
};

export type LayerConfig =
  | SolidLayerConfig
  | GradientLayerConfig
  | PatternLayerConfig
  | GrainLayerConfig
  | ImageLayerConfig
  | BlobsLayerConfig;

// Resolved spec types — what renderers consume

export type LayerCommon = {
  opacity: number;
  blendMode: BlendMode;
  zIndex: number;
};

export type GradientSVG = {
  def: string;
  fill: string;
};

export type LayerSpec =
  | { kind: 'solid'; color: string; common: LayerCommon }
  | { kind: 'gradient'; css: string; svg: GradientSVG; common: LayerCommon }
  | { kind: 'pattern'; svg: string; tileSize: number; common: LayerCommon }
  | { kind: 'grain'; svg: string; common: LayerCommon }
  | { kind: 'image'; url: string; size: string; position: string; repeat: string; common: LayerCommon }
  // Plan 3 Task 16. Unlike the other LayerSpec variants (which hold fully
  // resolved, renderer-ready primitive strings), the blobs variant carries the
  // UNRESOLVED BlobsLayerConfig. Palette/catalog/motion resolution is deferred
  // to the render boundary (BlobLayer, Task 18) which has the design tokens in
  // scope and can call `resolveBlobLayer(spec.config, palette)` there.
  // Consumers outside the BlobLayer render path (e.g. third-party visualizers)
  // must call resolveBlobLayer themselves — the spec IS NOT ready to paint.
  | { kind: 'blobs'; config: BlobsLayerConfig; common: LayerCommon };
