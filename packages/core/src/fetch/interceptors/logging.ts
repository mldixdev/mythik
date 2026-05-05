import type { FetchInterceptor } from '../types.js';

const SENSITIVE_PARAMS = new Set(['token', 'access_token', 'refresh_token', 'password', 'secret', 'key', 'apikey', 'api_key']);

/** Redact sensitive query parameters from URL for safe logging. */
function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    let redacted = false;
    for (const key of parsed.searchParams.keys()) {
      if (SENSITIVE_PARAMS.has(key.toLowerCase())) {
        parsed.searchParams.set(key, '[REDACTED]');
        redacted = true;
      }
    }
    return redacted ? parsed.toString() : url;
  } catch {
    return url;
  }
}

/**
 * Logging interceptor — logs request/response details to console.
 * Redacts sensitive query parameters (token, password, secret, key).
 * Enabled declaratively: { "interceptors": { "logging": true } }
 */
export function createLoggingInterceptor(): FetchInterceptor {
  return {
    name: 'logging',

    request(url: string, options: RequestInit): RequestInit {
      const method = options.method ?? 'GET';
      console.log(`[Mythik Fetch] ${method} ${redactUrl(url)}`);
      return options;
    },

    response(response: Response, request: { url: string; options: RequestInit }): Response {
      const method = request.options.method ?? 'GET';
      const status = response.status;
      console.log(`[Mythik Fetch] ${method} ${redactUrl(request.url)} → ${status}`);
      return response;
    },
  };
}
