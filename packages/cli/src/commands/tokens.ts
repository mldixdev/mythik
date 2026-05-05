import { resolveDeepTokens } from 'mythik';
import { formatSuccess, formatError, formatJson } from '../output.js';
import type { CommandResult } from './manifest.js';

export interface TokensResolveOptions {
  dna?: string;
  tokens?: string;
  json: boolean;
}

export async function runTokensResolve(options: TokensResolveOptions): Promise<CommandResult> {
  try {
    let tokens: Record<string, unknown> | undefined;

    if (options.dna) {
      const dna = JSON.parse(options.dna);
      tokens = { dna };
    } else if (options.tokens) {
      tokens = JSON.parse(options.tokens);
    }

    const resolved = resolveDeepTokens(tokens);

    // Remove modes and components for cleaner output
    const output = { ...resolved };
    delete output.modes;
    delete output.components;

    if (options.json) {
      return { output: formatJson(output), exitCode: 0 };
    }

    // Pretty print sections
    const lines: string[] = [];

    const colors = output.colors as Record<string, string>;
    lines.push(formatSuccess('Colors:'));
    for (const [k, v] of Object.entries(colors)) {
      lines.push(`  ${k}: ${v}`);
    }

    const shape = output.shape as { radius: Record<string, number> };
    lines.push('\n' + formatSuccess('Shape:'));
    for (const [k, v] of Object.entries(shape.radius)) {
      lines.push(`  radius.${k}: ${v}`);
    }

    const typo = output.typography as Record<string, unknown>;
    lines.push('\n' + formatSuccess('Typography:'));
    const families = typo.fontFamily as Record<string, string>;
    for (const [k, v] of Object.entries(families)) {
      lines.push(`  fontFamily.${k}: ${v}`);
    }
    const scale = typo.scale as Record<string, { fontSize: number; lineHeight: number }>;
    for (const [k, v] of Object.entries(scale)) {
      lines.push(`  scale.${k}: ${v.fontSize}/${v.lineHeight}`);
    }

    const spacing = output.spacing as { unit: number; scale: Record<string, number> };
    lines.push('\n' + formatSuccess('Spacing:'));
    lines.push(`  unit: ${spacing.unit}`);
    for (const [k, v] of Object.entries(spacing.scale)) {
      lines.push(`  scale.${k}: ${v}`);
    }

    const motion = output.motion as { duration: Record<string, number>; easing: Record<string, string> };
    lines.push('\n' + formatSuccess('Motion:'));
    for (const [k, v] of Object.entries(motion.duration)) {
      lines.push(`  duration.${k}: ${v}ms`);
    }
    for (const [k, v] of Object.entries(motion.easing)) {
      lines.push(`  easing.${k}: ${v}`);
    }

    return { output: lines.join('\n'), exitCode: 0 };
  } catch (err) {
    return { output: formatError({ what: 'Token resolution failed', why: (err as Error).message }), exitCode: 1 };
  }
}
