import type { FetchInterceptor } from '../types.js';

export interface AuthInterceptorConfig {
  /** Returns current access token or null. Called on every request. */
  getToken: () => string | null;
  /** Domains where Bearer token is auto-injected. Uses exact + subdomain matching. */
  authDomains: string[];
  /** Optional: called on 401 response to trigger refresh + retry. */
  onUnauthorized?: (url: string, options: RequestInit) => Promise<Response | null>;
}

/**
 * Checks if a URL matches any of the authorized domains.
 * Matches exact hostname or subdomain (e.g., "supabase.co" matches "myproject.supabase.co").
 * Does NOT match partial names (e.g., "api.com" does NOT match "notapi.com").
 */
function matchesDomain(url: string, authDomains: string[]): boolean {
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false;

  try {
    const parsed = new URL(url);
    return authDomains.some((domain) => {
      return parsed.hostname === domain || parsed.hostname.endsWith('.' + domain);
    });
  } catch {
    return false;
  }
}

/**
 * Normalize HeadersInit (Headers instance, array, or plain object) to a plain Record.
 * Headers instances are not enumerable via spread — must iterate explicitly.
 */
function normalizeHeaders(h: HeadersInit | undefined): Record<string, string> {
  if (!h) return {};
  if (h instanceof Headers) {
    const obj: Record<string, string> = {};
    h.forEach((v, k) => { obj[k] = v; });
    return obj;
  }
  if (Array.isArray(h)) return Object.fromEntries(h);
  return { ...(h as Record<string, string>) };
}

/**
 * Auth fetch interceptor — injects Bearer token for authorized domains.
 *
 * SECURITY:
 * - Only injects headers for URLs matching authDomains
 * - Fetch to non-authorized domain → goes without auth headers
 * - Token obtained from closure getter, never from state
 */
export function createAuthInterceptor(config: AuthInterceptorConfig): FetchInterceptor {
  const { getToken, authDomains, onUnauthorized } = config;

  return {
    name: 'auth',

    request(url: string, options: RequestInit): RequestInit {
      const token = getToken();
      if (!token || !matchesDomain(url, authDomains)) {
        return options;
      }

      const headers = normalizeHeaders(options.headers);
      headers['Authorization'] = `Bearer ${token}`;

      return { ...options, headers };
    },

    async response(response: Response, request: { url: string; options: RequestInit }): Promise<Response> {
      if (response.status === 401 && onUnauthorized && matchesDomain(request.url, authDomains)) {
        const retryResponse = await onUnauthorized(request.url, request.options);
        if (retryResponse) return retryResponse;
      }
      return response;
    },
  };
}
