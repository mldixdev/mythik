/**
 * Resolves environment variable references ($VAR_NAME) in a config object.
 * Only resolves top-level string values starting with '$'.
 */
export function resolveEnvVars<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  const resolved = { ...obj } as Record<string, unknown>;
  for (const [key, value] of Object.entries(resolved)) {
    if (typeof value === 'string' && value.startsWith('$')) {
      const envName = value.slice(1);
      const envValue = process.env[envName];
      if (envValue === undefined) {
        throw new Error(`Environment variable "${envName}" is not set (referenced as "${value}" in config)`);
      }
      resolved[key] = envValue;
    }
  }
  return resolved as T;
}
