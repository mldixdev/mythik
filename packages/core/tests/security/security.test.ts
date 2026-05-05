import { describe, it, expect } from 'vitest';
import { validateSpec } from '../../src/security/spec-validator.js';
import { createUrlGuard } from '../../src/security/url-whitelist.js';
import { createStateGuard } from '../../src/security/state-protection.js';
import { createRateLimiter } from '../../src/security/rate-limiter.js';
import { createPrimitiveRegistry } from '../../src/renderer/registry.js';
import type { RenderNode } from '../../src/types.js';
import { createSpecSigner } from '../../src/security/spec-signing.js';

describe('Security: Spec Validator', () => {
  it('accepts valid spec', () => {
    const result = validateSpec({
      root: 'main',
      elements: { main: { type: 'text', props: { content: 'Hello' } } },
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects non-object', () => {
    expect(validateSpec(null).valid).toBe(false);
    expect(validateSpec('string').valid).toBe(false);
  });

  it('rejects missing root', () => {
    const result = validateSpec({ elements: {} });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain('root');
  });

  it('rejects missing elements', () => {
    const result = validateSpec({ root: 'main' });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain('elements');
  });

  it('rejects root not found in elements', () => {
    const result = validateSpec({ root: 'missing', elements: { other: { type: 'text' } } });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain('not found');
  });

  it('rejects element without type', () => {
    const result = validateSpec({ root: 'main', elements: { main: { props: {} } } });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain('type');
  });

  it('rejects non-array children', () => {
    const result = validateSpec({ root: 'main', elements: { main: { type: 'box', children: 'invalid' } } });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain('array');
  });

  it('rejects child not found in elements', () => {
    const result = validateSpec({
      root: 'main',
      elements: { main: { type: 'box', children: ['missing'] } },
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain('missing');
  });

  it('detects circular references', () => {
    const result = validateSpec({
      root: 'a',
      elements: {
        a: { type: 'box', children: ['b'] },
        b: { type: 'box', children: ['a'] },
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('Circular'))).toBe(true);
  });
});

describe('editorSessions validation', () => {
  it('accepts editorSessions with explicit tracked paths', () => {
    const result = validateSpec({
      root: 'root',
      editorSessions: {
        'floor-layout': {
          paths: ['/layout/items', '/layout/zones'],
          maxHistory: 100,
        },
      },
      elements: { root: { type: 'box' } },
    } as any);

    expect(result.errors.filter((error) => error.path?.startsWith('/editorSessions'))).toEqual([]);
  });

  it('rejects editorSessions without tracked paths', () => {
    const result = validateSpec({
      root: 'root',
      editorSessions: { empty: { paths: [] } },
      elements: { root: { type: 'box' } },
    } as any);

    expect(result.errors.some((error) =>
      error.path === '/editorSessions/empty/paths'
      && error.message.includes('requires at least one path'),
    )).toBe(true);
  });

  it('rejects editorSession paths outside JSON Pointer syntax', () => {
    const result = validateSpec({
      root: 'root',
      editorSessions: { bad: { paths: ['layout/items'] } },
      elements: { root: { type: 'box' } },
    } as any);

    expect(result.errors.some((error) =>
      error.path === '/editorSessions/bad/paths/0'
      && error.message.includes('must start with "/"'),
    )).toBe(true);
  });

  it('accepts editor session persistence and editorSave', () => {
    const result = validateSpec({
      root: 'save',
      editorSessions: {
        editor: {
          paths: ['/layout/items'],
          persistence: { url: '/api/layout', method: 'PUT' },
        },
      },
      elements: {
        save: {
          type: 'button',
          props: { label: 'Save' },
          on: { press: { action: 'editorSave', params: { session: 'editor' } } },
        },
      },
    } as any);

    expect(result.valid).toBe(true);
  });

  it('rejects editorSave without a session', () => {
    const result = validateSpec({
      root: 'save',
      elements: {
        save: { type: 'button', on: { press: { action: 'editorSave', params: {} } } },
      },
    } as any);

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.message.includes('editorSave'))).toBe(true);
  });

  it('rejects editorSave for an unknown editor session', () => {
    const result = validateSpec({
      root: 'save',
      editorSessions: {
        editor: { paths: ['/layout/items'], persistence: { url: '/api/layout' } },
      },
      elements: {
        save: { type: 'button', on: { press: { action: 'editorSave', params: { session: 'missing' } } } },
      },
    } as any);

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.message.includes('unknown editor session'))).toBe(true);
  });

  it('rejects editorSave when no persistence config or url override exists', () => {
    const result = validateSpec({
      root: 'save',
      editorSessions: {
        editor: { paths: ['/layout/items'] },
      },
      elements: {
        save: { type: 'button', on: { press: { action: 'editorSave', params: { session: 'editor' } } } },
      },
    } as any);

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.message.includes('persistence'))).toBe(true);
  });

  it('accepts editorSave with a per-call url override', () => {
    const result = validateSpec({
      root: 'save',
      editorSessions: {
        editor: { paths: ['/layout/items'] },
      },
      elements: {
        save: {
          type: 'button',
          on: { press: { action: 'editorSave', params: { session: 'editor', url: '/api/layout' } } },
        },
      },
    } as any);

    expect(result.valid).toBe(true);
  });

  it('rejects invalid editor session persistence config', () => {
    const result = validateSpec({
      root: 'save',
      editorSessions: {
        editor: {
          paths: ['/layout/items'],
          persistence: { url: '/api/layout', method: 'GET', body: 'bad-mode' },
        },
      },
      elements: {
        save: { type: 'button', on: { press: { action: 'editorSave', params: { session: 'editor' } } } },
      },
    } as any);

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.message.includes('method'))).toBe(true);
    expect(result.errors.some((error) => error.message.includes('body'))).toBe(true);
  });
});

