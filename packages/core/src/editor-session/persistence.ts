import type { EditorSessionPersistenceConfig } from '../types.js';
import { cloneEditorValue } from './clone.js';
import type { EditorSaveInput, EditorSessionSaveError } from './types.js';

export type CapturedEditorSnapshot = Record<string, unknown>;

export function mergeEditorSessionPersistence(
  sessionPersistence: EditorSessionPersistenceConfig | null | undefined,
  overrides: Partial<EditorSaveInput>,
): EditorSessionPersistenceConfig {
  const overrideValues = withoutSession(overrides);
  const merged = {
    ...(sessionPersistence ?? {}),
    ...overrideValues,
  } as EditorSessionPersistenceConfig;

  if (sessionPersistence?.headers !== undefined || overrideValues.headers !== undefined) {
    merged.headers = {
      ...(sessionPersistence?.headers ?? {}),
      ...(overrideValues.headers ?? {}),
    };
  }
  if (merged.method === undefined) merged.method = 'PUT';
  if (merged.body === undefined) merged.body = 'trackedPaths';
  return merged;
}

export function buildEditorSessionSaveBody(
  bodyMode: EditorSessionPersistenceConfig['body'] | undefined,
  snapshot: CapturedEditorSnapshot,
): unknown {
  const mode = bodyMode ?? 'trackedPaths';
  if (mode === 'trackedPaths') return buildNestedPayload(snapshot);
  if (mode === 'snapshot') return { paths: cloneEditorValue(snapshot) };
  return cloneEditorValue(mode);
}

export function applySaveTargetToCapturedSnapshot(
  snapshot: CapturedEditorSnapshot,
  target: string | undefined,
  value: unknown,
): CapturedEditorSnapshot {
  if (!target) return cloneEditorValue(snapshot);

  const next = cloneEditorValue(snapshot);
  for (const trackedPath of Object.keys(next)) {
    if (target === trackedPath) {
      next[trackedPath] = cloneEditorValue(value);
      return next;
    }
    if (target.startsWith(`${trackedPath}/`)) {
      next[trackedPath] = setNestedValue(
        next[trackedPath],
        pathToSegments(target.slice(trackedPath.length)),
        cloneEditorValue(value),
      );
      return next;
    }
  }
  return next;
}

export function normalizeEditorSaveError(error: unknown): EditorSessionSaveError {
  if (error instanceof Error) return { message: error.message };
  if (typeof error === 'string') return { message: error };
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const message = typeof record.message === 'string'
      ? record.message
      : typeof record.status === 'number'
        ? `HTTP ${record.status}`
        : 'Editor save failed';
    return {
      message,
      ...(typeof record.status === 'number' ? { status: record.status } : {}),
      ...(record.data !== undefined ? { data: record.data } : {}),
    };
  }
  return { message: 'Editor save failed' };
}

function withoutSession(input: Partial<EditorSaveInput>): Partial<EditorSessionPersistenceConfig> {
  const { session: _session, ...rest } = input;
  return rest;
}

function buildNestedPayload(snapshot: CapturedEditorSnapshot): Record<string, unknown> {
  let payload: Record<string, unknown> = {};
  for (const [path, value] of Object.entries(snapshot)) {
    payload = setNestedValue(payload, pathToSegments(path), cloneEditorValue(value)) as Record<string, unknown>;
  }
  return payload;
}

function pathToSegments(path: string): string[] {
  return path.split('/').filter(Boolean);
}

function setNestedValue(source: unknown, segments: string[], value: unknown): unknown {
  if (segments.length === 0) return value;

  const [head, ...tail] = segments;
  const base = isPlainRecord(source) ? { ...source } : {};
  base[head] = setNestedValue(base[head], tail, value);
  return base;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
