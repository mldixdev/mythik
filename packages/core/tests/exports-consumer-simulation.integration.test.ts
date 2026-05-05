import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile, readFile, readdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..');
const CORE_DIR = resolve(REPO_ROOT, 'packages', 'core');
const BASELINE_FILE = resolve(__dirname, '.bundle-size-baseline.json');

const BUNDLE_SIZE_REGRESSION_THRESHOLD = 1.20;

interface BundleSizeBaseline {
  bundleSizeBytes: number;
  lastUpdated: string;
  lastUpdatedReason: string;
  comment?: string;
}

describe('mythik consumer simulation (tagged: @integration)', () => {
  let scratchDir: string;
  let tarballPath: string;

  beforeAll(async () => {
    // 1. Build mythik (tarball source)
    execSync('pnpm exec tsc -p packages/core', { cwd: REPO_ROOT, stdio: 'pipe' });

    // 2. Pack into a tarball in the core package dir
    const packOutput = execSync('pnpm pack --pack-destination .', {
      cwd: CORE_DIR,
      stdio: 'pipe',
      encoding: 'utf8',
    });
    const tarballName = packOutput.trim().split(/\r?\n/).pop()!.trim();
    tarballPath = resolve(CORE_DIR, tarballName);

    // 3. Create scratch folder
    scratchDir = await mkdtemp(join(tmpdir(), 'mythik-consumer-sim-'));

    // 4. Create src dir before writing nested files
    const srcDir = join(scratchDir, 'src');
    await mkdir(srcDir, { recursive: true });

    // 5. Write scratch project files
    await writeFile(
      join(scratchDir, 'package.json'),
      JSON.stringify(
        {
          name: 'mythik-consumer-sim',
          version: '1.0.0',
          type: 'module',
          scripts: { build: 'vite build' },
          dependencies: {
            'mythik': `file:${tarballPath.replace(/\\/g, '/')}`,
            react: '^19.0.0',
            'react-dom': '^19.0.0',
          },
          devDependencies: {
            vite: '^8.0.0',
            '@vitejs/plugin-react': '^6.0.0',
            typescript: '^5.7.0',
          },
        },
        null,
        2,
      ),
    );

    await writeFile(
      join(scratchDir, 'index.html'),
      `<!doctype html><html><head><meta charset="utf-8"><title>sim</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>`,
    );

    await writeFile(
      join(scratchDir, 'vite.config.ts'),
      `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nexport default defineConfig({ plugins: [react()] });\n`,
    );

    await writeFile(
      join(scratchDir, 'tsconfig.json'),
      JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2022',
            module: 'ESNext',
            moduleResolution: 'bundler',
            jsx: 'react-jsx',
            strict: true,
            skipLibCheck: true,
          },
          include: ['src'],
        },
        null,
        2,
      ),
    );

    await writeFile(
      join(srcDir, 'main.tsx'),
      `import { createMythik } from 'mythik';\nimport { createRoot } from 'react-dom/client';\nimport React from 'react';\nconst m = createMythik({});\nconsole.log('mythik ready', typeof m);\ncreateRoot(document.getElementById('root')!).render(React.createElement('div', null, 'ok'));\n`,
    );

    // 6. Install dependencies in the scratch folder
    execSync('pnpm install --ignore-workspace --prefer-offline', {
      cwd: scratchDir,
      stdio: 'pipe',
      timeout: 90000,
    });
  }, 120000);

  afterAll(async () => {
    if (scratchDir) await rm(scratchDir, { recursive: true, force: true });
    if (tarballPath) await rm(tarballPath, { force: true });
  });

  it('vite build succeeds with no bundler aliases', () => {
    const output = execSync('pnpm run build', {
      cwd: scratchDir,
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 60000,
    });
    expect(output).toMatch(/built in/i);
  });

  it('output bundle contains zero mssql string matches', async () => {
    const distDir = join(scratchDir, 'dist', 'assets');
    const files = await readdir(distDir);
    const jsFiles = files.filter((f) => f.endsWith('.js'));
    for (const f of jsFiles) {
      const content = await readFile(join(distDir, f), 'utf8');
      expect(content, `bundle ${f} contains mssql`).not.toMatch(/\bmssql\b/);
    }
  });

  it('bundle size respects regression threshold', async () => {
    const distDir = join(scratchDir, 'dist', 'assets');
    const files = await readdir(distDir);
    const jsFiles = files.filter((f) => f.endsWith('.js'));
    let totalSize = 0;
    for (const f of jsFiles) {
      const s = await stat(join(distDir, f));
      totalSize += s.size;
    }

    const baselineRaw = await readFile(BASELINE_FILE, 'utf8');
    const baseline: BundleSizeBaseline = JSON.parse(baselineRaw);

    if (baseline.bundleSizeBytes === 0) {
      // First run — print the size and fail with a prompt to commit an updated baseline.
      throw new Error(
        `No baseline recorded yet. Current total bundle size: ${totalSize} bytes.\n` +
        `Update packages/core/tests/.bundle-size-baseline.json with bundleSizeBytes: ${totalSize}, ` +
        `and commit the change with the Item C work.`,
      );
    }

    const ratio = totalSize / baseline.bundleSizeBytes;
    expect(ratio, `bundle size ${totalSize} bytes is ${(ratio * 100).toFixed(1)}% of baseline ${baseline.bundleSizeBytes} — exceeds ${BUNDLE_SIZE_REGRESSION_THRESHOLD * 100}% threshold`).toBeLessThanOrEqual(BUNDLE_SIZE_REGRESSION_THRESHOLD);
  });
});

