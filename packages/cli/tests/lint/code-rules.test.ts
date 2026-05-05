import { describe, it, expect, beforeAll } from 'vitest';
import { loadTypeScript, scanCodeFile } from '../../src/lint/code-rules.js';

let ts: typeof import('typescript');

beforeAll(async () => {
  const loaded = await loadTypeScript();
  if (!loaded) throw new Error('TS not available in test env');
  ts = loaded;
});

describe('code-store-save-bypass lint rule', () => {
  it('errors on store.save() in consumer src/ file', () => {
    const content = `
      import { runPush } from 'mythik-cli/api';
      const store: any = {};
      store.save('id', { foo: 'bar' });
    `;
    const findings = scanCodeFile('apps/consumer/src/seed.ts', content, ts);
    const errors = findings.filter(f => f.ruleId === 'code-store-save-bypass');
    expect(errors).toHaveLength(1);
    expect(errors[0].severity).toBe('error');
    expect(errors[0].location.line).toBeGreaterThan(0);
    expect(errors[0].location.column).toBeGreaterThanOrEqual(0);
    expect(errors[0].suggestedFix?.type).toBe('code-snippet');
  });

  it('does not error on store.save() inside packages/core/', () => {
    const content = `const store: any = {}; store.save('id', {});`;
    const findings = scanCodeFile('packages/core/src/spec-engine/foo.ts', content, ts);
    const errors = findings.filter(f => f.ruleId === 'code-store-save-bypass');
    expect(errors).toHaveLength(0);
  });

  it('does not error on store.save() inside packages/cli/', () => {
    const content = `const store: any = {}; store.save('id', {});`;
    const findings = scanCodeFile('packages/cli/src/commands/bar.ts', content, ts);
    const errors = findings.filter(f => f.ruleId === 'code-store-save-bypass');
    expect(errors).toHaveLength(0);
  });

  it('matches identifier *Store case-insensitive (myStore.save())', () => {
    const content = `const myStore: any = {}; myStore.save('id', {});`;
    const findings = scanCodeFile('apps/x/src/main.ts', content, ts);
    const errors = findings.filter(f => f.ruleId === 'code-store-save-bypass');
    expect(errors).toHaveLength(1);
  });

  it('does not match non-store identifiers (someObj.save())', () => {
    const content = `const someObj: any = {}; someObj.save();`;
    const findings = scanCodeFile('apps/x/src/main.ts', content, ts);
    const errors = findings.filter(f => f.ruleId === 'code-store-save-bypass');
    expect(errors).toHaveLength(0);
  });

  it('ignores store.save() inside comments', () => {
    const content = `// store.save('id', {});\n/* store.save('id', {}); */\n`;
    const findings = scanCodeFile('apps/x/src/main.ts', content, ts);
    const errors = findings.filter(f => f.ruleId === 'code-store-save-bypass');
    expect(errors).toHaveLength(0);
  });

  it('ignores store.save text inside string literals', () => {
    const content = `const x = "store.save('id', {})";`;
    const findings = scanCodeFile('apps/x/src/main.ts', content, ts);
    const errors = findings.filter(f => f.ruleId === 'code-store-save-bypass');
    expect(errors).toHaveLength(0);
  });
});