describe('Security: URL Whitelist', () => {
  it('allows all when no whitelist configured', () => {
    const guard = createUrlGuard();
    expect(guard.isAllowed('https://evil.com')).toBe(true);
  });

  it('allows whitelisted domain', () => {
    const guard = createUrlGuard(['api.myapp.com']);
    expect(guard.isAllowed('https://api.myapp.com/v1/users')).toBe(true);
  });

  it('blocks non-whitelisted domain', () => {
    const guard = createUrlGuard(['api.myapp.com']);
    expect(guard.isAllowed('https://evil.com/steal')).toBe(false);
  });

  it('allows subdomains', () => {
    const guard = createUrlGuard(['supabase.co']);
    expect(guard.isAllowed('https://myproject.supabase.co/rest/v1/data')).toBe(true);
  });

  it('allows relative URLs', () => {
    const guard = createUrlGuard(['api.myapp.com']);
    expect(guard.isAllowed('/api/users')).toBe(true);
    expect(guard.isAllowed('api/data')).toBe(true);
  });

  it('blocks invalid URLs', () => {
    const guard = createUrlGuard(['api.myapp.com']);
    expect(guard.isAllowed('http://[invalid')).toBe(false);
  });

  it('assertAllowed throws for blocked URL', () => {
    const guard = createUrlGuard(['safe.com']);
    expect(() => guard.assertAllowed('https://evil.com')).toThrow('Fetch blocked');
  });
});

describe('Security: State Protection', () => {
  it('allows all when no protection configured', () => {
    const guard = createStateGuard();
    expect(guard.canWrite('/auth/token')).toBe(true);
  });

  it('blocks writing to protected exact path', () => {
    const guard = createStateGuard(['/auth/token']);
    expect(guard.canWrite('/auth/token')).toBe(false);
    expect(guard.canWrite('/form/name')).toBe(true);
  });

  it('blocks writing to protected wildcard path', () => {
    const guard = createStateGuard(['/auth/*']);
    expect(guard.canWrite('/auth/token')).toBe(false);
    expect(guard.canWrite('/auth/role')).toBe(false);
    expect(guard.canWrite('/auth')).toBe(false);
    expect(guard.canWrite('/form/name')).toBe(true);
  });

  it('supports multiple patterns', () => {
    const guard = createStateGuard(['/auth/*', '/session/*', '/config/apiKey']);
    expect(guard.canWrite('/auth/token')).toBe(false);
    expect(guard.canWrite('/session/id')).toBe(false);
    expect(guard.canWrite('/config/apiKey')).toBe(false);
    expect(guard.canWrite('/config/theme')).toBe(true);
    expect(guard.canWrite('/user/name')).toBe(true);
  });

  it('assertCanWrite throws for protected path', () => {
    const guard = createStateGuard(['/auth/*']);
    expect(() => guard.assertCanWrite('/auth/token')).toThrow('protected path');
  });
});

