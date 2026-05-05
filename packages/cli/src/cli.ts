#!/usr/bin/env node

import { Command } from 'commander';
import { loadConfig } from './config.js';
import { resolveStore } from './stores/resolver.js';
import { runManifest } from './commands/manifest.js';
import { runElements } from './commands/elements.js';
import { runPatch, parsePatchInput } from './commands/patch.js';
import { runValidate } from './commands/validate.js';
import { runInit } from './commands/init.js';
import { runPull } from './commands/pull.js';
import { runPush } from './commands/push.js';
import { runDelete } from './commands/delete.js';
import { runContractCommand } from './commands/contract.js';
import { resolveVersionedStore } from './stores/resolver.js';
import { runHistory } from './commands/history.js';
import { runDiff } from './commands/diff.js';
import { runEnvs } from './commands/envs.js';
import { runRollbackCommand } from './commands/rollback.js';
import { runPromoteCommand } from './commands/promote.js';
import { runTokensResolve } from './commands/tokens.js';
import { runLintCommand } from './commands/lint.js';
import { runDocsCommand } from './commands/docs.js';
import { resolveInput } from './input-resolver.js';
import { runPushBulk } from './commands/push-bulk.js';

const program = new Command();

program
  .name('mythik')
  .description('Mythik CLI — manage specs via SpecEngine')
  .version('0.1.1');

