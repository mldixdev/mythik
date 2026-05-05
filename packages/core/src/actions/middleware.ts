/**
 * Dispatcher Middleware — pre/post hooks on ALL actions.
 *
 * Separation of concerns:
 * - Framework Fetch interceptors = networking (headers, retry, timeout)
 * - Dispatcher Middleware = actions (logging, analytics, auth lifecycle)
 */

export interface MiddlewareContext {
  action: string;
  params: Record<string, unknown>;
  getState: (path: string) => unknown;
  /** Modify a param before action execution. */
  setParam: (key: string, value: unknown) => void;
}

export interface ActionMiddleware {
  name: string;
  before?: (context: MiddlewareContext) => void | Promise<void>;
  after?: (context: MiddlewareContext, result: unknown) => void | Promise<void>;
  onError?: (context: MiddlewareContext, error: Error) => void | Promise<void>;
}

export interface MiddlewareChain {
  executeBefore: (context: MiddlewareContext) => Promise<void>;
  executeAfter: (context: MiddlewareContext, result: unknown) => Promise<void>;
  executeOnError: (context: MiddlewareContext, error: Error) => Promise<void>;
}

export function createMiddlewareChain(middleware: ActionMiddleware[]): MiddlewareChain {
  async function executeBefore(context: MiddlewareContext): Promise<void> {
    for (const mw of middleware) {
      if (mw.before) {
        await mw.before(context);
      }
    }
  }

  async function executeAfter(context: MiddlewareContext, result: unknown): Promise<void> {
    for (const mw of middleware) {
      if (mw.after) {
        await mw.after(context, result);
      }
    }
  }

  async function executeOnError(context: MiddlewareContext, error: Error): Promise<void> {
    for (const mw of middleware) {
      if (mw.onError) {
        try {
          await mw.onError(context, error);
        } catch {
          // Individual onError failure must not prevent other error handlers from running
        }
      }
    }
  }

  return { executeBefore, executeAfter, executeOnError };
}