describe('mythik-cli/api consumer simulation (tagged: @integration)', () => {
  let scratchDir: string;
  let coreTarballPath: string;
  let cliTarballPath: string;

  beforeAll(async () => {
    // Build core + cli
    execSync('pnpm exec tsc -p packages/core', { cwd: REPO_ROOT, stdio: 'pipe' });
    execSync('pnpm exec tsc -p packages/cli', { cwd: REPO_ROOT, stdio: 'pipe' });

    // Pack core
    const corePackOutput = execSync('pnpm pack --pack-destination .', {
      cwd: CORE_DIR,
      stdio: 'pipe',
      encoding: 'utf8',
    });
    coreTarballPath = resolve(CORE_DIR, corePackOutput.trim().split(/\r?\n/).pop()!.trim());

    // Pack cli
    const CLI_DIR = resolve(REPO_ROOT, 'packages', 'cli');
    const cliPackOutput = execSync('pnpm pack --pack-destination .', {
      cwd: CLI_DIR,
      stdio: 'pipe',
      encoding: 'utf8',
    });
    cliTarballPath = resolve(CLI_DIR, cliPackOutput.trim().split(/\r?\n/).pop()!.trim());

    // Scratch project
    scratchDir = await mkdtemp(join(tmpdir(), 'mythik-cli-api-sim-'));
    const srcDir = join(scratchDir, 'src');
    await mkdir(srcDir, { recursive: true });

    await writeFile(
      join(scratchDir, 'package.json'),
      JSON.stringify(
        {
          name: 'mythik-cli-api-sim',
          version: '1.0.0',
          type: 'module',
          dependencies: {
            'mythik': `file:${coreTarballPath.replace(/\\/g, '/')}`,
            'mythik-cli': `file:${cliTarballPath.replace(/\\/g, '/')}`,
          },
          devDependencies: {
            typescript: '^5.7.0',
            tsx: '^4.0.0',
            '@types/node': '^22.0.0',
          },
          pnpm: {
            overrides: {
              'mythik': `file:${coreTarballPath.replace(/\\/g, '/')}`,
            },
          },
        },
        null,
        2,
      ),
    );

    await writeFile(
      join(scratchDir, 'tsconfig.json'),
      JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2022',
            module: 'NodeNext',
            moduleResolution: 'NodeNext',
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
          },
          include: ['src'],
        },
        null,
        2,
      ),
    );

    await writeFile(
      join(srcDir, 'main.ts'),
      `import { runPush, type PushResult } from 'mythik-cli/api';
import { MemorySpecStore } from 'mythik';

async function main() {
  const store = new MemorySpecStore();
  const spec = { root: 'page', elements: { page: { type: 'box', props: {}, children: [] } } };
  const result = await runPush('test', JSON.stringify(spec), {
    store, json: true, force: false,
  });
  const parsed: PushResult = JSON.parse(result.output);
  if (!parsed.success) {
    process.exit(1);
  }
  if (parsed.elementCount !== 1) {
    process.exit(2);
  }
  console.log('OK');
}

main().catch((err) => { console.error(err); process.exit(99); });
`,
    );

    execSync('pnpm install --no-frozen-lockfile', { cwd: scratchDir, stdio: 'pipe' });
  }, 180000);

  afterAll(async () => {
    await rm(scratchDir, { recursive: true, force: true });
    await rm(coreTarballPath, { force: true });
    await rm(cliTarballPath, { force: true });
  });

  it('imports runPush from mythik-cli/api and executes against MemorySpecStore', () => {
    const stdout = execSync('pnpm exec tsx src/main.ts', {
      cwd: scratchDir,
      stdio: 'pipe',
      encoding: 'utf8',
    });
    expect(stdout.trim()).toBe('OK');
  });

  it('compiles TypeScript types from mythik-cli/api cleanly', () => {
    execSync('pnpm exec tsc --noEmit', {
      cwd: scratchDir,
      stdio: 'pipe',
    });
    // Success = tsc exit 0; if it threw, vitest catches.
  });
});

