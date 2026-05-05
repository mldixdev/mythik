import type { Request, Response, NextFunction } from 'express';
import type { AuthConfig } from './types.js';
import type { UserContext } from '../types.js';
import { createJwtStrategy } from './jwt-strategy.js';
import { buildUserContext } from './user-context.js';
import { evaluatePolicy } from './policy-evaluator.js';

export function createAuthMiddleware(authConfig: AuthConfig) {
  const jwtStrategy = createJwtStrategy(authConfig.jwt);
  const policies = authConfig.policies ?? {};
  const claimsMapping = authConfig.jwt.claims ?? {};

  return function authMiddlewareFactory(policy?: string) {
    return async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
      // Public endpoints skip auth
      if (policy === 'public') return next();

      // Extract token
      const token = jwtStrategy.extractToken(req);
      if (!token) {
        res.status(401).json({ error: { code: 'TOKEN_REQUIRED', message: 'Authentication required' } });
        return;
      }

      // Validate token
      let claims: Record<string, unknown>;
      try {
        claims = await jwtStrategy.validateToken(token);
      } catch {
        res.status(401).json({ error: { code: 'TOKEN_INVALID', message: 'Invalid or expired token' } });
        return;
      }

      // Build user context
      const user: UserContext = buildUserContext(claims, claimsMapping);
      (req as unknown as Record<string, unknown>).user = user;

      // Evaluate policy
      if (!evaluatePolicy(policy, user.roles, policies)) {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
        return;
      }

      next();
    };
  };
}
