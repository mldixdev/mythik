/**
 * Framework Fetch interceptor interface.
 *
 * Interceptors hook into the request/response pipeline of Mythik's
 * internal fetch wrapper. They do NOT affect globalThis.fetch — only
 * requests made through the framework (dispatcher actions, dataSources).
 */
export interface FetchInterceptor {
  name: string;
  /** Transform request options before fetch. Can modify headers, method, body, etc. */
  request?: (url: string, options: RequestInit) => RequestInit | Promise<RequestInit>;
  /** Transform response after fetch. Can modify or replace the response. */
  response?: (response: Response, request: { url: string; options: RequestInit }) => Response | Promise<Response>;
}

export interface FrameworkFetchConfig {
  /** The underlying fetch function. Defaults to globalThis.fetch. */
  baseFetch?: typeof globalThis.fetch;
  /** Interceptors to apply in order. */
  interceptors?: FetchInterceptor[];
}

export interface FrameworkFetch {
  /** Execute a fetch through the interceptor chain. */
  fetch: (url: string, options?: RequestInit) => Promise<Response>;
  /** Add an interceptor dynamically (appended to end of chain). */
  addInterceptor: (interceptor: FetchInterceptor) => void;
}
