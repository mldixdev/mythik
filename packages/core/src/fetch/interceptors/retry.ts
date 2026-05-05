import type { FetchInterceptor } from '../types.js';

export interface RetryInterceptorConfig {
  /** Max retry attempts. Default: 2. */
  maxRetries?: number;
  /** HTTP statuses that trigger retry. Default: [502, 503, 504]. */
  statuses?: number[];
  /** Base delay in ms between retries (doubles each attempt). Default: 1000. */
  baseDelay?: number;
}

/**
 * Retry interceptor — retries on transient server errors with exponential backoff.
 * Enabled declaratively: { "interceptors": { "retryOnError": { "maxRetries": 2, "statuses": [502, 503] } } }
 *
 * Each response interceptor invocation manages its own retry count — no shared state
 * between concurrent requests (fixes key collision issue).
 */
export function createRetryInterceptor(
  config: RetryInterceptorConfig = {},
  /** The fetch function to use for retries. Must be provided externally. */
  doFetch?: (url: string, options: RequestInit) => Promise<Response>,
): FetchInterceptor {
  const maxRetries = config.maxRetries ?? 2;
  const retryStatuses = new Set(config.statuses ?? [502, 503, 504]);
  const baseDelay = config.baseDelay ?? 1000;

  return {
    name: 'retry',

    async response(response: Response, request: { url: string; options: RequestInit }): Promise<Response> {
      if (!retryStatuses.has(response.status) || !doFetch) {
        return response;
      }

      // Retry loop — scoped to this single request invocation
      let lastResponse = response;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, delay));

        lastResponse = await doFetch(request.url, request.options);
        if (!retryStatuses.has(lastResponse.status)) {
          return lastResponse; // Success or non-retryable error
        }
      }

      return lastResponse;
    },
  };
}
