import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(dirname(packageRoot));
const targetRoot = join(packageRoot, 'docs');

const consumerSource = join(repoRoot, 'docs', 'consumer');
const wikiSource = join(repoRoot, 'docs', 'wiki', 'compiled');

await rm(targetRoot, { recursive: true, force: true });
await mkdir(join(targetRoot, 'consumer'), { recursive: true });
await mkdir(join(targetRoot, 'wiki'), { recursive: true });

await cp(consumerSource, join(targetRoot, 'consumer'), { recursive: true });
await cp(wikiSource, join(targetRoot, 'wiki', 'compiled'), { recursive: true });

await writeFile(
  join(targetRoot, 'llms.txt'),
  [
    '# Mythik AI documentation',
    '',
    'This directory is bundled with the npm package `mythik` so AI agents can read the framework contract after installation.',
    '',
    'Start here:',
    '- consumer/ai-context.md',
    '- consumer/ai-context-primitives.md',
    '- consumer/ai-context-runtime-semantics.md',
    '- consumer/reference-doc.md',
    '- wiki/compiled/README.md',
    '- wiki/compiled/_index.md',
    '',
    'Required edit loop for existing persisted specs:',
    '1. mythik manifest <spec-id>',
    '2. mythik elements <spec-id> <element-ids>',
    '3. mythik patch <spec-id> --from-file <patch.json>',
    '4. mythik validate <spec-id>',
    '',
  ].join('\n'),
);
