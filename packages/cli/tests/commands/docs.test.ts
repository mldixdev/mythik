import { mkdtemp, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, parse } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { runDocsCommand } from '../../src/commands/docs.js';

async function createBundledDocsFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'mythik-docs-fixture-'));
  await mkdir(join(root, 'consumer'), { recursive: true });
  await mkdir(join(root, 'wiki', 'compiled'), { recursive: true });
  await writeFile(join(root, 'consumer', 'ai-context.md'), '# AI context\n');
  await writeFile(join(root, 'wiki', 'compiled', 'README.md'), '# Wiki\n');
  await writeFile(join(root, 'llms.txt'), 'Mythik docs entrypoint\n');
  return root;
}

describe('docs command', () => {
  it('returns the bundled documentation path for AI agent onboarding', async () => {
    const docsRoot = await createBundledDocsFixture();

    const result = await runDocsCommand({ action: 'path', docsRoot });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain(docsRoot);
    expect(result.output).toContain('consumer/ai-context.md');
    expect(result.output).toContain('wiki/compiled/README.md');
    expect(result.output).toContain('llms.txt');
  });

  it('returns machine-readable docs paths as JSON', async () => {
    const docsRoot = await createBundledDocsFixture();

    const result = await runDocsCommand({ action: 'path', docsRoot, json: true });
    const payload = JSON.parse(result.output) as Record<string, string>;

    expect(result.exitCode).toBe(0);
    expect(payload.docsPath).toBe(docsRoot);
    expect(payload.llmsTxt).toBe(join(docsRoot, 'llms.txt'));
    expect(payload.aiContext).toBe(join(docsRoot, 'consumer', 'ai-context.md'));
    expect(payload.wikiReadme).toBe(join(docsRoot, 'wiki', 'compiled', 'README.md'));
  });

  it('copies bundled documentation into a target folder', async () => {
    const docsRoot = await createBundledDocsFixture();
    const targetParent = await mkdtemp(join(tmpdir(), 'mythik-docs-copy-'));
    const target = join(targetParent, 'mythik-docs');

    const result = await runDocsCommand({ action: 'copy', target, docsRoot });

    expect(result.exitCode).toBe(0);
    await expect(stat(join(target, 'consumer', 'ai-context.md'))).resolves.toBeTruthy();
    await expect(stat(join(target, 'wiki', 'compiled', 'README.md'))).resolves.toBeTruthy();
    await expect(readFile(join(target, 'llms.txt'), 'utf8')).resolves.toContain('Mythik docs');
  });

  it('replaces a non-empty target when force is enabled', async () => {
    const docsRoot = await createBundledDocsFixture();
    const target = await mkdtemp(join(tmpdir(), 'mythik-docs-force-'));
    await writeFile(join(target, 'old.txt'), 'old');

    const result = await runDocsCommand({ action: 'copy', target, docsRoot, force: true });

    expect(result.exitCode).toBe(0);
    await expect(stat(join(target, 'consumer', 'ai-context.md'))).resolves.toBeTruthy();
    await expect(stat(join(target, 'old.txt'))).rejects.toThrow();
  });

  it('returns machine-readable copy paths as JSON', async () => {
    const docsRoot = await createBundledDocsFixture();
    const targetParent = await mkdtemp(join(tmpdir(), 'mythik-docs-copy-json-'));
    const target = join(targetParent, 'mythik-docs');

    const result = await runDocsCommand({ action: 'copy', target, docsRoot, json: true });
    const payload = JSON.parse(result.output) as Record<string, string>;

    expect(result.exitCode).toBe(0);
    expect(payload.copiedTo).toBe(target);
    expect(payload.docsPath).toBe(target);
    expect(payload.llmsTxt).toBe(join(target, 'llms.txt'));
  });

  it('refuses to overwrite a non-empty target without force', async () => {
    const docsRoot = await createBundledDocsFixture();
    const target = await mkdtemp(join(tmpdir(), 'mythik-docs-existing-'));
    await writeFile(join(target, 'keep.txt'), 'existing');

    const result = await runDocsCommand({ action: 'copy', target, docsRoot });

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('already exists');
  });

  it('refuses to copy without a target directory', async () => {
    const docsRoot = await createBundledDocsFixture();

    const result = await runDocsCommand({ action: 'copy', docsRoot });

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('Missing target directory');
  });

  it('refuses unknown docs actions', async () => {
    const docsRoot = await createBundledDocsFixture();

    const result = await runDocsCommand({ action: 'garbage', docsRoot });

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('Unknown docs action');
  });

  it('refuses to force-copy over the bundled docs root', async () => {
    const docsRoot = await createBundledDocsFixture();

    const result = await runDocsCommand({ action: 'copy', target: docsRoot, docsRoot, force: true });

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('Refusing to copy Mythik docs');
    await expect(stat(join(docsRoot, 'llms.txt'))).resolves.toBeTruthy();
  });

  it('refuses to force-copy inside the bundled docs root', async () => {
    const docsRoot = await createBundledDocsFixture();

    const result = await runDocsCommand({
      action: 'copy',
      target: join(docsRoot, 'nested-copy'),
      docsRoot,
      force: true,
    });

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('Refusing to copy Mythik docs');
    await expect(stat(join(docsRoot, 'llms.txt'))).resolves.toBeTruthy();
  });

  it('refuses to force-copy over the current working directory', async () => {
    const docsRoot = await createBundledDocsFixture();
    const cwd = await mkdtemp(join(tmpdir(), 'mythik-docs-cwd-'));
    await writeFile(join(cwd, 'keep.txt'), 'existing');

    const result = await runDocsCommand({ action: 'copy', target: '.', cwd, docsRoot, force: true });

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('current working directory');
    await expect(stat(join(cwd, 'keep.txt'))).resolves.toBeTruthy();
  });

  it('refuses to force-copy over a filesystem root', async () => {
    const docsRoot = await createBundledDocsFixture();
    const root = parse(docsRoot).root;

    const result = await runDocsCommand({ action: 'copy', target: root, docsRoot, force: true });

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('filesystem root');
  });
});
