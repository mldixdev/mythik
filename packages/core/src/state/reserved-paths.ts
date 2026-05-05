/**
 * Framework-reserved state paths. The framework writes to these paths on
 * specific lifecycle events; consumers may read them but should not write
 * (a future linter rule may warn on consumer writes to reserved paths).
 *
 * Source of truth for all magic state paths used across:
 * - ActionDispatcher (packages/core/src/actions/dispatcher.ts) — writes /ui/clipboard,
 *   /ui/loading
 * - MythikRenderer (packages/react/src/MythikRenderer.tsx) — writes /ui/selectedRow,
 *   /ui/renderErrors; reads /tokens/resolved; bridges /ui/clipboard to
 *   navigator.clipboard via subscribe-triggered writeText
 * - createMythik factory (packages/core/src/factory.ts) — writes /tokens/resolved
 * - Documentation (docs/consumer/ai-context-runtime-semantics.md § 2.1, § 9)
 *   should reference these constants instead of inlining string literals.
 */
export const RESERVED_PATHS = {
  /** Row data written before dispatching row interactions (column actions + onRowClick). */
  SELECTED_ROW: '/ui/selectedRow',
  /** Spatial item context written before dispatching spatial-map item actions. */
  SELECTED_SPATIAL_ITEM: '/ui/selectedSpatialItem',
  /** Spatial zone context written before dispatching spatial-map zone actions. */
  SELECTED_SPATIAL_ZONE: '/ui/selectedSpatialZone',
  /** Spatial item edit-change context written before dispatching spatial-map edit actions. */
  SPATIAL_ITEM_CHANGE: '/ui/spatialItemChange',
  /** Spatial zone edit-change context written before dispatching spatial-map zone edit actions. */
  SPATIAL_ZONE_CHANGE: '/ui/spatialZoneChange',
  /** Spatial canvas press context written before dispatching spatial-map canvas actions. */
  SPATIAL_CANVAS_PRESS: '/ui/spatialCanvasPress',
  /** Editor session metadata written by the editor-session runtime. */
  EDITOR_SESSIONS: '/ui/editorSessions',
  /** Boolean loading flag set by initialActions / dataSources fetches. */
  LOADING: '/ui/loading',
  /** Render error collection from MythikRenderer in dev mode. */
  RENDER_ERRORS: '/ui/renderErrors',
  /** Clipboard write bridge — value triggers navigator.clipboard.writeText. */
  CLIPBOARD: '/ui/clipboard',
  /** Resolved token tree persisted by createMythik factory + updateTokens calls. */
  RESOLVED_TOKENS: '/tokens/resolved',
} as const;

export type ReservedPath = typeof RESERVED_PATHS[keyof typeof RESERVED_PATHS];
