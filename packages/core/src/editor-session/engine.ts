import type { StateStore } from '../state/store.js';
import { deepResolveExpressionValue } from '../expressions/deep-resolve.js';
import type { UrlGuard } from '../security/url-whitelist.js';
import type { ActionDefinition, EditorSessionConfig, EditorSessionPersistenceConfig, ResolveFn } from '../types.js';
import { cloneEditorValue, fingerprint } from './clone.js';
import {
  applySaveTargetToCapturedSnapshot,
  buildEditorSessionSaveBody,
  mergeEditorSessionPersistence,
  normalizeEditorSaveError,
  type CapturedEditorSnapshot,
} from './persistence.js';
import { validateEditorSessionDocument } from './validators.js';
import type {
  EditorCommitInput,
  EditorSaveInput,
  EditorHistoryEntry,
  EditorResolvedChange,
  EditorSessionSaveError,
  EditorSessionSaveStatus,
  EditorSessionEngine,
  EditorSessionMetadata,
  EditorSessionStatus,
  EditorSessionValidationResult,
  EditorSessionsConfig,
  NormalizedEditorSessionConfig,
} from './types.js';

interface EngineConfig {
  store: StateStore;
  sessions: EditorSessionsConfig;
  now?: () => string;
  resolve?: ResolveFn;
  fetcher?: EditorSessionFetcher;
  urlGuard?: UrlGuard;
}

interface EditorSessionFetchResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}

type EditorSessionFetcher = (url: string, options?: RequestInit) => Promise<EditorSessionFetchResponse>;

interface RuntimeEngineContext {
  store: StateStore;
  now: () => string;
  resolve: ResolveFn;
  fetcher?: EditorSessionFetcher;
  urlGuard?: UrlGuard;
}

interface SessionRuntime {
  config: NormalizedEditorSessionConfig;
  undoStack: EditorHistoryEntry[];
  redoStack: EditorHistoryEntry[];
  savedSnapshot: Record<string, unknown>;
  savedFingerprint: string;
  revision: number;
  savedRevision: number;
  lastCommitLabel: string | null;
  lastSavedAt: string | null;
  saveStatus: EditorSessionSaveStatus;
  saveError: EditorSessionSaveError | null;
  lastSaveAttemptAt: string | null;
  activeSave: Promise<EditorSessionMetadata> | null;
  disposed: boolean;
  validation: EditorSessionValidationResult;
}

const DEFAULT_MAX_HISTORY = 100;
const DEFAULT_SAVE_TIMEOUT_MS = 10_000;