describe('mythik-cli/api lint consumer simulation (tagged: @integration)', () => {
  let scratchDir: string;
  let coreTarballPath: string;
  let cliTarballPath: string;

  beforeAll(async () => {
    // Build core + cli
    execSync('pnpm exec tsc -p packages/core', { cwd: REPO_ROOT, stdio: 'pipe' });
    execSync('pnpm exec tsc -p packages/cli', { cwd: REPO_ROOT, stdio: 'pipe' });

    // Pack core
    const corePackOutput = execSync('pnpm pack --pack-destination .', {
      cwd: CORE_DIR,
      stdio: 'pipe',
      encoding: 'utf8',
    });
    coreTarballPath = resolve(CORE_DIR, corePackOutput.trim().split(/\r?\n/).pop()!.trim());

    // Pack cli
    const CLI_DIR = resolve(REPO_ROOT, 'packages', 'cli');
    const cliPackOutput = execSync('pnpm pack --pack-destination .', {
      cwd: CLI_DIR,
      stdio: 'pipe',
      encoding: 'utf8',
    });
    cliTarballPath = resolve(CLI_DIR, cliPackOutput.trim().split(/\r?\n/).pop()!.trim());

    // Scratch project (shared across both lint smoke tests)
    scratchDir = await mkdtemp(join(tmpdir(), 'mythik-cli-api-lint-sim-'));
    const srcDir = join(scratchDir, 'src');
    await mkdir(srcDir, { recursive: true });

    await writeFile(
      join(scratchDir, 'package.json'),
      JSON.stringify(
        {
          name: 'mythik-cli-api-lint-sim',
          version: '1.0.0',
          type: 'module',
          dependencies: {
            'mythik': `file:${coreTarballPath.replace(/\\/g, '/')}`,
            'mythik-cli': `file:${cliTarballPath.replace(/\\/g, '/')}`,
          },
          devDependencies: {
            typescript: '^5.7.0',
            tsx: '^4.0.0',
            '@types/node': '^22.0.0',
          },
          pnpm: {
            overrides: {
              'mythik': `file:${coreTarballPath.replace(/\\/g, '/')}`,
            },
          },
        },
        null,
        2,
      ),
    );

    await writeFile(
      join(scratchDir, 'tsconfig.json'),
      JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2022',
            module: 'NodeNext',
            moduleResolution: 'NodeNext',
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
          },
          include: ['src'],
        },
        null,
        2,
      ),
    );

    // Fixture 1 — spec.json with $row literal (triggers spec-row-literal warning)
    await writeFile(
      join(scratchDir, 'spec.json'),
      JSON.stringify({
        root: 'r',
        elements: { r: { type: 'box', props: { value: { $row: 'id' } } } },
      }),
    );

    // Fixture 2 — src/seed.ts with bypass call (triggers code-store-save-bypass error)
    await writeFile(
      join(srcDir, 'seed.ts'),
      `const myStore: any = {}; myStore.save('id', {});\n`,
    );

    // Driver script for spec lint smoke test
    await writeFile(
      join(scratchDir, 'main-spec.ts'),
      `import { runLint } from 'mythik-cli/api';
const result = await runLint({ fromFile: './spec.json' });
console.log(JSON.stringify({
  hasRowLiteral: result.findings.some(f => f.ruleId === 'spec-row-literal'),
  summary: result.summary,
}));
`,
    );

    // Driver script for code lint smoke test
    await writeFile(
      join(scratchDir, 'main-code.ts'),
      `import { runLint } from 'mythik-cli/api';
const result = await runLint({ codeDir: './src', specsOnly: false, codeOnly: true });
console.log(JSON.stringify({
  hasBypass: result.findings.some(f => f.ruleId === 'code-store-save-bypass'),
  summary: result.summary,
}));
`,
    );

    execSync('pnpm install --no-frozen-lockfile', { cwd: scratchDir, stdio: 'pipe' });
  }, 180000);

  afterAll(async () => {
    if (scratchDir) await rm(scratchDir, { recursive: true, force: true });
    if (coreTarballPath) await rm(coreTarballPath, { force: true });
    if (cliTarballPath) await rm(cliTarballPath, { force: true });
  });

  it('imports runLint from mythik-cli/api and detects spec-row-literal in fixture spec', () => {
    const stdout = execSync('pnpm exec tsx main-spec.ts', {
      cwd: scratchDir,
      stdio: 'pipe',
      encoding: 'utf8',
    });
    const parsed = JSON.parse(stdout.trim());
    expect(parsed.hasRowLiteral).toBe(true);
    expect(parsed.summary.warnings).toBeGreaterThanOrEqual(1);
  });

  it('detects code-store-save-bypass via mythik-cli/api runLint', () => {
    const stdout = execSync('pnpm exec tsx main-code.ts', {
      cwd: scratchDir,
      stdio: 'pipe',
      encoding: 'utf8',
    });
    const parsed = JSON.parse(stdout.trim());
    expect(parsed.hasBypass).toBe(true);
    expect(parsed.summary.errors).toBeGreaterThanOrEqual(1);
  });
});
