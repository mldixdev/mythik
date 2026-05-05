import type { SpecStore } from 'mythik';
import { runContract } from 'mythik';
import type { ContractFinding } from 'mythik';
import { formatSuccess, formatError, formatJson } from '../output.js';
import type { CommandResult } from './manifest.js';

export interface ContractOptions {
  store: SpecStore;
  apiStore?: SpecStore;  // Separate store for api-specs (different table/DB)
  appId: string;
  apiIds: string[];
  baseUrl?: string;
  json: boolean;
}

export async function runContractCommand(options: ContractOptions): Promise<CommandResult> {
  try {
    // 1. Load AppSpec
    let app: Record<string, unknown> | undefined;
    const appDoc = await options.store.load(options.appId);
    if (appDoc && typeof appDoc === 'object') {
      app = appDoc as Record<string, unknown>;
    }

    // 2. Discover screens from AppSpec
    const screenIds: string[] = [];
    if (app?.screens && typeof app.screens === 'object') {
      screenIds.push(...Object.keys(app.screens as Record<string, unknown>));
    }

    // Also include loginScreen
    const nav = app?.navigation as Record<string, unknown> | undefined;
    const authConfig = nav?.auth as Record<string, unknown> | undefined;
    if (authConfig?.loginScreen) {
      const loginId = authConfig.loginScreen as string;
      if (!screenIds.includes(loginId)) screenIds.push(loginId);
    }

    // 3. Load all screen specs
    const screens: Record<string, Record<string, unknown>> = {};
    for (const id of screenIds) {
      try {
        const doc = await options.store.load(id);
        if (doc && typeof doc === 'object') {
          screens[id] = doc as Record<string, unknown>;
        }
      } catch {
        // Screen might not exist in store — skip
      }
    }

    // 4. Load all api-specs (from apiStore if provided, otherwise same store)
    const apiLoader = options.apiStore ?? options.store;
    const apis: Array<{ id: string; spec: Record<string, unknown> }> = [];
    for (const apiId of options.apiIds) {
      try {
        const doc = await apiLoader.load(apiId);
        if (doc && typeof doc === 'object') {
          apis.push({ id: apiId, spec: doc as Record<string, unknown> });
        }
      } catch {
        // api-spec not found
      }
    }

    if (apis.length === 0) {
      return {
        output: formatError({ what: 'No api-specs found', why: `Could not load: ${options.apiIds.join(', ')}`, fix: 'Check api-spec IDs and store configuration' }),
        exitCode: 1,
      };
    }

    // 5. Base URL — explicit only (no auto-detect)
    const baseUrl = options.baseUrl;

    // 6. Run contract
    const result = runContract({ app, screens, apis, baseUrl });

    // 7. Format output
    if (options.json) {
      return { output: formatJson(result), exitCode: result.valid ? 0 : 1 };
    }

    const apiNames = options.apiIds.join(', ');
    const lines: string[] = [];

    if (result.findings.length === 0) {
      lines.push(formatSuccess(`Contract valid — ${options.appId} ↔ ${apiNames}`));
      lines.push('');
      lines.push(`  \u2713 ${result.summary.rulesRun} rules passed`);
      lines.push(`  \u2713 ${result.summary.fetchReferences} fetch references verified across ${result.summary.screens} screens`);
      lines.push(`  \u2713 ${result.summary.endpointsCovered} endpoints covered`);
      lines.push(`  \u2713 0 errors, 0 warnings`);
    } else {
      lines.push(`Mythik Contract \u2014 ${options.appId} \u2194 ${apiNames}`);
      lines.push('');

      const errors = result.findings.filter(f => f.level === 'error');
      const warnings = result.findings.filter(f => f.level === 'warning');

      if (errors.length > 0) {
        lines.push(`  \u2717 ERRORS (${errors.length})`);
        lines.push('');
        for (const [screen, screenFindings] of groupByScreen(errors)) {
          lines.push(`  Screen: ${screen}`);
          for (const f of screenFindings) {
            const countTag = f.count && f.count > 1 ? ` (\u00d7${f.count})` : '';
            lines.push(`    \u2717 [${f.rule}] ${f.message}${countTag}`);
            if (f.suggestion) lines.push(`      \u2192 ${f.suggestion}`);
          }
          lines.push('');
        }
      }

      if (warnings.length > 0) {
        lines.push(`  \u26A0 WARNINGS (${warnings.length})`);
        lines.push('');
        for (const [screen, screenFindings] of groupByScreen(warnings)) {
          lines.push(`  Screen: ${screen}`);
          for (const f of screenFindings) {
            const countTag = f.count && f.count > 1 ? ` (\u00d7${f.count})` : '';
            lines.push(`    \u26A0 [${f.rule}] ${f.message}${countTag}`);
            if (f.suggestion) lines.push(`      \u2192 ${f.suggestion}`);
          }
          lines.push('');
        }
      }

      lines.push(`  Summary: ${result.summary.errors} errors, ${result.summary.warnings} warnings`);
    }

    return { output: lines.join('\n'), exitCode: result.valid ? 0 : 1 };
  } catch (err) {
    const message = (err as Error).message;
    if (options.json) {
      return { output: formatJson({ error: message }), exitCode: 1 };
    }
    return {
      output: formatError({ what: 'Contract check failed', why: message }),
      exitCode: 1,
    };
  }
}

function groupByScreen(findings: ContractFinding[]): Map<string, ContractFinding[]> {
  const map = new Map<string, ContractFinding[]>();
  for (const f of findings) {
    const screen = f.screen ?? '(unknown)';
    if (!map.has(screen)) map.set(screen, []);
    map.get(screen)!.push(f);
  }
  return map;
}