describe('Security: Rate Limiter', () => {
  it('allows actions under limit', () => {
    const limiter = createRateLimiter({ maxActionsPerSecond: 10 });
    for (let i = 0; i < 10; i++) {
      expect(limiter.check()).toBe(true);
    }
  });

  it('blocks actions over limit', () => {
    const limiter = createRateLimiter({ maxActionsPerSecond: 5 });
    for (let i = 0; i < 5; i++) limiter.check();
    expect(limiter.check()).toBe(false);
  });

  it('assertAllowed throws over limit', () => {
    const limiter = createRateLimiter({ maxActionsPerSecond: 3 });
    limiter.check(); limiter.check(); limiter.check();
    expect(() => limiter.assertAllowed()).toThrow('Rate limit exceeded');
  });

  it('reset clears count', () => {
    const limiter = createRateLimiter({ maxActionsPerSecond: 3 });
    limiter.check(); limiter.check(); limiter.check();
    limiter.reset();
    expect(limiter.check()).toBe(true);
  });

  it('getCount returns current count', () => {
    const limiter = createRateLimiter({ maxActionsPerSecond: 100 });
    limiter.check(); limiter.check();
    expect(limiter.getCount()).toBe(2);
  });
});

describe('Security: Spec Signing', () => {
  it('disabled signer always verifies', async () => {
    const signer = createSpecSigner({ enabled: false });
    expect(signer.isEnabled()).toBe(false);
    expect(await signer.verify({ any: 'data' }, 'any-signature')).toBe(true);
  });

  it('signs and verifies spec', async () => {
    const signer = createSpecSigner({ enabled: true, secret: 'test-secret' });
    expect(signer.isEnabled()).toBe(true);

    const spec = { root: 'main', elements: { main: { type: 'text' } } };
    const signature = await signer.sign(spec);
    expect(signature.length).toBeGreaterThan(0);
    expect(await signer.verify(spec, signature)).toBe(true);
  });

  it('detects tampered spec', async () => {
    const signer = createSpecSigner({ enabled: true, secret: 'test-secret' });

    const spec = { root: 'main', elements: { main: { type: 'text' } } };
    const signature = await signer.sign(spec);

    const tampered = { root: 'main', elements: { main: { type: 'hacked' } } };
    expect(await signer.verify(tampered, signature)).toBe(false);
  });

  it('different secrets produce different signatures', async () => {
    const signer1 = createSpecSigner({ enabled: true, secret: 'secret-1' });
    const signer2 = createSpecSigner({ enabled: true, secret: 'secret-2' });

    const spec = { root: 'main', elements: {} };
    const sig1 = await signer1.sign(spec);
    const sig2 = await signer2.sign(spec);
    expect(sig1).not.toBe(sig2);
  });
});

