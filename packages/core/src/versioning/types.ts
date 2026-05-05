import type { SpecStore } from '../spec-engine/types.js';
import type { JsonPatch } from '../streaming/patch.js';
import type { ValidationError } from '../security/spec-validator.js';

// --- Version History ---

export interface VersionMeta {
  author: string;
  source: 'push' | 'patch' | 'rollback' | 'promote';
  description?: string;
}

export interface VersionEntry {
  version: number;
  timestamp: string;
  author: string;
  source: string;
  description?: string;
  isSnapshot: boolean;
}

/** Internal storage entry — includes patches or full spec */
export interface VersionRecord extends VersionEntry {
  patches?: JsonPatch[];
  spec?: unknown;
}

// --- Environments ---

export interface EnvironmentPointer {
  name: string;
  version: number;
  promotedAt: string;
  promotedBy: string;
}

// --- Structural Diff ---

export type StructuralChangeKind =
  | 'element-added' | 'element-removed' | 'prop-changed'
  | 'action-changed' | 'section-changed';

export interface StructuralChange {
  kind: StructuralChangeKind;
  elementId?: string;
  path: string;
  detail: string;
}

export interface StructuralDiff {
  fromVersion: number;
  toVersion: number;
  changes: StructuralChange[];
  summary: string;
}

// --- Promote ---

export interface PromoteResult {
  success: boolean;
  specs: Array<{
    id: string;
    fromVersion: number;
    toVersion: number;
    diff: StructuralDiff;
  }>;
  environment: string;
  validation: {
    specValid: boolean;
    crossScreenValid: boolean;
    contractValid?: boolean;
    contractSkipped?: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
  };
}

// --- Rollback ---

export interface RollbackImpact {
  lostChanges: Array<{
    change: StructuralChange;
    version: number;
    author: string;
  }>;
  affectedEnvironments: Array<{
    name: string;
    currentVersion: number;
    affected: boolean;
  }>;
}

export interface RollbackResult {
  success: boolean;
  fromVersion: number;
  toVersion: number;
  newVersion: number;
  impact: RollbackImpact;
  errors?: ValidationError[];
}

// --- Stores ---

export interface VersionedSpecStore extends SpecStore {
  saveVersion(id: string, doc: unknown, meta: VersionMeta): Promise<number>;
  loadVersion(id: string, version: number): Promise<unknown>;
  listVersions(id: string, limit?: number): Promise<VersionEntry[]>;
  currentVersion(id: string): Promise<number>;
}

export interface EnvironmentStore {
  getEnvironments(specId: string): Promise<EnvironmentPointer[]>;
  getEnvironment(specId: string, env: string): Promise<EnvironmentPointer | null>;
  setEnvironment(specId: string, env: string, version: number, author: string): Promise<void>;
}
