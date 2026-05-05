import { describe, it, expect } from 'vitest';
import { validateApiSpec } from '../../src/security/api-spec-validator.js';

describe('spec-auth-domains-port lint rule', () => {
  it('warns when auth.authDomains entry has :port', () => {
    const spec = {
      auth: { authDomains: ['api.example.com:3000'] },
    };
    const result = validateApiSpec(spec);
    const lint = result.lintWarnings?.filter(w => w.ruleId === 'spec-auth-domains-port') ?? [];
    expect(lint).toHaveLength(1);
    expect(lint[0].message).toContain(':port');
    expect(lint[0].path).toBe('/auth/authDomains/0');
    expect(lint[0].suggestedFixes![0].patch).toMatchObject({
      op: 'replace',
      path: '/auth/authDomains/0',
      value: 'api.example.com',
    });
  });

  it('does not warn on hostname-only entry', () => {
    const spec = {
      auth: { authDomains: ['api.example.com'] },
    };
    const result = validateApiSpec(spec);
    const lint = result.lintWarnings?.filter(w => w.ruleId === 'spec-auth-domains-port') ?? [];
    expect(lint).toHaveLength(0);
  });

  it('warns on localhost:port', () => {
    const spec = {
      auth: { authDomains: ['localhost:8080'] },
    };
    const result = validateApiSpec(spec);
    const lint = result.lintWarnings?.filter(w => w.ruleId === 'spec-auth-domains-port') ?? [];
    expect(lint).toHaveLength(1);
  });

  it('does not warn on empty string entry (other validator handles)', () => {
    const spec = {
      auth: { authDomains: [''] },
    };
    const result = validateApiSpec(spec);
    const lint = result.lintWarnings?.filter(w => w.ruleId === 'spec-auth-domains-port') ?? [];
    expect(lint).toHaveLength(0);
  });

  it('emits one warning per offending entry with unique paths', () => {
    const spec = {
      auth: {
        authDomains: [
          'api1.example.com:3000',
          'api2.example.com:4000',
          'api3.example.com',
        ],
      },
    };
    const result = validateApiSpec(spec);
    const lint = result.lintWarnings?.filter(w => w.ruleId === 'spec-auth-domains-port') ?? [];
    expect(lint).toHaveLength(2);
    const paths = lint.map(w => w.path);
    expect(new Set(paths)).toEqual(new Set(['/auth/authDomains/0', '/auth/authDomains/1']));
  });
});
