import type { JsonPatch } from '../streaming/patch.js';
import type { SpecEngine, SpecEngineConfig, PatchResult, ElementsResult, DocumentHandler } from './types.js';
import { applyPatches } from '../streaming/patch.js';
import { getDocumentHandler } from './handlers/index.js';

export function createSpecEngine(config: SpecEngineConfig): SpecEngine {
  const { store, primitiveRegistry } = config;
  const cache = new Map<string, unknown>();

  async function loadDocument(id: string): Promise<{ doc: unknown; handler: DocumentHandler }> {
    const cached = cache.get(id);
    if (cached) {
      return { doc: cached, handler: getDocumentHandler(cached) };
    }
    const doc = await store.load(id);
    cache.set(id, doc);
    return { doc, handler: getDocumentHandler(doc) };
  }

  async function getManifest(screenId: string): Promise<string> {
    const { doc, handler } = await loadDocument(screenId);
    return handler.generateManifest(doc);
  }

  async function getElements(screenId: string, elementIds: string[]): Promise<ElementsResult> {
    const { doc, handler } = await loadDocument(screenId);
    return handler.getElements(doc, elementIds);
  }

  async function patch(screenId: string, patches: JsonPatch[]): Promise<PatchResult> {
    const { doc, handler } = await loadDocument(screenId);

    const validationContext = primitiveRegistry ? { primitiveRegistry } : {};

    // Apply patches to a clone (atomicity)
    let patched: unknown;
    try {
      patched = applyPatches(structuredClone(doc as Record<string, unknown>), patches) as unknown;
    } catch (err) {
      const paths = handler.extractPatchedPaths(patches);
      return {
        success: false,
        manifest: handler.generateManifest(doc),
        errors: [{ message: (err as Error).message }],
        elementCount: handler.countElements(doc),
        patchedElements: paths.elements,
        patchedSections: paths.sections.length > 0 ? paths.sections : undefined,
      };
    }

    // Validate resulting doc with handler-specific rules
    const validation = handler.validate(patched, validationContext);

    if (!validation.valid) {
      const paths = handler.extractPatchedPaths(patches);
      return {
        success: false,
        manifest: handler.generateManifest(patched),
        errors: validation.errors,
        elementCount: handler.countElements(patched),
        patchedElements: paths.elements,
        patchedSections: paths.sections.length > 0 ? paths.sections : undefined,
      };
    }

    // Persist + update cache
    await store.save(screenId, patched);
    cache.set(screenId, patched);

    const paths = handler.extractPatchedPaths(patches);
    return {
      success: true,
      manifest: handler.generateManifest(patched),
      elementCount: handler.countElements(patched),
      patchedElements: paths.elements,
      patchedSections: paths.sections.length > 0 ? paths.sections : undefined,
    };
  }

  async function deleteScreen(screenId: string): Promise<{ spec: unknown; manifest: string }> {
    const { doc, handler } = await loadDocument(screenId);
    const manifest = handler.generateManifest(doc);
    await store.delete(screenId);
    cache.delete(screenId);
    return { spec: doc, manifest };
  }

  return { getManifest, getElements, patch, delete: deleteScreen };
}
