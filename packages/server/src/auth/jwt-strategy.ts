import jwt from 'jsonwebtoken';
import type { AuthStrategy, JwtConfig } from './types.js';

export function createJwtStrategy(config: JwtConfig): AuthStrategy {
  const secret = config.secret;

  function extractToken(req: { headers: Record<string, string | string[] | undefined> }): string | null {
    const auth = req.headers.authorization ?? req.headers.Authorization;
    if (typeof auth !== 'string') return null;
    if (!auth.startsWith('Bearer ')) return null;
    const token = auth.slice(7).trim();
    return token.length > 0 ? token : null;
  }

  async function validateToken(token: string): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const options: jwt.VerifyOptions = {};
      if (config.issuer) options.issuer = config.issuer;
      if (config.audience) options.audience = config.audience;

      jwt.verify(token, secret, options, (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded as Record<string, unknown>);
      });
    });
  }

  function generateToken(payload: Record<string, unknown>, expiresInMinutes: number): string {
    const options: jwt.SignOptions = {
      expiresIn: expiresInMinutes * 60,
    };
    if (config.issuer) options.issuer = config.issuer;
    if (config.audience) options.audience = config.audience;

    return jwt.sign(payload, secret, options);
  }

  return { extractToken, validateToken, generateToken };
}
