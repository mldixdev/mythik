import type { FetchInterceptor } from '../types.js';

/**
 * Timeout interceptor — aborts requests after configured ms.
 * Enabled declaratively: { "interceptors": { "timeout": { "ms": 15000 } } }
 */
export function createTimeoutInterceptor(ms: number): FetchInterceptor {
  return {
    name: 'timeout',

    request(_url: string, options: RequestInit): RequestInit {
      // If user already set an AbortSignal, don't override
      if (options.signal) return options;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ms);

      // Attach cleanup to the signal so we can clear the timeout
      controller.signal.addEventListener('abort', () => clearTimeout(timer), { once: true });

      return { ...options, signal: controller.signal };
    },
  };
}
