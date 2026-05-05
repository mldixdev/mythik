import { describe, it, expect } from 'vitest';
import { runValidate } from '../../src/commands/validate.js';
import { MemorySpecStore } from 'mythik';

const validSpec = {
  root: 'page',
  elements: {
    page: { type: 'stack', props: {}, children: ['title'] },
    title: { type: 'text', props: { content: 'Hello' } },
  },
};

const invalidSpec = {
  root: 'page',
  elements: {
    page: { type: 'stack', props: {}, children: ['title', 'orphan-ref'] },
    title: { type: 'text', props: { content: 'Hello' } },
  },
};

describe('validate command', () => {
  it('returns valid for a correct spec', async () => {
    const store = new MemorySpecStore({ screen: validSpec as any });
    const result = await runValidate('screen', { store, json: false });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('✓');
    expect(result.output).toContain('2 elements');
  });

  it('returns errors for an invalid spec', async () => {
    const store = new MemorySpecStore({ screen: invalidSpec as any });
    const result = await runValidate('screen', { store, json: false });
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('✗');
  });

  it('returns JSON when json=true', async () => {
    const store = new MemorySpecStore({ screen: validSpec as any });
    const result = await runValidate('screen', { store, json: true });
    const parsed = JSON.parse(result.output);
    expect(parsed.valid).toBe(true);
    expect(parsed.elementCount).toBe(2);
    expect(result.exitCode).toBe(0);
  });

  it('returns error for non-existent screen', async () => {
    const store = new MemorySpecStore({ screen: validSpec as any });
    const result = await runValidate('nope', { store, json: false });
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('not found');
  });

  describe('ApiSpec lintWarnings (v49 Item I — defense-in-depth)', () => {
    it('surfaces api-spec lintWarnings in human output when valid', async () => {
      const cleanApiSpec = {
        type: 'api',
        auth: { authDomains: ['api.example.com:3000'] },  // only the warning, no error
        endpoints: {
          salas: { path: '/api/salas', crud: { table: 'salas', primaryKey: 'id' } },
        },
      };
      const store = new MemorySpecStore({ apispec: cleanApiSpec as any });
      const result = await runValidate('apispec', { store, json: false });
      expect(result.exitCode).toBe(0);  // valid, only warnings
      expect(result.output).toContain('lint warning');
      expect(result.output).toContain(':port');  // message text from spec-auth-domains-port
    });

    it('surfaces api-spec lintWarnings in JSON output', async () => {
      const cleanApiSpec = {
        type: 'api',
        auth: { authDomains: ['api.example.com:3000'] },
        endpoints: {
          salas: { path: '/api/salas', crud: { table: 'salas', primaryKey: 'id' } },
        },
      };
      const store = new MemorySpecStore({ apispec: cleanApiSpec as any });
      const result = await runValidate('apispec', { store, json: true });
      const parsed = JSON.parse(result.output);
      expect(parsed.valid).toBe(true);
      expect(Array.isArray(parsed.lintWarnings)).toBe(true);
      expect(parsed.lintWarnings.length).toBeGreaterThanOrEqual(1);
      expect(parsed.lintWarnings.some((w: any) => w.ruleId === 'spec-auth-domains-port')).toBe(true);
    });

    it('reports validateApiSpec errors as errors (separate from lintWarnings)', async () => {
      // Note: validateApiSpec validates SQL identifiers etc. as errors.
      // The crud-id collision is in the lintWarnings array, NOT errors.
      // For this test, use a doc with a hard error (missing crud.primaryKey would do).
      const brokenApiSpec = {
        type: 'api',
        endpoints: {
          test: { path: '/api/test' },  // missing query/handler/crud → hard error
        },
      };
      const store = new MemorySpecStore({ apispec: brokenApiSpec as any });
      const result = await runValidate('apispec', { store, json: false });
      expect(result.exitCode).toBe(1);
      expect(result.output).toContain('✗');
    });
  });
});
