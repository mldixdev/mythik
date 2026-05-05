import { describe, it, expect, vi } from 'vitest';
import { createFrameworkFetch } from '../../src/fetch/framework-fetch.js';
import type { FetchInterceptor } from '../../src/fetch/types.js';

function mockResponse(body: string, status = 200): Response {
  return new Response(body, { status, headers: { 'Content-Type': 'text/plain' } });
}

describe('Framework Fetch', () => {
  it('calls baseFetch with url and options', async () => {
    const baseFetch = vi.fn().mockResolvedValue(mockResponse('ok'));
    const ff = createFrameworkFetch({ baseFetch });

    await ff.fetch('https://api.test.com/data', { method: 'GET' });

    expect(baseFetch).toHaveBeenCalledTimes(1);
    expect(baseFetch.mock.calls[0][0]).toBe('https://api.test.com/data');
  });

  it('works with zero interceptors', async () => {
    const baseFetch = vi.fn().mockResolvedValue(mockResponse('ok'));
    const ff = createFrameworkFetch({ baseFetch, interceptors: [] });

    const res = await ff.fetch('https://api.test.com/data');
    expect(await res.text()).toBe('ok');
  });

  it('runs request interceptors in order', async () => {
    const order: string[] = [];
    const baseFetch = vi.fn().mockResolvedValue(mockResponse('ok'));
    const ff = createFrameworkFetch({
      baseFetch,
      interceptors: [
        { name: 'first', request: (_url, opts) => { order.push('first'); return opts; } },
        { name: 'second', request: (_url, opts) => { order.push('second'); return opts; } },
      ],
    });

    await ff.fetch('https://api.test.com/data');
    expect(order).toEqual(['first', 'second']);
  });

  it('request interceptor can modify headers', async () => {
    const baseFetch = vi.fn().mockResolvedValue(mockResponse('ok'));
    const ff = createFrameworkFetch({
      baseFetch,
      interceptors: [{
        name: 'custom-header',
        request: (_url, opts) => ({
          ...opts,
          headers: { ...(opts.headers as Record<string, string>), 'X-Custom': 'value' },
        }),
      }],
    });

    await ff.fetch('https://api.test.com/data', { headers: {} });
    const calledOpts = baseFetch.mock.calls[0][1];
    expect((calledOpts.headers as Record<string, string>)['X-Custom']).toBe('value');
  });

  it('request interceptor can modify method', async () => {
    const baseFetch = vi.fn().mockResolvedValue(mockResponse('ok'));
    const ff = createFrameworkFetch({
      baseFetch,
      interceptors: [{
        name: 'force-post',
        request: (_url, opts) => ({ ...opts, method: 'POST' }),
      }],
    });

    await ff.fetch('https://api.test.com/data', { method: 'GET' });
    expect(baseFetch.mock.calls[0][1].method).toBe('POST');
  });

  it('response interceptor can transform response', async () => {
    const baseFetch = vi.fn().mockResolvedValue(mockResponse('original'));
    const ff = createFrameworkFetch({
      baseFetch,
      interceptors: [{
        name: 'transform',
        response: () => mockResponse('transformed'),
      }],
    });

    const res = await ff.fetch('https://api.test.com/data');
    expect(await res.text()).toBe('transformed');
  });

  it('response interceptors run in order', async () => {
    const order: string[] = [];
    const baseFetch = vi.fn().mockResolvedValue(mockResponse('ok'));
    const ff = createFrameworkFetch({
      baseFetch,
      interceptors: [
        { name: 'first', response: (res) => { order.push('first'); return res; } },
        { name: 'second', response: (res) => { order.push('second'); return res; } },
      ],
    });

    await ff.fetch('https://api.test.com/data');
    expect(order).toEqual(['first', 'second']);
  });

  it('interceptor with both request and response hooks', async () => {
    const order: string[] = [];
    const baseFetch = vi.fn().mockResolvedValue(mockResponse('ok'));
    const ff = createFrameworkFetch({
      baseFetch,
      interceptors: [{
        name: 'full',
        request: (_url, opts) => { order.push('req'); return opts; },
        response: (res) => { order.push('res'); return res; },
      }],
    });

    await ff.fetch('https://api.test.com/data');
    expect(order).toEqual(['req', 'res']);
  });

  it('async interceptors are awaited', async () => {
    const baseFetch = vi.fn().mockResolvedValue(mockResponse('ok'));
    const ff = createFrameworkFetch({
      baseFetch,
      interceptors: [{
        name: 'async',
        request: async (_url, opts) => {
          await new Promise(r => setTimeout(r, 10));
          return { ...opts, headers: { ...(opts.headers as Record<string, string>), 'X-Async': 'yes' } };
        },
      }],
    });

    await ff.fetch('https://api.test.com/data', { headers: {} });
    expect((baseFetch.mock.calls[0][1].headers as Record<string, string>)['X-Async']).toBe('yes');
  });

  it('default options are provided when none given', async () => {
    const baseFetch = vi.fn().mockResolvedValue(mockResponse('ok'));
    const ff = createFrameworkFetch({ baseFetch });

    await ff.fetch('https://api.test.com/data');
    expect(baseFetch.mock.calls[0][1]).toBeDefined();
  });

  it('addInterceptor adds interceptor dynamically', async () => {
    const baseFetch = vi.fn().mockResolvedValue(mockResponse('ok'));
    const ff = createFrameworkFetch({ baseFetch });

    ff.addInterceptor({
      name: 'dynamic',
      request: (_url, opts) => ({
        ...opts,
        headers: { ...(opts.headers as Record<string, string>), 'X-Dynamic': 'true' },
      }),
    });

    await ff.fetch('https://api.test.com/data', { headers: {} });
    expect((baseFetch.mock.calls[0][1].headers as Record<string, string>)['X-Dynamic']).toBe('true');
  });
});