describe('Security: Transaction Validation', () => {
  it('accepts valid transaction binding', () => {
    const result = validateSpec({
      root: 'btn',
      elements: {
        btn: {
          type: 'button',
          on: {
            press: {
              transaction: {
                confirm: [{ action: 'fetch', params: { url: 'https://api.test/x' } }],
              },
            },
          },
        },
      },
    });
    expect(result.valid).toBe(true);
  });

  it('accepts full transaction with all phases', () => {
    const result = validateSpec({
      root: 'btn',
      elements: {
        btn: {
          type: 'button',
          on: {
            press: {
              transaction: {
                before: [{ action: 'closeModal', params: { id: 'x' } }],
                optimistic: [{ action: 'setState', params: { statePath: '/x', value: 1 } }],
                confirm: [{ action: 'fetch', params: { url: 'https://api.test/x' } }],
                onSuccess: [{ action: 'fetch', params: { url: 'https://api.test/x' } }],
                onError: [{ action: 'showNotification', params: { message: 'Error' } }],
                timeout: 5000,
              },
            },
          },
        },
      },
    });
    expect(result.valid).toBe(true);
  });

  it('rejects transaction without confirm', () => {
    const result = validateSpec({
      root: 'btn',
      elements: {
        btn: {
          type: 'button',
          on: {
            press: {
              transaction: {
                optimistic: [{ action: 'setState', params: { statePath: '/x', value: 1 } }],
              },
            },
          },
        },
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain('confirm');
  });

  it('rejects nested transaction', () => {
    const result = validateSpec({
      root: 'btn',
      elements: {
        btn: {
          type: 'button',
          on: {
            press: {
              transaction: {
                confirm: [{ action: 'fetch', params: { url: 'https://api.test/x' } }],
                onSuccess: [{
                  transaction: {
                    confirm: [{ action: 'fetch', params: { url: 'https://api.test/y' } }],
                  },
                }],
              },
            },
          },
        },
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain('nested');
  });

  it('rejects invalid timeout', () => {
    const result = validateSpec({
      root: 'btn',
      elements: {
        btn: {
          type: 'button',
          on: {
            press: {
              transaction: {
                confirm: [{ action: 'fetch', params: { url: 'https://api.test/x' } }],
                timeout: -1,
              },
            },
          },
        },
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain('timeout');
  });

  it('rejects non-array phase', () => {
    const result = validateSpec({
      root: 'btn',
      elements: {
        btn: {
          type: 'button',
          on: {
            press: {
              transaction: {
                confirm: [{ action: 'fetch', params: { url: 'https://api.test/x' } }],
                before: 'invalid',
              },
            },
          },
        },
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain('before');
  });
});

describe('Security: $switch Validation', () => {
  it('rejects $switch without cases', () => {
    const result = validateSpec({
      root: 'main',
      elements: { main: { type: 'text', props: { content: { $switch: '/status', default: 'unknown' } } } },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('$switch'))).toBe(true);
  });

  it('accepts valid $switch with cases and default', () => {
    const result = validateSpec({
      root: 'main',
      elements: {
        main: {
          type: 'text',
          props: {
            content: { $switch: '/status', cases: { active: 'Active', inactive: 'Inactive' }, default: 'Unknown' },
          },
        },
      },
    });
    expect(result.valid).toBe(true);
  });
});

describe('Security: dataSources Validation', () => {
  it('rejects dataSource without url', () => {
    const result = validateSpec({
      root: 'main',
      elements: { main: { type: 'text', props: { content: 'hi' } } },
      dataSources: { users: { target: '/users' } },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('url'))).toBe(true);
  });

  it('rejects dataSource without target', () => {
    const result = validateSpec({
      root: 'main',
      elements: { main: { type: 'text', props: { content: 'hi' } } },
      dataSources: { users: { url: 'https://api.test/users' } },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('target'))).toBe(true);
  });

  it('accepts valid dataSource with url and target', () => {
    const result = validateSpec({
      root: 'main',
      elements: { main: { type: 'text', props: { content: 'hi' } } },
      dataSources: { users: { url: 'https://api.test/users', target: '/users' } },
    });
    expect(result.valid).toBe(true);
  });
});

describe('Security: templates Validation', () => {
  it('rejects template without type', () => {
    const result = validateSpec({
      root: 'main',
      elements: { main: { type: 'text', props: { content: 'hi' } } },
      templates: { card: { props: { title: 'Test' } } },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('template'))).toBe(true);
  });

  it('accepts valid template with type', () => {
    const result = validateSpec({
      root: 'main',
      elements: { main: { type: 'text', props: { content: 'hi' } } },
      templates: { card: { type: 'box', props: { title: 'Test' } } },
    });
    expect(result.valid).toBe(true);
  });
});

describe('Deep Validation with Context', () => {
  const r = (p: Record<string, unknown>, c: RenderNode[]) => ({ type: 'x', props: p, children: c });
  function createContext() {
    const primitiveRegistry = createPrimitiveRegistry();
    for (const t of ['box', 'text', 'button', 'icon', 'input', 'stack', 'modal', 'touchable', 'checkbox', 'table']) {
      primitiveRegistry.register(t, r);
    }
    return { primitiveRegistry };
  }

  it('accepts spec with known primitive types', () => {
    const result = validateSpec({
      root: 'main',
      elements: { main: { type: 'box', children: ['t'] }, t: { type: 'text', props: { content: 'hi' } } },
    }, createContext());
    expect(result.valid).toBe(true);
  });

  it('rejects unknown primitive type', () => {
    const result = validateSpec({
      root: 'main',
      elements: { main: { type: 'nonexistent', props: {} } },
    }, createContext());
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain('nonexistent');
    expect(result.errors[0].message).toContain('unknown');
  });

  describe('expression validation', () => {
    it('rejects $array without source', () => {
      const result = validateSpec({
        root: 'main',
        elements: { main: { type: 'text', props: { content: { $array: 'count' } } } },
      }, createContext());
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('$array') && e.message.includes('source'))).toBe(true);
    });

    it('rejects $array replace without value', () => {
      const result = validateSpec({
        root: 'main',
        elements: {
          main: {
            type: 'text',
            props: {
              content: { $array: 'replace', source: { $state: '/items' }, where: { field: 'id', eq: 1 }, item: { name: 'wrong' } },
            },
          },
        },
      }, createContext());
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('value'))).toBe(true);
    });

    it('rejects $math add without args', () => {
      const result = validateSpec({
        root: 'main',
        elements: { main: { type: 'text', props: { content: { $math: 'add' } } } },
      }, createContext());
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('$math') && e.message.includes('args'))).toBe(true);
    });

    it('rejects $cond without $then', () => {
      const result = validateSpec({
        root: 'main',
        elements: { main: { type: 'text', props: { content: { $cond: true, $else: 'no' } } } },
      }, createContext());
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('$then'))).toBe(true);
    });

    it('rejects $format without value', () => {
      const result = validateSpec({
        root: 'main',
        elements: { main: { type: 'text', props: { content: { $format: 'currency' } } } },
      }, createContext());
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('value'))).toBe(true);
    });

    it('rejects $let without $in', () => {
      const result = validateSpec({
        root: 'main',
        elements: { main: { type: 'text', props: { content: { $let: { x: 1 } } } } },
      }, createContext());
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('$in'))).toBe(true);
    });

    it('accepts valid expressions', () => {
      const result = validateSpec({
        root: 'main',
        elements: {
          main: {
            type: 'text',
            props: {
              content: { $state: '/name' },
              style: { color: { $cond: { $state: '/x' }, $then: 'green', $else: 'red' } },
            },
          },
        },
      }, createContext());
      expect(result.valid).toBe(true);
    });

    it('validates expressions in style', () => {
      const result = validateSpec({
        root: 'main',
        elements: { main: { type: 'box', style: { width: { $math: 'multiply' } } } },
      }, createContext());
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('$math'))).toBe(true);
    });
  });

  describe('action validation', () => {
    it('rejects setState without statePath', () => {
      const result = validateSpec({
        root: 'btn',
        elements: { btn: { type: 'button', on: { press: { action: 'setState', params: { value: 'x' } } } } },
      }, createContext());
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('statePath'))).toBe(true);
    });

    it('rejects fetch without url', () => {
      const result = validateSpec({
        root: 'btn',
        elements: { btn: { type: 'button', on: { press: { action: 'fetch', params: { method: 'GET' } } } } },
      }, createContext());
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('url'))).toBe(true);
    });

    it('rejects editorCommit without session or changes params', () => {
      const result = validateSpec({
        root: 'root',
        elements: {
          root: {
            type: 'button',
            props: { label: 'Commit' },
            on: { press: { action: 'editorCommit', params: { session: 'editor' } } },
          },
        },
      }, createContext());

      expect(result.errors.some((error) => error.message.includes('editorCommit') && error.message.includes('changes'))).toBe(true);
    });

    it('rejects editorUndo without session param', () => {
      const result = validateSpec({
        root: 'root',
        elements: {
          root: {
            type: 'button',
            props: { label: 'Undo' },
            on: { press: { action: 'editorUndo', params: {} } },
          },
        },
      }, createContext());

      expect(result.errors.some((error) => error.message.includes('editorUndo') && error.message.includes('session'))).toBe(true);
    });

    it('accepts valid action binding', () => {
      const result = validateSpec({
        root: 'btn',
        elements: { btn: { type: 'button', on: { press: { action: 'setState', params: { statePath: '/x', value: 1 } } } } },
      }, createContext());
      expect(result.valid).toBe(true);
    });

    it('rejects non-string $state paths inside action params', () => {
      const result = validateSpec({
        root: 'btn',
        elements: {
          btn: {
            type: 'button',
            on: {
              press: {
                action: 'setState',
                params: {
                  statePath: '/selected',
                  value: { id: { $state: { $state: '/ui/item/id' } } },
                },
              },
            },
          },
        },
      }, createContext());

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('$state') && e.message.includes('string path'))).toBe(true);
    });

    it('validates expressions inside custom action params', () => {
      const result = validateSpec({
        root: 'btn',
        elements: {
          btn: {
            type: 'button',
            on: {
              press: {
                action: 'customAction',
                params: {
                  payload: { $state: { $state: '/ui/item' } },
                },
              },
            },
          },
        },
      }, createContext());

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('$state') && e.message.includes('string path'))).toBe(true);
    });

    it('validates actions inside transaction phases', () => {
      const result = validateSpec({
        root: 'btn',
        elements: {
          btn: {
            type: 'button',
            on: {
              press: {
                transaction: {
                  confirm: [{ action: 'fetch', params: { method: 'POST' } }],
                },
              },
            },
          },
        },
      }, createContext());
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('url'))).toBe(true);
    });
  });

  describe('$selection validation', () => {
    it('accepts valid $selection expression', () => {
      const result = validateSpec({
        root: 'list',
        elements: {
          list: { type: 'stack', children: ['check'] },
          check: { type: 'checkbox', props: { value: { $selection: 'selected' } } },
        },
      }, createContext());
      expect(result.valid).toBe(true);
    });
  });

  describe('table enhanced validation', () => {
    it('rejects server-side sorting without state path', () => {
      const result = validateSpec({
        root: 'tbl',
        elements: {
          tbl: { type: 'table', props: { sorting: { enabled: true, mode: 'server' } } },
        },
      }, createContext());
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('sorting.mode "server" requires "state"'))).toBe(true);
    });

    it('accepts server-side sorting with state path', () => {
      const result = validateSpec({
        root: 'tbl',
        elements: {
          tbl: { type: 'table', props: { sorting: { enabled: true, mode: 'server', state: '/sort' } } },
        },
      }, createContext());
      expect(result.valid).toBe(true);
    });

    it('rejects server-side pagination without state path', () => {
      const result = validateSpec({
        root: 'tbl',
        elements: {
          tbl: { type: 'table', props: { pagination: { enabled: true, mode: 'server' } } },
        },
      }, createContext());
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('pagination.mode "server" requires "state"'))).toBe(true);
    });
  });

  describe('CSS hover on unsupported primitives', () => {
    function createContextWithCssHover() {
      const ctx = createContext();
      return { ...ctx, cssHoverTypes: new Set(['box', 'text', 'stack', 'grid', 'button', 'touchable', 'table', 'scroll']) };
    }

    it('warns when hover is on a primitive without className support', () => {
      const result = validateSpec({
        root: 'cb',
        elements: {
          cb: { type: 'checkbox', props: { value: true }, hover: { backgroundColor: '#F00' } },
        },
      }, createContextWithCssHover());
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('checkbox') && e.message.includes('does not support CSS className'))).toBe(true);
    });

    it('accepts hover on a supported primitive', () => {
      const result = validateSpec({
        root: 'card',
        elements: {
          card: { type: 'stack', props: {}, hover: { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } },
        },
      }, createContextWithCssHover());
      expect(result.valid).toBe(true);
    });

    it('skips check when cssHoverTypes not provided', () => {
      const result = validateSpec({
        root: 'cb',
        elements: {
          cb: { type: 'checkbox', props: { value: true }, hover: { backgroundColor: '#F00' } },
        },
      }, createContext());
      // No cssHoverTypes → no validation → valid
      expect(result.valid).toBe(true);
    });
  });

  describe('toast-container validation', () => {
    it('accepts valid toast-container with all props', () => {
      const result = validateSpec({
        root: 'main',
        elements: {
          main: { type: 'stack', props: {}, children: ['toasts'] },
          toasts: { type: 'toast-container', props: { position: 'bottom-center', duration: 5000, maxVisible: 3 } },
        },
      });
      expect(result.valid).toBe(true);
    });

    it('accepts toast-container with no props (defaults)', () => {
      const result = validateSpec({
        root: 'main',
        elements: {
          main: { type: 'stack', props: {}, children: ['toasts'] },
          toasts: { type: 'toast-container', props: {} },
        },
      });
      expect(result.valid).toBe(true);
    });

    it('rejects invalid position', () => {
      const result = validateSpec({
        root: 'main',
        elements: {
          main: { type: 'stack', props: {}, children: ['toasts'] },
          toasts: { type: 'toast-container', props: { position: 'middle-nowhere' } },
        },
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('position'))).toBe(true);
    });

    it('rejects non-number duration', () => {
      const result = validateSpec({
        root: 'main',
        elements: {
          main: { type: 'stack', props: {}, children: ['toasts'] },
          toasts: { type: 'toast-container', props: { duration: 'fast' } },
        },
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('duration'))).toBe(true);
    });

    it('accepts null duration (persistent default)', () => {
      const result = validateSpec({
        root: 'main',
        elements: {
          main: { type: 'stack', props: {}, children: ['toasts'] },
          toasts: { type: 'toast-container', props: { duration: null } },
        },
      });
      expect(result.valid).toBe(true);
    });

    it('rejects invalid maxVisible', () => {
      const result = validateSpec({
        root: 'main',
        elements: {
          main: { type: 'stack', props: {}, children: ['toasts'] },
          toasts: { type: 'toast-container', props: { maxVisible: 0 } },
        },
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('maxVisible'))).toBe(true);
    });
  });

  describe('forms config validation', () => {
    it('accepts valid forms config', () => {
      const result = validateSpec({
        root: 'main',
        elements: { main: { type: 'text', props: { content: 'Hi' } } },
        forms: {
          'my-form': {
            fields: {
              name: { statePath: '/form/name', rules: [{ type: 'required' }] },
            },
          },
        },
      });
      expect(result.valid).toBe(true);
    });

    it('rejects field without statePath', () => {
      const result = validateSpec({
        root: 'main',
        elements: { main: { type: 'text', props: { content: 'Hi' } } },
        forms: {
          'my-form': {
            fields: {
              name: { rules: [{ type: 'required' }] } as any,
            },
          },
        },
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('statePath'))).toBe(true);
    });

    it('rejects unknown validator type in rules', () => {
      const result = validateSpec({
        root: 'main',
        elements: { main: { type: 'text', props: { content: 'Hi' } } },
        forms: {
          'my-form': {
            fields: {
              name: { statePath: '/form/name', rules: [{ type: 'nonexistent_validator' }] },
            },
          },
        },
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('nonexistent_validator'))).toBe(true);
    });
  });
});
