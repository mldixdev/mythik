import corsMiddleware from 'cors';
import type { RequestHandler } from 'express';

export function createCors(enabled: boolean): RequestHandler {
  if (!enabled) {
    return (_req, _res, next) => next();
  }
  return corsMiddleware();
}