export function createEditorSessionEngine(config: EngineConfig): EditorSessionEngine {
  const { store } = config;
  const now = config.now ?? (() => new Date().toISOString());
  const resolve = config.resolve ?? ((expr: unknown) => expr);
  const fetcher = config.fetcher ?? globalThis.fetch?.bind(globalThis);
  const context: RuntimeEngineContext = { store, now, resolve, fetcher, urlGuard: config.urlGuard };
  const sessions = new Map<string, SessionRuntime>();

  for (const [id, rawConfig] of Object.entries(config.sessions)) {
    const normalized = normalizeSessionConfig(id, rawConfig);
    const savedSnapshot = captureSnapshot(store, normalized.paths);
    const runtime: SessionRuntime = {
      config: normalized,
      undoStack: [],
      redoStack: [],
      savedSnapshot,
      savedFingerprint: fingerprint(savedSnapshot),
      revision: 0,
      savedRevision: 0,
      lastCommitLabel: null,
      lastSavedAt: null,
      saveStatus: 'idle',
      saveError: null,
      lastSaveAttemptAt: null,
      activeSave: null,
      disposed: false,
      validation: cleanValidation(),
    };
    sessions.set(id, runtime);
    writeMetadata(store, runtime);
  }

  function getRuntime(sessionId: string): SessionRuntime {
    const runtime = sessions.get(sessionId);
    if (!runtime) throw new Error(`Unknown editor session "${sessionId}"`);
    return runtime;
  }

  function commit(input: EditorCommitInput): EditorSessionMetadata {
    const runtime = getRuntime(input.session);
    if (!Array.isArray(input.changes) || input.changes.length === 0) {
      throw new Error('editorCommit requires a non-empty changes array');
    }

    const beforeFingerprint = currentFingerprint(store, runtime.config.paths);
    const resolvedChanges: EditorResolvedChange[] = [];
    for (const change of input.changes) {
      assertTrackedPath(runtime.config, change.path);
      const previousValue = cloneEditorValue(store.get(change.path));
      const nextValue = cloneEditorValue(change.value);
      if (fingerprint(previousValue) !== fingerprint(nextValue)) {
        resolvedChanges.push({ path: change.path, previousValue, nextValue });
      }
    }

    if (resolvedChanges.length === 0) {
      writeMetadata(store, runtime);
      return metadataFromRuntime(store, runtime);
    }

    for (const change of resolvedChanges) {
      store.set(change.path, cloneEditorValue(change.nextValue));
    }

    runtime.revision += 1;
    runtime.lastCommitLabel = input.label ?? null;
    clearStaleSaveState(runtime);
    runtime.validation = cleanValidation();
    const afterFingerprint = currentFingerprint(store, runtime.config.paths);
    runtime.undoStack.push({
      id: `${runtime.config.id}:${runtime.revision}`,
      label: input.label ?? null,
      timestamp: Date.now(),
      changes: resolvedChanges,
      beforeFingerprint,
      afterFingerprint,
    });
    while (runtime.undoStack.length > runtime.config.maxHistory) runtime.undoStack.shift();
    runtime.redoStack.length = 0;

    if (input.validate) {
      runtime.validation = validateEditorSessionDocument(store, runtime.config.validators, now());
    }
    writeMetadata(store, runtime);
    return metadataFromRuntime(store, runtime);
  }

  function undo(sessionId: string): boolean {
    const runtime = getRuntime(sessionId);
    const entry = runtime.undoStack.pop();
    if (!entry) {
      writeMetadata(store, runtime);
      return false;
    }
    for (const change of [...entry.changes].reverse()) {
      store.set(change.path, cloneEditorValue(change.previousValue));
    }
    runtime.redoStack.push(entry);
    runtime.revision += 1;
    runtime.lastCommitLabel = lastUndoLabel(runtime);
    clearStaleSaveState(runtime);
    runtime.validation = cleanValidation();
    writeMetadata(store, runtime);
    return true;
  }

  function redo(sessionId: string): boolean {
    const runtime = getRuntime(sessionId);
    const entry = runtime.redoStack.pop();
    if (!entry) {
      writeMetadata(store, runtime);
      return false;
    }
    for (const change of entry.changes) {
      store.set(change.path, cloneEditorValue(change.nextValue));
    }
    runtime.undoStack.push(entry);
    runtime.revision += 1;
    runtime.lastCommitLabel = lastUndoLabel(runtime);
    clearStaleSaveState(runtime);
    runtime.validation = cleanValidation();
    writeMetadata(store, runtime);
    return true;
  }

  function markSaved(sessionId: string, savedAt?: string): EditorSessionMetadata {
    const runtime = getRuntime(sessionId);
    runtime.savedSnapshot = captureSnapshot(store, runtime.config.paths);
    runtime.savedFingerprint = fingerprint(runtime.savedSnapshot);
    runtime.savedRevision = runtime.revision;
    runtime.lastSavedAt = savedAt ?? now();
    runtime.saveStatus = 'saved';
    runtime.saveError = null;
    writeMetadata(store, runtime);
    return metadataFromRuntime(store, runtime);
  }

  function save(input: EditorSaveInput): Promise<EditorSessionMetadata> {
    const runtime = getRuntime(input.session);
    if (runtime.activeSave) return runtime.activeSave;

    const activeSave = runSave(runtime, input, context).finally(() => {
      if (runtime.activeSave === activeSave) runtime.activeSave = null;
    });
    runtime.activeSave = activeSave;
    return activeSave;
  }

  function discard(sessionId: string): EditorSessionMetadata {
    const runtime = getRuntime(sessionId);
    for (const path of runtime.config.paths) {
      store.set(path, cloneEditorValue(runtime.savedSnapshot[path]));
    }
    runtime.undoStack.length = 0;
    runtime.redoStack.length = 0;
    runtime.revision += 1;
    runtime.lastCommitLabel = null;
    clearStaleSaveState(runtime);
    runtime.validation = cleanValidation();
    writeMetadata(store, runtime);
    return metadataFromRuntime(store, runtime);
  }

  function validate(sessionId: string): EditorSessionValidationResult {
    const runtime = getRuntime(sessionId);
    runtime.validation = validateEditorSessionDocument(store, runtime.config.validators, now());
    writeMetadata(store, runtime);
    return runtime.validation;
  }

  function metadata(sessionId: string): EditorSessionMetadata {
    return metadataFromRuntime(store, getRuntime(sessionId));
  }

  function getActionDefinitions(): ActionDefinition[] {
    return [
      { name: 'editorCommit', handler: (params) => commit(params as unknown as EditorCommitInput) },
      { name: 'editorUndo', handler: (params) => { undo(readSessionParam(params, 'editorUndo')); } },
      { name: 'editorRedo', handler: (params) => { redo(readSessionParam(params, 'editorRedo')); } },
      { name: 'editorMarkSaved', handler: (params) => { markSaved(readSessionParam(params, 'editorMarkSaved'), params.savedAt as string | undefined); } },
      { name: 'editorSave', handler: async (params) => { await save(params as unknown as EditorSaveInput); } },
      { name: 'editorDiscard', handler: (params) => { discard(readSessionParam(params, 'editorDiscard')); } },
      { name: 'editorValidate', handler: (params) => { validate(readSessionParam(params, 'editorValidate')); } },
    ];
  }

  function unmount(): void {
    for (const runtime of sessions.values()) {
      runtime.disposed = true;
      store.set(`/ui/editorSessions/${runtime.config.id}`, undefined);
    }
    sessions.clear();
  }

  return { commit, undo, redo, markSaved, save, discard, validate, metadata, getActionDefinitions, unmount };
}

