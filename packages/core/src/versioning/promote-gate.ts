import type { VersionedSpecStore, EnvironmentStore, PromoteResult } from './types.js';
import type { ValidationError } from '../security/spec-validator.js';
import { computeStructuralDiff } from './structural-diff.js';
import { runContract } from '../contract/index.js';

export interface PromoteGateInput {
  specIds: string[];
  fromEnv: string;
  toEnv: string;
  store: VersionedSpecStore;
  envStore: EnvironmentStore;
  apiIds?: string[];
  author?: string;
}

export async function runPromoteGate(input: PromoteGateInput): Promise<PromoteResult> {
  const { specIds, fromEnv, toEnv, store, envStore, apiIds } = input;
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  let specValid = true;
  let crossScreenValid = true;
  let contractValid: boolean | undefined;
  let contractSkipped: boolean | undefined;

  // 1. Load specs at source environment versions + destination specs for diff
  const specsToPromote: Array<{ id: string; spec: unknown; destSpec: unknown; fromVersion: number; toVersion: number }> = [];

  for (const id of specIds) {
    const envPointer = await envStore.getEnvironment(id, fromEnv);
    if (!envPointer) {
      errors.push({ message: `Spec "${id}" has no version in environment "${fromEnv}"`, path: id });
      specValid = false;
      continue;
    }

    const spec = await store.loadVersion(id, envPointer.version);
    const destPointer = await envStore.getEnvironment(id, toEnv);
    const destVersion = destPointer?.version ?? 0;

    let destSpec: unknown = {};
    if (destVersion > 0) {
      try { destSpec = await store.loadVersion(id, destVersion); } catch { /* new in dest */ }
    }

    specsToPromote.push({ id, spec, destSpec, fromVersion: destVersion, toVersion: envPointer.version });
  }

  if (!specValid) {
    return buildResult(false, specsToPromote, toEnv, { specValid, crossScreenValid, errors, warnings });
  }

  // 2. Layer 1 — Spec validation (structural)
  for (const { id, spec } of specsToPromote) {
    if (!spec || typeof spec !== 'object') {
      errors.push({ message: `Spec "${id}" is not a valid object`, path: id });
      specValid = false;
    }
  }

  // 3. Layer 2 — Cross-screen consistency
  const batchIds = new Set(specIds);
  const screenRefs = extractScreenReferences(specsToPromote.map(s => s.spec));

  for (const ref of screenRefs) {
    if (batchIds.has(ref)) continue;

    const destPointer = await envStore.getEnvironment(ref, toEnv);
    if (!destPointer) {
      try {
        await store.load(ref);
        warnings.push({ message: `Referenced screen "${ref}" exists but has no version in "${toEnv}"`, path: ref });
      } catch {
        warnings.push({ message: `Referenced screen "${ref}" does not exist in "${toEnv}"`, path: ref });
      }
      crossScreenValid = false;
    }
  }

  // 4. Layer 3 — Contract validation (optional)
  if (apiIds && apiIds.length > 0) {
    contractSkipped = false;
    const apis: Array<{ id: string; spec: Record<string, unknown> }> = [];

    for (const apiId of apiIds) {
      let apiSpec: unknown;
      if (batchIds.has(apiId)) {
        // Api-spec in batch → use source env version
        const envPointer = await envStore.getEnvironment(apiId, fromEnv);
        if (envPointer) {
          apiSpec = await store.loadVersion(apiId, envPointer.version);
        }
      } else {
        // Api-spec not in batch → use destination env version
        const envPointer = await envStore.getEnvironment(apiId, toEnv);
        if (envPointer) {
          apiSpec = await store.loadVersion(apiId, envPointer.version);
        }
      }

      if (apiSpec && typeof apiSpec === 'object') {
        apis.push({ id: apiId, spec: apiSpec as Record<string, unknown> });
      }
    }

    if (apis.length > 0) {
      const screens: Record<string, Record<string, unknown>> = {};
      for (const { id, spec } of specsToPromote) {
        const s = spec as Record<string, unknown>;
        if (s.type !== 'api') {
          screens[id] = s;
        }
      }

      if (Object.keys(screens).length > 0) {
        const contractResult = runContract({ screens, apis });
        const contractErrors = contractResult.findings.filter(f => f.level === 'error');
        const contractWarnings = contractResult.findings.filter(f => f.level === 'warning');

        contractValid = contractErrors.length === 0;

        for (const f of contractErrors) {
          errors.push({ message: `[${f.rule}] ${f.message}`, path: f.screen ?? f.endpoint ?? '' });
        }
        for (const f of contractWarnings) {
          warnings.push({ message: `[${f.rule}] ${f.message}`, path: f.screen ?? f.endpoint ?? '' });
        }
      } else {
        contractValid = true;
      }
    } else {
      contractSkipped = true;
    }
  } else {
    contractSkipped = true;
  }

  const success = specValid && (contractValid !== false);

  return buildResult(success, specsToPromote, toEnv, {
    specValid,
    crossScreenValid,
    contractValid,
    contractSkipped,
    errors,
    warnings,
  });
}

function buildResult(
  success: boolean,
  specs: Array<{ id: string; spec: unknown; destSpec: unknown; fromVersion: number; toVersion: number }>,
  environment: string,
  validation: PromoteResult['validation'],
): PromoteResult {
  return {
    success,
    specs: specs.map(s => ({
      id: s.id,
      fromVersion: s.fromVersion,
      toVersion: s.toVersion,
      diff: computeStructuralDiff(s.destSpec, s.spec, s.fromVersion, s.toVersion),
    })),
    environment,
    validation,
  };
}

function extractScreenReferences(specs: unknown[]): string[] {
  const refs = new Set<string>();
  for (const spec of specs) {
    if (!spec || typeof spec !== 'object') continue;
    findNavigateRefs(spec, refs);
  }
  return Array.from(refs);
}

function findNavigateRefs(obj: unknown, refs: Set<string>): void {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    for (const item of obj) findNavigateRefs(item, refs);
    return;
  }
  const record = obj as Record<string, unknown>;
  if (record.action === 'navigate' && record.params) {
    const params = record.params as Record<string, unknown>;
    if (typeof params.screen === 'string') {
      refs.add(params.screen);
    }
  }
  for (const value of Object.values(record)) {
    findNavigateRefs(value, refs);
  }
}
