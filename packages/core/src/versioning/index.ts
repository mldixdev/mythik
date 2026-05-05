export type {
  VersionMeta,
  VersionEntry,
  VersionRecord,
  EnvironmentPointer,
  StructuralChangeKind,
  StructuralChange,
  StructuralDiff,
  PromoteResult,
  RollbackImpact,
  RollbackResult,
  VersionedSpecStore,
  EnvironmentStore,
} from './types.js';
export { computePatches } from './compute-patches.js';
export { computeStructuralDiff } from './structural-diff.js';
export { runPromoteGate } from './promote-gate.js';
export type { PromoteGateInput } from './promote-gate.js';
export { computeRollbackImpact, executeRollback } from './rollback.js';
export type { RollbackImpactInput, ExecuteRollbackInput } from './rollback.js';
export { MemoryVersionedSpecStore, MemoryEnvironmentStore } from '../spec-stores/memory-versioned.js';
export type { MemoryVersionedSpecStoreConfig } from '../spec-stores/memory-versioned.js';
export { SupabaseVersionedSpecStore, SupabaseEnvironmentStore } from '../spec-stores/supabase-versioned.js';
export type { SupabaseVersionedSpecStoreConfig, SupabaseEnvironmentStoreConfig } from '../spec-stores/supabase-versioned.js';
