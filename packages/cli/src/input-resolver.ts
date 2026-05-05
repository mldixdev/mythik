import { readFile } from 'node:fs/promises';

export interface ResolveInputOptions {
  /** `--from-file <path>` flag value. `-` means stdin. */
  fromFile?: string;
  /** Positional argument (patch command only — passes raw JSON inline). */
  positional?: string;
  /** Stream to read from when fromFile is `-` or unset. Inject for testability. */
  stdin: NodeJS.ReadableStream;
  /** Whether stdin is a TTY (no piped input). Inject for testability. */
  stdinIsTTY: boolean;
}

/**
 * Resolves command input from one of the three approved sources:
 * - `--from-file <path>` (cross-shell ergonomics)
 * - `--from-file -` (stdin alias)
 * - Stdin pipe / positional argument (legacy paths)
 *
 * Explicit sources win over ambient stdin. This avoids false conflicts in
 * shells/agents where stdin is non-TTY even when no pipe was intended.
 * Use `--from-file -` or omit explicit sources to read stdin.
 */
export async function resolveInput(opts: ResolveInputOptions): Promise<string> {
  // Non-TTY stdin implies piped/redirected input. Actual emptiness is detected
  // later when the stream yields no chunks.
  const stdinHasContent = !opts.stdinIsTTY;
  const sources: string[] = [];
  if (opts.fromFile !== undefined) sources.push('--from-file');
  if (opts.positional !== undefined) sources.push('positional argument');

  if (sources.length > 1) {
    throw new Error(
      `Conflicting input sources: ${sources.join(', ')}. Use ONE of: --from-file <path>, stdin pipe, or positional argument.`,
    );
  }

  if (opts.fromFile !== undefined) {
    if (opts.fromFile === '-') {
      return readStream(opts.stdin);
    }
    try {
      const content = await readFile(opts.fromFile, 'utf-8');
      return content.trim();
    } catch (err) {
      throw new Error(`Could not read file "${opts.fromFile}": ${(err as Error).message}`);
    }
  }

  if (opts.positional !== undefined) {
    return opts.positional;
  }

  if (stdinHasContent) {
    return readStream(opts.stdin);
  }

  throw new Error('No input. Provide --from-file <path>, pipe stdin, or pass an argument.');
}

async function readStream(stream: NodeJS.ReadableStream): Promise<string> {
  // Stream may emit string OR Buffer chunks depending on the producer:
  // - process.stdin → Buffer chunks (production CLI path)
  // - Readable.from([strings]) → string chunks (test injections)
  // Both paths active by design; do not reduce to Buffer-only without breaking tests.
  const parts: string[] = [];
  for await (const chunk of stream) {
    parts.push(typeof chunk === 'string' ? chunk : (chunk as Buffer).toString('utf-8'));
  }
  return parts.join('').trim();
}
