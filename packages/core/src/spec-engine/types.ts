import type { Spec, Element } from '../types.js';
import type { JsonPatch } from '../streaming/patch.js';
import type { PrimitiveRegistry } from '../renderer/registry.js';
import type { ValidationError, ValidationContext, SpecValidationResult } from '../security/spec-validator.js';

// --- SpecStore ---

export interface SpecStore {
  load(id: string): Promise<unknown>;

  /**
   * Persist a document at the given id.
   *
   * @internal
   * Persistence primitive — called by the CLI / SpecEngine tier after validation.
   * Do NOT call from application code; use one of the three approved paths:
   * - Shell: `mythik push <id> --from-file spec.json`
   * - Bulk: `mythik push --from-dir ./specs/`
   * - Programmatic: `import { runPush } from 'mythik-cli/api'`
   *
   * Bypassing the CLI / engine tier skips validation and is a known anti-pattern
   * (audit findings F6, v36 items #5 and #8).
   */
  save(id: string, doc: unknown): Promise<void>;

  list(): Promise<string[]>;
  delete(id: string): Promise<void>;
}

// --- DocumentHandler ---

export interface PatchedPathsResult {
  elements: string[];
  sections: string[];
}

export interface DocumentHandler<T = unknown> {
  type: string;
  detect(doc: unknown): doc is T;
  generateManifest(doc: T): string;
  getElements(doc: T, ids: string[]): ElementsResult;
  validate(doc: T, context: ValidationContext): SpecValidationResult;
  extractPatchedPaths(patches: JsonPatch[]): PatchedPathsResult;
  countElements(doc: T): number;
}

// --- Pure function results ---

export interface ElementsResult {
  found: Record<string, unknown>;
  notFound: string[];
}

// --- SpecEngine ---

export interface SpecEngineConfig {
  store: SpecStore;
  primitiveRegistry?: PrimitiveRegistry;
}

export interface PatchResult {
  success: boolean;
  manifest: string;
  errors?: ValidationError[];
  elementCount: number;
  patchedElements: string[];
  patchedSections?: string[];
}

export interface SpecEngine {
  getManifest(screenId: string): Promise<string>;
  getElements(screenId: string, elementIds: string[]): Promise<ElementsResult>;
  patch(screenId: string, patches: JsonPatch[]): Promise<PatchResult>;
  delete(screenId: string): Promise<{ spec: unknown; manifest: string }>;
}
