import type { Spec } from '../types.js';
import { applyPatch, type JsonPatch } from './patch.js';

/**
 * SpecStreamCompiler — incrementally builds a Spec from JSONL patches.
 * Each line of input is a JSON patch operation that modifies the spec.
 */
export interface SpecStreamCompiler {
  /** Push a raw JSONL chunk (may contain multiple lines) */
  push: (chunk: string) => void;
  /** Push a single parsed patch */
  pushPatch: (patch: JsonPatch) => void;
  /** Get the current spec state */
  getSpec: () => Spec;
  /** Get all patches applied so far */
  getPatches: () => JsonPatch[];
  /** Get patches applied since last call to getNewPatches */
  getNewPatches: () => JsonPatch[];
  /** Check if compilation has started (at least one patch applied) */
  hasStarted: () => boolean;
}

export function createSpecStreamCompiler(): SpecStreamCompiler {
  let spec: Record<string, unknown> = {};
  const allPatches: JsonPatch[] = [];
  let newPatchesStart = 0;
  let buffer = '';

  function push(chunk: string): void {
    buffer += chunk;
    // Process complete lines
    const lines = buffer.split('\n');
    // Keep the last incomplete line in the buffer
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '') continue;
      try {
        const patch = JSON.parse(trimmed) as JsonPatch;
        pushPatch(patch);
      } catch {
        // Skip malformed lines (could be prose in inline mode)
      }
    }
  }

  function pushPatch(patch: JsonPatch): void {
    spec = applyPatch(spec, patch);
    allPatches.push(patch);
  }

  function getSpec(): Spec {
    return spec as unknown as Spec;
  }

  function getPatches(): JsonPatch[] {
    return [...allPatches];
  }

  function getNewPatches(): JsonPatch[] {
    const newOnes = allPatches.slice(newPatchesStart);
    newPatchesStart = allPatches.length;
    return newOnes;
  }

  function hasStarted(): boolean {
    return allPatches.length > 0;
  }

  return { push, pushPatch, getSpec, getPatches, getNewPatches, hasStarted };
}

/**
 * Compile a complete JSONL string into a Spec (one-shot, non-streaming).
 */
export function compileSpecStream(jsonl: string): Spec {
  const compiler = createSpecStreamCompiler();
  compiler.push(jsonl + '\n'); // Ensure last line is processed
  return compiler.getSpec();
}
