import type { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  type?: 'VALIDATION' | 'NOT_FOUND' | 'QUERY_ERROR' | 'AUTH' | 'FORBIDDEN';
  status?: number;
  code?: string;
  details?: unknown;
}

export function createErrorHandler(devMode: boolean) {
  return function errorHandler(err: ApiError, _req: Request, res: Response, _next: NextFunction): void {
    // Validation errors
    if (err.type === 'VALIDATION') {
      res.status(400).json({
        error: { code: 'VALIDATION_FAILED', message: err.message, details: err.details },
      });
      return;
    }

    // Not found
    if (err.type === 'NOT_FOUND') {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: err.message },
      });
      return;
    }

    // Auth errors
    if (err.type === 'AUTH') {
      res.status(401).json({
        error: { code: err.code ?? 'AUTH_ERROR', message: err.message },
      });
      return;
    }

    // Forbidden
    if (err.type === 'FORBIDDEN') {
      res.status(403).json({
        error: { code: err.code ?? 'FORBIDDEN', message: devMode ? err.message : 'Access denied' },
      });
      return;
    }

    // SQL Server driver errors expose a numeric code.
    if ('number' in err && typeof (err as Record<string, unknown>).number === 'number') {
      const message = devMode ? err.message : 'Database error';
      res.status(400).json({
        error: { code: 'QUERY_ERROR', message },
      });
      return;
    }

    // Explicit status from handler
    if (err.status) {
      res.status(err.status).json({
        error: { code: err.code ?? 'ERROR', message: err.message },
      });
      return;
    }

    // Unhandled
    if (devMode) {
      console.error('[Mythik Server Error]', err);
    }
    const message = devMode ? err.message : 'Internal server error';
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message },
    });
  };
}
