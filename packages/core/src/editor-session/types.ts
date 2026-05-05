import type { ActionDefinition, EditorSessionConfig, EditorSessionPersistenceConfig, EditorSessionValidatorConfig } from '../types.js';

export type EditorSessionStatus = 'clean' | 'dirty' | 'saving' | 'error';
export type EditorSessionSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface EditorSessionSaveError {
  message: string;
  status?: number;
  data?: unknown;
}

export interface EditorSessionValidationIssue {
  message: string;
  path?: string;
  code: string;
}

export interface EditorSessionValidationResult {
  valid: boolean;
  errors: EditorSessionValidationIssue[];
  warnings: EditorSessionValidationIssue[];
  checkedAt: string | null;
}

export interface EditorSessionMetadata {
  id: string;
  label: string | null;
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  undoDepth: number;
  redoDepth: number;
  revision: number;
  savedRevision: number;
  lastCommitLabel: string | null;
  lastSavedAt: string | null;
  status: EditorSessionStatus;
  saveStatus: EditorSessionSaveStatus;
  saveError: EditorSessionSaveError | null;
  lastSaveAttemptAt: string | null;
  validation: EditorSessionValidationResult;
}

export interface NormalizedEditorSessionConfig {
  id: string;
  label: string | null;
  paths: string[];
  maxHistory: number;
  validators: EditorSessionValidatorConfig[];
  persistence: EditorSessionPersistenceConfig | null;
}

export interface EditorResolvedChange {
  path: string;
  previousValue: unknown;
  nextValue: unknown;
}

export interface EditorHistoryEntry {
  id: string;
  label: string | null;
  timestamp: number;
  changes: EditorResolvedChange[];
  beforeFingerprint: string;
  afterFingerprint: string;
}

export interface EditorCommitInput {
  session: string;
  label?: string;
  changes: Array<{ path: string; value: unknown }>;
  validate?: boolean;
}

export interface EditorSaveInput {
  session: string;
  url?: string | Record<string, unknown>;
  method?: 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, unknown>;
  body?: 'trackedPaths' | 'snapshot' | Record<string, unknown>;
  target?: string;
  timeout?: number;
}

export interface EditorSessionEngine {
  commit(input: EditorCommitInput): EditorSessionMetadata;
  undo(sessionId: string): boolean;
  redo(sessionId: string): boolean;
  markSaved(sessionId: string, savedAt?: string): EditorSessionMetadata;
  save(input: EditorSaveInput): Promise<EditorSessionMetadata>;
  discard(sessionId: string): EditorSessionMetadata;
  validate(sessionId: string): EditorSessionValidationResult;
  metadata(sessionId: string): EditorSessionMetadata;
  getActionDefinitions(): ActionDefinition[];
  unmount(): void;
}

export type EditorSessionsConfig = Record<string, EditorSessionConfig>;
