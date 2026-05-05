import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { dirname, resolve, join, isAbsolute, parse, relative } from 'node:path';
import { createRequire } from 'node:module';

export interface DocsCommandOptions {
  action: string;
  target?: string;
  json?: boolean;
  force?: boolean;
  cwd?: string;
  docsRoot?: string;
}

export interface DocsCommandResult {
  output: string;
  exitCode: number;
}

const require = createRequire(import.meta.url);

export function resolveBundledDocsRoot(packageJsonPath?: string): string {
  const resolvedPackageJson = packageJsonPath ?? require.resolve('mythik/package.json');
  return join(dirname(resolvedPackageJson), 'docs');
}

async function hasRequiredDocs(root: string): Promise<boolean> {
  try {
    await stat(join(root, 'consumer', 'ai-context.md'));
    await stat(join(root, 'wiki', 'compiled', 'README.md'));
    await stat(join(root, 'llms.txt'));
    return true;
  } catch {
    return false;
  }
}

async function isNonEmptyDirectory(path: string): Promise<boolean> {
  try {
    const info = await stat(path);
    if (!info.isDirectory()) return true;
    const entries = await readdir(path);
    return entries.length > 0;
  } catch {
    return false;
  }
}

function isSameOrAncestor(candidateAncestor: string, path: string): boolean {
  const relativePath = relative(candidateAncestor, path);
  return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath));
}

function validateCopyTarget(target: string, docsRoot: string, cwd: string): string | null {
  if (target === parse(target).root) {
    return `Refusing to copy Mythik docs over a filesystem root: ${target}`;
  }

  if (isSameOrAncestor(docsRoot, target) || isSameOrAncestor(target, docsRoot)) {
    return `Refusing to copy Mythik docs into or over the bundled docs directory: ${target}`;
  }

  if (isSameOrAncestor(target, cwd)) {
    return `Refusing to copy Mythik docs over the current working directory or one of its ancestors: ${target}`;
  }

  return null;
}

function docsPayload(docsRoot: string): Record<string, string> {
  return {
    docsPath: docsRoot,
    llmsTxt: join(docsRoot, 'llms.txt'),
    aiContext: join(docsRoot, 'consumer', 'ai-context.md'),
    wikiReadme: join(docsRoot, 'wiki', 'compiled', 'README.md'),
  };
}

function renderDocsPath(docsRoot: string): string {
  return [
    'Mythik AI documentation:',
    docsRoot,
    '',
    'Start here:',
    '- llms.txt',
    '- consumer/ai-context.md',
    '- wiki/compiled/README.md',
  ].join('\n');
}

export async function runDocsCommand(options: DocsCommandOptions): Promise<DocsCommandResult> {
  const action = options.action.trim().toLowerCase();
  const docsRoot = resolve(options.docsRoot ?? resolveBundledDocsRoot());

  if (!(await hasRequiredDocs(docsRoot))) {
    return {
      exitCode: 1,
      output: `Bundled Mythik documentation was not found at ${docsRoot}. Reinstall mythik or run this command from a packaged release.`,
    };
  }

  if (action === 'path') {
    return {
      exitCode: 0,
      output: options.json === true
        ? JSON.stringify(docsPayload(docsRoot), null, 2)
        : renderDocsPath(docsRoot),
    };
  }

  if (action === 'copy') {
    if (!options.target) {
      return { exitCode: 1, output: 'Missing target directory. Usage: mythik docs copy <dir>' };
    }

    const cwd = resolve(options.cwd ?? process.cwd());
    const target = resolve(cwd, options.target);
    const unsafeTargetReason = validateCopyTarget(target, docsRoot, cwd);
    if (unsafeTargetReason) {
      return { exitCode: 1, output: unsafeTargetReason };
    }

    if ((await isNonEmptyDirectory(target)) && options.force !== true) {
      return {
        exitCode: 1,
        output: `Target directory already exists and is not empty: ${target}. Re-run with --force to replace it.`,
      };
    }

    if (options.force === true) {
      await rm(target, { recursive: true, force: true });
    }
    await mkdir(dirname(target), { recursive: true });
    await cp(docsRoot, target, { recursive: true, force: true });

    return {
      exitCode: 0,
      output: options.json === true
        ? JSON.stringify({ copiedTo: target, ...docsPayload(target) }, null, 2)
        : `Copied Mythik AI documentation to ${target}`,
    };
  }

  return {
    exitCode: 1,
    output: `Unknown docs action "${options.action}". Use "path" or "copy".`,
  };
}
