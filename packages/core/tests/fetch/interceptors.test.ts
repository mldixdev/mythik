import { describe, it, expect, vi } from 'vitest';
import { createAuthInterceptor } from '../../src/fetch/interceptors/auth.js';
import { createLoggingInterceptor } from '../../src/fetch/interceptors/logging.js';
import { createTimeoutInterceptor } from '../../src/fetch/interceptors/timeout.js';
import { createRetryInterceptor } from '../../src/fetch/interceptors/retry.js';

describe('Auth Interceptor — Request', () => {
  it('injects Bearer header for authorized domain', async () => {
    const interceptor = createAuthInterceptor({
      getToken: () => 'my-token',
      authDomains: ['api.test.com'],
    });
    const opts = await interceptor.request!('https://api.test.com/data', { headers: {} });
    expect((opts.headers as Record<string, string>)['Authorization']).toBe('Bearer my-token');
  });

  it('does NOT inject header for unauthorized domain', async () => {
    const interceptor = createAuthInterceptor({
      getToken: () => 'my-token',
      authDomains: ['api.test.com'],
    });
    const opts = await interceptor.request!('https://evil.com/steal', { headers: {} });
    expect((opts.headers as Record<string, string>)['Authorization']).toBeUndefined();
  });

  it('does NOT inject header when no token available', async () => {
    const interceptor = createAuthInterceptor({
      getToken: () => null,
      authDomains: ['api.test.com'],
    });
    const opts = await interceptor.request!('https://api.test.com/data', { headers: {} });
    expect((opts.headers as Record<string, string>)['Authorization']).toBeUndefined();
  });

  it('handles subdomain matching', async () => {
    const interceptor = createAuthInterceptor({
      getToken: () => 'tk',
      authDomains: ['supabase.co'],
    });
    const opts = await interceptor.request!('https://myproject.supabase.co/rest/v1/data', { headers: {} });
    expect((opts.headers as Record<string, string>)['Authorization']).toBe('Bearer tk');
  });

  it('handles exact domain matching', async () => {
    const interceptor = createAuthInterceptor({
      getToken: () => 'tk',
      authDomains: ['api.mycompany.com'],
    });
    const opts = await interceptor.request!('https://api.mycompany.com/users', { headers: {} });
    expect((opts.headers as Record<string, string>)['Authorization']).toBe('Bearer tk');
  });

  it('does NOT match partial domain names', async () => {
    const interceptor = createAuthInterceptor({
      getToken: () => 'tk',
      authDomains: ['api.com'],
    });
    // "notapi.com" should NOT match "api.com"
    const opts = await interceptor.request!('https://notapi.com/data', { headers: {} });
    expect((opts.headers as Record<string, string>)['Authorization']).toBeUndefined();
  });

  it('allows relative URLs (same-origin)', async () => {
    const interceptor = createAuthInterceptor({
      getToken: () => 'tk',
      authDomains: ['api.test.com'],
    });
    // Relative URLs can't match domains — pass through without headers
    const opts = await interceptor.request!('/api/data', { headers: {} });
    expect((opts.headers as Record<string, string>)['Authorization']).toBeUndefined();
  });

  it('preserves existing headers', async () => {
    const interceptor = createAuthInterceptor({
      getToken: () => 'tk',
      authDomains: ['api.test.com'],
    });
    const opts = await interceptor.request!('https://api.test.com/data', {
      headers: { 'Content-Type': 'application/json', 'X-Custom': 'value' },
    });
    const headers = opts.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer tk');
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['X-Custom']).toBe('value');
  });

  it('supports multiple authorized domains', async () => {
    const interceptor = createAuthInterceptor({
      getToken: () => 'tk',
      authDomains: ['api.test.com', 'auth.test.com'],
    });
    const opts1 = await interceptor.request!('https://api.test.com/data', { headers: {} });
    const opts2 = await interceptor.request!('https://auth.test.com/session', { headers: {} });
    const opts3 = await interceptor.request!('https://other.com/data', { headers: {} });

    expect((opts1.headers as Record<string, string>)['Authorization']).toBe('Bearer tk');
    expect((opts2.headers as Record<string, string>)['Authorization']).toBe('Bearer tk');
    expect((opts3.headers as Record<string, string>)['Authorization']).toBeUndefined();
  });
});

describe('Logging Interceptor', () => {
  it('logs request method and url', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const interceptor = createLoggingInterceptor();

    interceptor.request!('https://api.test.com/data', { method: 'POST' });
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('POST'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('api.test.com'));
    spy.mockRestore();
  });

  it('logs response status', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const interceptor = createLoggingInterceptor();

    interceptor.response!(new Response('ok', { status: 200 }), { url: 'https://api.test.com/data', options: { method: 'GET' } });
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('200'));
    spy.mockRestore();
  });

  it('defaults to GET when no method specified', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const interceptor = createLoggingInterceptor();

    interceptor.request!('https://api.test.com/data', {});
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('GET'));
    spy.mockRestore();
  });
});

describe('Timeout Interceptor', () => {
  it('adds AbortSignal to request options', () => {
    const interceptor = createTimeoutInterceptor(5000);
    const opts = interceptor.request!('https://api.test.com/data', {});
    expect(opts.signal).toBeDefined();
    expect(opts.signal).toBeInstanceOf(AbortSignal);
  });

  it('does not override existing AbortSignal', () => {
    const controller = new AbortController();
    const interceptor = createTimeoutInterceptor(5000);
    const opts = interceptor.request!('https://api.test.com/data', { signal: controller.signal });
    expect(opts.signal).toBe(controller.signal);
  });
});

describe('Retry Interceptor', () => {
  it('retries on configured statuses and returns success', async () => {
    const doFetch = vi.fn()
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const interceptor = createRetryInterceptor({ maxRetries: 2, statuses: [503], baseDelay: 1 }, doFetch);

    const result = await interceptor.response!(
      new Response('error', { status: 503 }),
      { url: 'https://api.test.com/data', options: {} },
    );
    expect(doFetch).toHaveBeenCalledTimes(1);
    expect(result.status).toBe(200);
  });

  it('does not retry on non-configured statuses', async () => {
    let retryCalled = false;
    const doFetch = async () => { retryCalled = true; return new Response('ok', { status: 200 }); };

    const interceptor = createRetryInterceptor({ statuses: [502, 503], baseDelay: 1 }, doFetch);

    const result = await interceptor.response!(
      new Response('not found', { status: 404 }),
      { url: 'https://api.test.com/data', options: {} },
    );
    expect(result.status).toBe(404);
    expect(retryCalled).toBe(false);
  });

  it('stops after maxRetries', async () => {
    let callCount = 0;
    const doFetch = async () => {
      callCount++;
      return new Response('error', { status: 503 });
    };

    const interceptor = createRetryInterceptor({ maxRetries: 2, statuses: [503], baseDelay: 1 }, doFetch);

    const result = await interceptor.response!(
      new Response('error', { status: 503 }),
      { url: 'https://api.test.com/data', options: {} },
    );
    // Should retry 2 times then give up
    expect(callCount).toBeLessThanOrEqual(2);
    expect(result.status).toBe(503);
  });

  it('passes through when no doFetch provided', async () => {
    const interceptor = createRetryInterceptor({ statuses: [503] });
    const result = await interceptor.response!(
      new Response('error', { status: 503 }),
      { url: 'https://api.test.com/data', options: {} },
    );
    expect(result.status).toBe(503);
  });
});
