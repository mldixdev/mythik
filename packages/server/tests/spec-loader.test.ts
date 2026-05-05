import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveEnvVars } from '../src/spec-loader.js';

describe('resolveEnvVars', () => {
  beforeEach(() => {
    vi.stubEnv('DB_SERVER', 'my-server.local');
    vi.stubEnv('DB_NAME', 'MyDatabase');
    vi.stubEnv('DB_USER', 'sa');
    vi.stubEnv('DB_PASS', 'secret123');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('resolves $ENV_VAR strings from process.env', () => {
    const config = {
      server: '$DB_SERVER',
      database: '$DB_NAME',
      user: '$DB_USER',
      password: '$DB_PASS',
    };
    const resolved = resolveEnvVars(config);
    expect(resolved.server).toBe('my-server.local');
    expect(resolved.database).toBe('MyDatabase');
    expect(resolved.user).toBe('sa');
    expect(resolved.password).toBe('secret123');
  });

  it('leaves non-$ strings unchanged', () => {
    const config = { server: 'localhost', database: 'TestDB' };
    const resolved = resolveEnvVars(config);
    expect(resolved.server).toBe('localhost');
    expect(resolved.database).toBe('TestDB');
  });

  it('throws on missing env var', () => {
    const config = { server: '$NONEXISTENT_VAR' };
    expect(() => resolveEnvVars(config)).toThrow('NONEXISTENT_VAR');
  });

  it('handles non-string values (numbers, booleans)', () => {
    const config = { port: 1433, trustServerCertificate: true, server: '$DB_SERVER' };
    const resolved = resolveEnvVars(config);
    expect(resolved.port).toBe(1433);
    expect(resolved.trustServerCertificate).toBe(true);
    expect(resolved.server).toBe('my-server.local');
  });
});