function normalizeSessionConfig(id: string, config: EditorSessionConfig): NormalizedEditorSessionConfig {
  return {
    id,
    label: config.label ?? null,
    paths: [...new Set(config.paths)].sort(),
    maxHistory: config.maxHistory ?? DEFAULT_MAX_HISTORY,
    validators: config.validators ?? [],
    persistence: config.persistence ?? null,
  };
}

function clearStaleSaveState(runtime: SessionRuntime): void {
  if (runtime.saveStatus !== 'saving') runtime.saveStatus = 'idle';
  runtime.saveError = null;
}

function markSnapshotSaved(
  runtime: SessionRuntime,
  snapshot: CapturedEditorSnapshot,
  savedRevision: number,
  savedAt: string,
): void {
  runtime.savedSnapshot = cloneEditorValue(snapshot);
  runtime.savedFingerprint = fingerprint(runtime.savedSnapshot);
  runtime.savedRevision = savedRevision;
  runtime.lastSavedAt = savedAt;
}

async function runSave(
  runtime: SessionRuntime,
  input: EditorSaveInput,
  context: RuntimeEngineContext,
): Promise<EditorSessionMetadata> {
  const { store, now, resolve, fetcher, urlGuard } = context;
  if (!fetcher) {
    runtime.saveStatus = 'error';
    runtime.saveError = { message: 'editorSave requires a fetcher' };
    writeMetadata(store, runtime);
    return metadataFromRuntime(store, runtime);
  }
  const persistence = mergeEditorSessionPersistence(runtime.config.persistence, input);
  if (persistence.url === undefined) {
    runtime.saveStatus = 'error';
    runtime.saveError = { message: `editorSave requires persistence config or url for "${runtime.config.id}"` };
    writeMetadata(store, runtime);
    return metadataFromRuntime(store, runtime);
  }

  const resolvedUrl = deepResolveExpressionValue(persistence.url, resolve);
  if (typeof resolvedUrl !== 'string' || resolvedUrl.length === 0) {
    runtime.saveStatus = 'error';
    runtime.saveError = { message: 'editorSave resolved url must be a non-empty string' };
    writeMetadata(store, runtime);
    return metadataFromRuntime(store, runtime);
  }

  const saveSnapshot = captureSnapshot(store, runtime.config.paths);
  const saveRevision = runtime.revision;
  const resolvedBodyMode = resolveBodyMode(persistence.body, resolve);
  const body = buildEditorSessionSaveBody(resolvedBodyMode, saveSnapshot);
  const headers = resolveHeaders(persistence.headers, resolve);

  runtime.saveStatus = 'saving';
  runtime.saveError = null;
  runtime.lastSaveAttemptAt = now();
  writeMetadata(store, runtime);

  try {
    urlGuard?.assertAllowed(resolvedUrl);
    const response = await fetchWithTimeout(fetcher, resolvedUrl, {
      method: persistence.method ?? 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }, persistence.timeout ?? DEFAULT_SAVE_TIMEOUT_MS);
    const data = await readResponseJson(response);
    if (!response.ok) {
      throw { status: response.status, message: `HTTP ${response.status}`, data };
    }

    if (runtime.disposed) return metadataFromRuntime(store, runtime);
    if (persistence.target) store.set(persistence.target, data);
    markSnapshotSaved(
      runtime,
      applySaveTargetToCapturedSnapshot(saveSnapshot, persistence.target, data),
      saveRevision,
      now(),
    );
    runtime.saveStatus = 'saved';
    runtime.saveError = null;
    writeMetadata(store, runtime);
    return metadataFromRuntime(store, runtime);
  } catch (error) {
    if (runtime.disposed) return metadataFromRuntime(store, runtime);
    runtime.saveStatus = 'error';
    runtime.saveError = normalizeEditorSaveError(error);
    writeMetadata(store, runtime);
    return metadataFromRuntime(store, runtime);
  }
}