program
  .command('manifest <screen>')
  .description('Show structural tree of a screen spec')
  .option('--json', 'Output as JSON', false)
  .option('--store <type>', 'Store type (supabase, file, memory)')
  .option('--table <name>', 'Table name override (e.g., api_specs)')
  .option('--url <url>', 'Supabase URL')
  .option('--key <key>', 'Supabase API key')
  .option('--dir <dir>', 'File store directory')
  .action(async (screen: string, opts) => {
    try {
      const config = loadConfig({ flags: opts });
      const store = resolveStore(config);
      const result = await runManifest(screen, { store, json: opts.json });
      process.stdout.write(result.output + '\n');
      process.exit(result.exitCode);
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
  });

program
  .command('elements <screen> <ids>')
  .description('Show details of specific elements by ID (comma-separated)')
  .option('--json', 'Output as JSON', false)
  .option('--toon', 'Output in TOON format (token-efficient)', false)
  .option('--store <type>', 'Store type (supabase, file, memory)')
  .option('--table <name>', 'Table name override (e.g., api_specs)')
  .option('--url <url>', 'Supabase URL')
  .option('--key <key>', 'Supabase API key')
  .option('--dir <dir>', 'File store directory')
  .action(async (screen: string, ids: string, opts) => {
    try {
      const config = loadConfig({ flags: opts });
      const store = resolveStore(config);
      const elementIds = ids.split(',').map(s => s.trim());
      const result = await runElements(screen, elementIds, { store, json: opts.json, toon: opts.toon });
      process.stdout.write(result.output + '\n');
      process.exit(result.exitCode);
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
  });

program
  .command('patch <screen> [patches]')
  .description('Apply RFC 6902 JSON patches to a screen spec (from argument, stdin, or --from-file)')
  .option('--json', 'Output as JSON', false)
  .option('--toon', 'Output in TOON format (token-efficient)', false)
  .option('--author <name>', 'Author name for version history')
  .option('--description <text>', 'Description for version history')
  .option('--from-file <path>', 'Read patches from file (use "-" for stdin)')
  .option('--store <type>', 'Store type (supabase, file, memory)')
  .option('--table <name>', 'Table name override (e.g., api_specs)')
  .option('--url <url>', 'Supabase URL')
  .option('--key <key>', 'Supabase API key')
  .option('--dir <dir>', 'File store directory')
  .action(async (screen: string, patchesArg: string | undefined, opts) => {
    try {
      const config = loadConfig({ flags: opts });
      let store: import('mythik').SpecStore;
      if (opts.author) {
        try {
          const { store: vStore } = resolveVersionedStore(config);
          store = vStore;
        } catch {
          store = resolveStore(config);
        }
      } else {
        store = resolveStore(config);
      }

      const input = await resolveInput({
        fromFile: opts.fromFile,
        positional: patchesArg,
        stdin: process.stdin,
        stdinIsTTY: process.stdin.isTTY === true,
      });

      const patches = parsePatchInput(input);
      const result = await runPatch(screen, patches, { store, json: opts.json, toon: opts.toon, author: opts.author, description: opts.description });
      process.stdout.write(result.output + '\n');
      process.exit(result.exitCode);
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
  });

program
  .command('validate <screen>')
  .description('Validate a screen spec for errors')
  .option('--json', 'Output as JSON', false)
  .option('--store <type>', 'Store type (supabase, file, memory)')
  .option('--table <name>', 'Table name override (e.g., api_specs)')
  .option('--url <url>', 'Supabase URL')
  .option('--key <key>', 'Supabase API key')
  .option('--dir <dir>', 'File store directory')
  .action(async (screen: string, opts) => {
    try {
      const config = loadConfig({ flags: opts });
      const store = resolveStore(config);
      const result = await runValidate(screen, { store, json: opts.json });
      process.stdout.write(result.output + '\n');
      process.exit(result.exitCode);
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize Mythik CLI configuration')
  .option('--store <type>', 'Store type (supabase, file, memory)')
  .option('--table <name>', 'Table name override (e.g., api_specs)')
  .option('--url <url>', 'Supabase URL')
  .option('--key <key>', 'Supabase API key')
  .option('--dir <dir>', 'File store directory')
  .action(async (opts) => {
    try {
      const result = await runInit(opts, process.cwd());
      if (result.output) {
        process.stdout.write(result.output + '\n');
      }
      process.exit(result.exitCode);
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
  });

program
  .command('push [screen]')
  .description('Create or replace screen spec(s) from stdin, --from-file, or --from-dir')
  .option('--json', 'Output as JSON', false)
  .option('--force', 'Overwrite existing screen even with validation errors', false)
  .option('--author <name>', 'Author name for version history')
  .option('--description <text>', 'Description for version history')
  .option('--from-file <path>', 'Read spec from file (use "-" for stdin)')
  .option('--from-dir <folder>', 'Push every *.json file in <folder> (filename stem = spec id)')
  .option('--store <type>', 'Store type (supabase, file, memory, sqlserver)')
  .option('--table <name>', 'Table name override (e.g., api_specs)')
  .option('--url <url>', 'Supabase URL')
  .option('--key <key>', 'Supabase API key')
  .option('--dir <dir>', 'File store directory')
  .action(async (screen: string | undefined, opts) => {
    try {
      const config = loadConfig({ flags: opts });
      // Use versioned store when --author is provided, fall back to regular store
      let store: import('mythik').SpecStore;
      if (opts.author) {
        try {
          const { store: vStore } = resolveVersionedStore(config);
          store = vStore;
        } catch {
          store = resolveStore(config);
        }
      } else {
        store = resolveStore(config);
      }

      // Dispatch: bulk path
      if (opts.fromDir) {
        if (screen !== undefined) {
          console.error('Cannot pass <screen> argument with --from-dir. Use one or the other.');
          process.exit(1);
        }
        if (opts.fromFile !== undefined) {
          console.error('Cannot pass --from-file with --from-dir. Use one or the other.');
          process.exit(1);
        }
        const bulkResult = await runPushBulk(opts.fromDir, {
          store, json: opts.json, force: opts.force, author: opts.author, description: opts.description,
        });
        process.stdout.write(bulkResult.output + '\n');
        process.exit(bulkResult.exitCode);
      }

      // Dispatch: single-spec path
      if (screen === undefined) {
        console.error('Missing required argument: <screen>. (Use --from-dir for bulk push.)');
        process.exit(1);
      }

      const input = await resolveInput({
        fromFile: opts.fromFile,
        stdin: process.stdin,
        stdinIsTTY: process.stdin.isTTY === true,
      });

      const result = await runPush(screen, input, { store, json: opts.json, force: opts.force, author: opts.author, description: opts.description });
      process.stdout.write(result.output + '\n');
      process.exit(result.exitCode);
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
  });

program
  .command('pull <screen>')
  .description('Export a full screen spec to stdout')
  .option('--json', 'Wrap output in JSON object', false)
  .option('--toon', 'Output in TOON format', false)
  .option('--store <type>', 'Store type (supabase, file, memory, sqlserver)')
  .option('--table <name>', 'Table name override (e.g., api_specs)')
  .option('--url <url>', 'Supabase URL')
  .option('--key <key>', 'Supabase API key')
  .option('--dir <dir>', 'File store directory')
  .action(async (screen: string, opts) => {
    try {
      const config = loadConfig({ flags: opts });
      const store = resolveStore(config);
      const result = await runPull(screen, { store, json: opts.json, toon: opts.toon });
      process.stdout.write(result.output + '\n');
      process.exit(result.exitCode);
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
  });

program
  .command('delete <screen>')
  .description('Delete a screen spec from the store')
  .option('--confirm', 'Actually delete (without this flag, preview only)', false)
  .option('--json', 'Output as JSON', false)
  .option('--store <type>', 'Store type (supabase, file, memory, sqlserver)')
  .option('--table <name>', 'Table name override (e.g., api_specs)')
  .option('--url <url>', 'Supabase URL')
  .option('--key <key>', 'Supabase API key')
  .option('--dir <dir>', 'File store directory')
  .action(async (screen: string, opts) => {
    try {
      const config = loadConfig({ flags: opts });
      const store = resolveStore(config);
      const result = await runDelete(screen, { store, json: opts.json, confirm: opts.confirm });
      process.stdout.write(result.output + '\n');
      if (opts.confirm && result.exitCode === 0 && !opts.json) {
        process.stderr.write(`Deleted "${screen}"\n`);
      }
      process.exit(result.exitCode);
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
  });

program
  .command('contract')
  .description('Cross-validate frontend specs against backend api-specs')
  .requiredOption('--app <id>', 'App spec ID')
  .requiredOption('--api <ids>', 'Api spec ID(s), comma-separated')
  .option('--base-url <url>', 'Base URL to strip from fetch URLs')
  .option('--api-table <table>', 'Table name for api-specs (when stored separately)')
  .option('--json', 'Output as JSON', false)
  .option('--store <type>', 'Store type (supabase, file, memory, sqlserver)')
  .option('--table <name>', 'Table name override (e.g., api_specs)')
  .option('--url <url>', 'Supabase URL')
  .option('--key <key>', 'Supabase API key')
  .option('--dir <dir>', 'File store directory')
  .action(async (opts) => {
    try {
      const config = loadConfig({ flags: opts });
      const store = resolveStore(config);
      const apiIds = (opts.api as string).split(',').map((s: string) => s.trim());

      // If --api-table is provided, create a separate store for api-specs
      let apiStore: import('mythik').SpecStore | undefined;
      if (opts.apiTable) {
        const apiConfig = { ...config };
        if (apiConfig.sqlserver) apiConfig.sqlserver = { ...apiConfig.sqlserver, table: opts.apiTable };
        if (apiConfig.supabase) apiConfig.supabase = { ...apiConfig.supabase, table: opts.apiTable };
        apiStore = resolveStore(apiConfig);
      }

      const result = await runContractCommand({
        store,
        apiStore,
        appId: opts.app,
        apiIds,
        baseUrl: opts.baseUrl,
        json: opts.json,
      });
      process.stdout.write(result.output + '\n');
      process.exit(result.exitCode);
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
  });

// --- Versioning commands ---

program
  .command('history <specId>')
  .description('Show version history for a spec')
  .option('--limit <n>', 'Limit number of versions shown', parseInt)
  .option('--json', 'Output as JSON', false)
  .option('--store <type>', 'Store type')
  .option('--table <name>', 'Table name override (e.g., api_specs)')
  .action(async (specId: string, opts) => {
    try {
      const config = loadConfig({ flags: opts });
      const { store, envStore } = resolveVersionedStore(config);
      const result = await runHistory(specId, { store, envStore, json: opts.json, limit: opts.limit });
      process.stdout.write(result.output + '\n');
      process.exit(result.exitCode);
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
  });

program
  .command('diff <specId> <from> [to]')
  .description('Show structural diff between two versions or environments')
  .option('--json', 'Output as JSON', false)
  .option('--store <type>', 'Store type')
  .option('--table <name>', 'Table name override (e.g., api_specs)')
  .action(async (specId: string, from: string, to: string | undefined, opts) => {
    try {
      const config = loadConfig({ flags: opts });
      const { store, envStore } = resolveVersionedStore(config);
      const result = await runDiff(specId, { store, envStore, from, to, json: opts.json });
      process.stdout.write(result.output + '\n');
      process.exit(result.exitCode);
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
  });

program
  .command('envs <specId>')
  .description('List or set environment pointers for a spec')
  .option('--set <env=version>', 'Set environment pointer (e.g., --set dev=12)')
  .option('--author <name>', 'Author for set operation')
  .option('--json', 'Output as JSON', false)
  .option('--store <type>', 'Store type')
  .option('--table <name>', 'Table name override (e.g., api_specs)')
  .action(async (specId: string, opts) => {
    try {
      const config = loadConfig({ flags: opts });
      const { store, envStore } = resolveVersionedStore(config);
      const result = await runEnvs(specId, { store, envStore, json: opts.json, set: opts.set, author: opts.author });
      process.stdout.write(result.output + '\n');
      process.exit(result.exitCode);
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
  });

program
  .command('rollback <specId>')
  .description('Rollback a spec to a previous version')
  .requiredOption('--to <version>', 'Target version number', parseInt)
  .option('--confirm', 'Execute rollback (without this, preview only)', false)
  .option('--author <name>', 'Author name', 'system')
  .option('--description <text>', 'Description for the rollback version')
  .option('--json', 'Output as JSON', false)
  .option('--store <type>', 'Store type')
  .option('--table <name>', 'Table name override (e.g., api_specs)')
  .action(async (specId: string, opts) => {
    try {
      const config = loadConfig({ flags: opts });
      const { store, envStore } = resolveVersionedStore(config);
      const result = await runRollbackCommand(specId, {
        store, envStore, toVersion: opts.to, confirm: opts.confirm, json: opts.json, author: opts.author, description: opts.description,
      });
      process.stdout.write(result.output + '\n');
      process.exit(result.exitCode);
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
  });

program
  .command('promote [specIds...]')
  .description('Promote specs between environments with validation gate')
  .requiredOption('--from <env>', 'Source environment')
  .requiredOption('--to <env>', 'Destination environment')
  .option('--app <id>', 'Promote entire app (all screens)')
  .option('--api <ids>', 'Api spec ID(s) for contract validation, comma-separated')
  .option('--confirm', 'Execute promotion (without this, preview only)', false)
  .option('--author <name>', 'Author name', 'system')
  .option('--json', 'Output as JSON', false)
  .option('--store <type>', 'Store type')
  .option('--table <name>', 'Table name override (e.g., api_specs)')
  .action(async (specIds: string[], opts) => {
    try {
      const config = loadConfig({ flags: opts });
      const { store, envStore } = resolveVersionedStore(config);

      let ids: string[] = specIds ?? [];
      if (opts.app) {
        const appDoc = await store.load(opts.app);
        if (appDoc && typeof appDoc === 'object') {
          const app = appDoc as Record<string, unknown>;
          const screens = app.screens as Record<string, unknown> | undefined;
          if (screens) ids = [opts.app, ...Object.keys(screens)];
        }
      }

      if (ids.length === 0) {
        console.error('No specs to promote. Provide spec IDs or use --app <id>');
        process.exit(1);
      }

      const apiIds = opts.api ? (opts.api as string).split(',').map((s: string) => s.trim()) : undefined;

      const result = await runPromoteCommand({
        store, envStore, specIds: ids, fromEnv: opts.from, toEnv: opts.to,
        apiIds, confirm: opts.confirm, json: opts.json, author: opts.author,
      });
      process.stdout.write(result.output + '\n');
      process.exit(result.exitCode);
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
  });

program
  .command('tokens')
  .description('Resolve deep design tokens from DNA seed or explicit values')
  .option('--dna <json>', 'DNA seed as JSON (e.g., \'{"primary":"#0D9488","roundness":0.7}\')')
  .option('--tokens <json>', 'Full tokens object as JSON')
  .option('--json', 'Output as JSON', false)
  .action(async (opts) => {
    try {
      const result = await runTokensResolve({ dna: opts.dna, tokens: opts.tokens, json: opts.json });
      process.stdout.write(result.output + '\n');
      process.exit(result.exitCode);
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
  });

program
  .command('docs <action> [target]')
  .description('Locate or copy bundled Mythik AI documentation (actions: path, copy)')
  .option('--json', 'Output as JSON', false)
  .option('--force', 'Replace target directory when using docs copy', false)
  .action(async (action: string, target: string | undefined, opts) => {
    const result = await runDocsCommand({
      action,
      target,
      json: opts.json === true,
      force: opts.force === true,
    });
    process.stdout.write(result.output + '\n');
    process.exit(result.exitCode);
  });

program
  .command('lint [target]')
  .description('Lint specs and consumer code for known anti-patterns')
  .option('--from-file <path>', 'Lint single file (auto-detect by extension: .json → spec, .ts/.tsx/.js/.jsx → code)')
  .option('--from-dir <folder>', 'Lint all files in folder (recursive)')
  .option('--specs-only', 'Skip code rules')
  .option('--code-only', 'Skip spec rules')
  .option('--code-dir <path>', 'Code scan root (default: ./src)')
  .option('--json', 'JSON output')
  .action(async (target, opts) => {
    // Mutual exclusivity: --from-dir is bulk; positional target and --from-file are single-target.
    // Mirrors `mythik push` conflict handling (cli.ts §push).
    if (opts.fromDir) {
      if (target !== undefined) {
        console.error('Cannot pass <target> argument with --from-dir. Use one or the other.');
        process.exit(1);
      }
      if (opts.fromFile !== undefined) {
        console.error('Cannot pass --from-file with --from-dir. Use one or the other.');
        process.exit(1);
      }
    }

    // target is positional — treat as fromFile if provided, otherwise honor flags
    const cmd = await runLintCommand({
      fromFile: opts.fromFile ?? (target as string | undefined),
      fromDir: opts.fromDir,
      specsOnly: opts.specsOnly === true,
      codeOnly: opts.codeOnly === true,
      codeDir: opts.codeDir,
      json: opts.json === true,
    });
    process.stdout.write(cmd.output);
    process.exit(cmd.exitCode);
  });

program.parse();
