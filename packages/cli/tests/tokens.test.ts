import { describe, it, expect } from 'vitest';
import { runTokensResolve } from '../src/commands/tokens.js';

describe('tokens resolve', () => {
  it('resolves minimal DNA seed', async () => {
    const result = await runTokensResolve({
      dna: '{"primary":"#0D9488"}',
      json: true,
    });
    const parsed = JSON.parse(result.output);
    expect(parsed.colors.primary).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(parsed.shape.radius.md).toBeGreaterThan(0);
    expect(result.exitCode).toBe(0);
  });

  it('resolves full DNA seed', async () => {
    const result = await runTokensResolve({
      dna: '{"primary":"#0D9488","roundness":0.9,"motion":"snappy"}',
      json: true,
    });
    const parsed = JSON.parse(result.output);
    expect(parsed.shape.radius.md).toBeGreaterThan(12);
    expect(parsed.motion.duration.fast).toBe(100);
  });

  it('returns defaults when no DNA', async () => {
    const result = await runTokensResolve({ json: true });
    const parsed = JSON.parse(result.output);
    expect(parsed.colors.primary).toBe('#6366f1');
  });

  it('returns human-readable output by default', async () => {
    const result = await runTokensResolve({
      dna: '{"primary":"#0D9488"}',
      json: false,
    });
    expect(result.output).toContain('Colors:');
    expect(result.output).toContain('Shape:');
    expect(result.output).toContain('Typography:');
    expect(result.output).toContain('radius.');
  });

  it('returns error for invalid JSON', async () => {
    const result = await runTokensResolve({ dna: 'not-json', json: true });
    expect(result.exitCode).toBe(1);
  });

  it('accepts full tokens object', async () => {
    const result = await runTokensResolve({
      tokens: '{"colors":{"primary":"#FF0000"},"shape":{"radius":{"md":99}}}',
      json: true,
    });
    const parsed = JSON.parse(result.output);
    expect(parsed.colors.primary).toBe('#FF0000');
    expect(parsed.shape.radius.md).toBe(99);
  });
});