function resolveBodyMode(
  bodyMode: EditorSessionPersistenceConfig['body'] | undefined,
  resolve: ResolveFn,
): EditorSessionPersistenceConfig['body'] | undefined {
  if (bodyMode && typeof bodyMode === 'object') {
    return deepResolveExpressionValue(bodyMode, resolve) as EditorSessionPersistenceConfig['body'];
  }
  return bodyMode;
}

function resolveHeaders(
  headers: Record<string, unknown> | undefined,
  resolve: ResolveFn,
): Record<string, string> {
  if (!headers) return {};
  const resolved = deepResolveExpressionValue(headers, resolve);
  if (!resolved || typeof resolved !== 'object' || Array.isArray(resolved)) return {};

  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(resolved as Record<string, unknown>)) {
    if (value !== undefined) normalized[key] = String(value);
  }
  return normalized;
}

async function fetchWithTimeout(
  fetcher: EditorSessionFetcher,
  url: string,
  options: RequestInit,
  timeout: number,
): Promise<EditorSessionFetchResponse> {
  if (!Number.isFinite(timeout) || timeout <= 0 || typeof AbortController === 'undefined') {
    return fetcher(url, options);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetcher(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function readResponseJson(response: EditorSessionFetchResponse): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function captureSnapshot(store: StateStore, paths: string[]): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {};
  for (const path of paths) snapshot[path] = cloneEditorValue(store.get(path));
  return snapshot;
}

function currentFingerprint(store: StateStore, paths: string[]): string {
  const snapshot: Record<string, unknown> = {};
  for (const path of paths) snapshot[path] = store.get(path);
  return fingerprint(snapshot);
}

function isDirty(store: StateStore, runtime: SessionRuntime): boolean {
  return currentFingerprint(store, runtime.config.paths) !== runtime.savedFingerprint;
}

function assertTrackedPath(config: NormalizedEditorSessionConfig, path: string): void {
  const tracked = config.paths.some((trackedPath) => path === trackedPath || path.startsWith(`${trackedPath}/`));
  if (!tracked) {
    throw new Error(`editorCommit path "${path}" is outside tracked editor session paths for "${config.id}"`);
  }
}

function readSessionParam(params: Record<string, unknown>, action: string): string {
  if (typeof params.session !== 'string' || !params.session) {
    throw new Error(`${action} requires "session" param`);
  }
  return params.session;
}

function metadataFromRuntime(store: StateStore, runtime: SessionRuntime): EditorSessionMetadata {
  const dirty = isDirty(store, runtime);
  const status: EditorSessionStatus = runtime.saveStatus === 'saving'
    ? 'saving'
    : runtime.saveStatus === 'error' && dirty
      ? 'error'
      : dirty
        ? 'dirty'
        : 'clean';
  return {
    id: runtime.config.id,
    label: runtime.config.label,
    dirty,
    canUndo: runtime.undoStack.length > 0,
    canRedo: runtime.redoStack.length > 0,
    undoDepth: runtime.undoStack.length,
    redoDepth: runtime.redoStack.length,
    revision: runtime.revision,
    savedRevision: runtime.savedRevision,
    lastCommitLabel: runtime.lastCommitLabel,
    lastSavedAt: runtime.lastSavedAt,
    status,
    saveStatus: runtime.saveStatus,
    saveError: runtime.saveError,
    lastSaveAttemptAt: runtime.lastSaveAttemptAt,
    validation: runtime.validation,
  };
}

function writeMetadata(store: StateStore, runtime: SessionRuntime): void {
  store.set(`/ui/editorSessions/${runtime.config.id}`, metadataFromRuntime(store, runtime));
}

function cleanValidation(): EditorSessionValidationResult {
  return { valid: true, errors: [], warnings: [], checkedAt: null };
}

function lastUndoLabel(runtime: SessionRuntime): string | null {
  const lastEntry = runtime.undoStack[runtime.undoStack.length - 1];
  return lastEntry?.label ?? null;
}
