import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { createJwtStrategy } from '../../src/auth/jwt-strategy.js';

const SECRET = 'test-secret-key-at-least-32-chars!!';
const strategy = createJwtStrategy({ secret: SECRET, issuer: 'test-issuer', audience: 'test-audience' });

function makeToken(payload: Record<string, unknown>, options: jwt.SignOptions = {}): string {
  return jwt.sign(payload, SECRET, { issuer: 'test-issuer', audience: 'test-audience', expiresIn: '1h', ...options });
}

describe('extractToken', () => {
  it('extracts Bearer token from Authorization header', () => {
    const token = strategy.extractToken({ headers: { authorization: 'Bearer abc123' } });
    expect(token).toBe('abc123');
  });

  it('returns null when no Authorization header', () => {
    expect(strategy.extractToken({ headers: {} })).toBeNull();
  });

  it('returns null for non-Bearer scheme', () => {
    expect(strategy.extractToken({ headers: { authorization: 'Basic abc123' } })).toBeNull();
  });

  it('returns null for empty Bearer value', () => {
    expect(strategy.extractToken({ headers: { authorization: 'Bearer ' } })).toBeNull();
  });
});

describe('validateToken', () => {
  it('validates a correctly signed token', async () => {
    const token = makeToken({ sub: 'sample-user', roles: ['ADMIN'] });
    const claims = await strategy.validateToken(token);
    expect(claims.sub).toBe('sample-user');
    expect(claims.roles).toEqual(['ADMIN']);
  });

  it('rejects expired token', async () => {
    const token = makeToken({ sub: 'sample-user' }, { expiresIn: '0s' });
    await new Promise(r => setTimeout(r, 10));
    await expect(strategy.validateToken(token)).rejects.toThrow();
  });

  it('rejects token with wrong secret', async () => {
    const token = jwt.sign({ sub: 'sample-user' }, 'wrong-secret', { issuer: 'test-issuer', audience: 'test-audience' });
    await expect(strategy.validateToken(token)).rejects.toThrow();
  });

  it('rejects token with wrong issuer', async () => {
    const token = jwt.sign({ sub: 'sample-user' }, SECRET, { issuer: 'wrong-issuer', audience: 'test-audience', expiresIn: '1h' });
    await expect(strategy.validateToken(token)).rejects.toThrow();
  });

  it('rejects token with wrong audience', async () => {
    const token = jwt.sign({ sub: 'sample-user' }, SECRET, { issuer: 'test-issuer', audience: 'wrong-audience', expiresIn: '1h' });
    await expect(strategy.validateToken(token)).rejects.toThrow();
  });

  it('skips issuer check when not configured', async () => {
    const relaxedStrategy = createJwtStrategy({ secret: SECRET });
    const token = jwt.sign({ sub: 'sample-user' }, SECRET, { expiresIn: '1h' });
    const claims = await relaxedStrategy.validateToken(token);
    expect(claims.sub).toBe('sample-user');
  });

  it('skips audience check when not configured', async () => {
    const relaxedStrategy = createJwtStrategy({ secret: SECRET });
    const token = jwt.sign({ sub: 'sample-user' }, SECRET, { expiresIn: '1h' });
    const claims = await relaxedStrategy.validateToken(token);
    expect(claims.sub).toBe('sample-user');
  });
});

describe('generateToken', () => {
  it('generates a valid JWT', () => {
    const token = strategy.generateToken({ sub: 'sample-user', roles: ['ADMIN'] }, 60);
    const decoded = jwt.verify(token, SECRET, { issuer: 'test-issuer', audience: 'test-audience' }) as Record<string, unknown>;
    expect(decoded.sub).toBe('sample-user');
    expect(decoded.roles).toEqual(['ADMIN']);
  });

  it('sets expiration from minutes', () => {
    const token = strategy.generateToken({ sub: 'test' }, 30);
    const decoded = jwt.decode(token) as Record<string, unknown>;
    const exp = decoded.exp as number;
    const iat = decoded.iat as number;
    expect(exp - iat).toBe(30 * 60);
  });

  it('includes issuer and audience when configured', () => {
    const token = strategy.generateToken({ sub: 'test' }, 60);
    const decoded = jwt.decode(token) as Record<string, unknown>;
    expect(decoded.iss).toBe('test-issuer');
    expect(decoded.aud).toBe('test-audience');
  });
});
