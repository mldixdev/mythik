import type { VersionedSpecStore, EnvironmentStore, RollbackImpact, RollbackResult } from './types.js';
import { computeStructuralDiff } from './structural-diff.js';

export interface RollbackImpactInput {
  specId: string;
  fromVersion: number;
  toVersion: number;
  store: VersionedSpecStore;
  envStore: EnvironmentStore;
}

export interface ExecuteRollbackInput {
  specId: string;
  toVersion: number;
  store: VersionedSpecStore;
  envStore: EnvironmentStore;
  author: string;
  description?: string;
}

/**
 * Compute what would be lost by rolling back from fromVersion to toVersion.
 */
export async function computeRollbackImpact(input: RollbackImpactInput): Promise<RollbackImpact> {
  const { specId, fromVersion, toVersion, store, envStore } = input;

  // Diff: what exists in current that doesn't exist in target = what we lose
  const targetSpec = await store.loadVersion(specId, toVersion);
  const currentSpec = await store.loadVersion(specId, fromVersion);
  const diff = computeStructuralDiff(targetSpec, currentSpec, toVersion, fromVersion);

  // Collect authors from all lost versions for attribution
  const versions = await store.listVersions(specId);
  const lostVersions = versions.filter(v => v.version > toVersion && v.version <= fromVersion);
  const uniqueAuthors = [...new Set(lostVersions.map(v => v.author))];

  const lostChanges = diff.changes.map(change => ({
    change,
    version: fromVersion, // Most recent version (the "current" being rolled back)
    author: uniqueAuthors.length === 1 ? uniqueAuthors[0] : uniqueAuthors.join(', '),
  }));

  // Check which environments are affected
  const envs = await envStore.getEnvironments(specId);
  const affectedEnvironments = envs.map(env => ({
    name: env.name,
    currentVersion: env.version,
    affected: env.version > toVersion,
  }));

  return { lostChanges, affectedEnvironments };
}

/**
 * Execute a rollback: create a new version with the content of the target version.
 * History is preserved — forward-only, never destructive.
 */
export async function executeRollback(input: ExecuteRollbackInput): Promise<RollbackResult> {
  const { specId, toVersion, store, envStore, author, description } = input;

  const currentVersion = await store.currentVersion(specId);
  if (currentVersion === 0) {
    return {
      success: false,
      fromVersion: 0,
      toVersion,
      newVersion: 0,
      impact: { lostChanges: [], affectedEnvironments: [] },
      errors: [{ message: `No version history for "${specId}"`, path: specId }],
    };
  }

  const impact = await computeRollbackImpact({
    specId,
    fromVersion: currentVersion,
    toVersion,
    store,
    envStore,
  });

  const targetSpec = await store.loadVersion(specId, toVersion);

  const newVersion = await store.saveVersion(specId, targetSpec, {
    author,
    source: 'rollback',
    description: description ?? `Rollback to v${toVersion}`,
  });

  return {
    success: true,
    fromVersion: currentVersion,
    toVersion,
    newVersion,
    impact,
  };
}
