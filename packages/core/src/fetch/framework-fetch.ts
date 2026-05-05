import type { FetchInterceptor, FrameworkFetchConfig, FrameworkFetch } from './types.js';

/**
 * Creates a scoped fetch wrapper with an interceptor chain.
 *
 * This is Mythik's internal fetch — used by the dispatcher (fetch/submitForm actions)
 * and dataSources. It does NOT monkey-patch globalThis.fetch.
 *
 * Interceptors run in order:
 *   request interceptors (modify options) → baseFetch → response interceptors (transform response)
 */
export function createFrameworkFetch(config: FrameworkFetchConfig = {}): FrameworkFetch {
  const baseFetch = config.baseFetch ?? globalThis.fetch?.bind(globalThis);
  const interceptors: FetchInterceptor[] = [...(config.interceptors ?? [])];

  async function fetch(url: string, options?: RequestInit): Promise<Response> {
    let opts: RequestInit = options ?? {};

    // Run request interceptors in order
    for (const interceptor of interceptors) {
      if (interceptor.request) {
        opts = await interceptor.request(url, opts);
      }
    }

    // Execute the actual fetch
    let response = await baseFetch(url, opts);

    // Run response interceptors in order
    for (const interceptor of interceptors) {
      if (interceptor.response) {
        response = await interceptor.response(response, { url, options: opts });
      }
    }

    return response;
  }

  function addInterceptor(interceptor: FetchInterceptor): void {
    interceptors.push(interceptor);
  }

  return { fetch, addInterceptor };
}
