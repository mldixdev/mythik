import type { AuthUser } from './types.js';

const STORAGE_KEY = 'mythik_auth';

export interface PersistedAuthData {
  refreshToken: string;
  user: Pick<AuthUser, 'id' | 'email' | 'name' | 'avatar' | 'role' | 'roles' | 'metadata'>;
}

export interface AuthPersistence {
  save: (data: PersistedAuthData) => void;
  restore: () => PersistedAuthData | null;
  clear: () => void;
}

/**
 * Creates an auth persistence adapter.
 *
 * - "memory": data lives in a closure variable. Lost on page refresh.
 * - "local": uses localStorage (or injectable storage). Survives browser close.
 * - "session": uses sessionStorage (or injectable storage). Lost on browser close.
 *
 * Injectable storage parameter enables testing without real localStorage/sessionStorage.
 */
export function createAuthPersistence(
  mode: 'local' | 'session' | 'memory',
  storage?: Storage,
): AuthPersistence {
  if (mode === 'memory') {
    return createMemoryPersistence();
  }

  const store = storage ?? (mode === 'local' ? globalThis.localStorage : globalThis.sessionStorage);
  return createStoragePersistence(store);
}

// ─── Memory adapter ───

function createMemoryPersistence(): AuthPersistence {
  let data: PersistedAuthData | null = null;

  return {
    save(d: PersistedAuthData): void {
      data = { ...d, user: { ...d.user } };
    },
    restore(): PersistedAuthData | null {
      return data ? { ...data, user: { ...data.user } } : null;
    },
    clear(): void {
      data = null;
    },
  };
}

// ─── Storage adapter (localStorage / sessionStorage) ───

function createStoragePersistence(storage: Storage): AuthPersistence {
  return {
    save(data: PersistedAuthData): void {
      try {
        const serialized = JSON.stringify({
          refreshToken: data.refreshToken,
          user: {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            avatar: data.user.avatar,
            role: data.user.role,
            roles: data.user.roles,
            metadata: data.user.metadata,
          },
        });
        storage.setItem(STORAGE_KEY, serialized);
      } catch {
        // Storage full or unavailable — fail silently
      }
    },

    restore(): PersistedAuthData | null {
      try {
        const raw = storage.getItem(STORAGE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        // Validate shape — reject incomplete data to prevent silent corruption
        if (
          !parsed ||
          typeof parsed.refreshToken !== 'string' ||
          !parsed.user ||
          typeof parsed.user.id !== 'string' ||
          typeof parsed.user.email !== 'string' ||
          typeof parsed.user.role !== 'string' ||
          !Array.isArray(parsed.user.roles)
        ) {
          try { storage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
          return null;
        }

        return parsed as PersistedAuthData;
      } catch {
        // Corrupted data — clear and return null
        try { storage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
        return null;
      }
    },

    clear(): void {
      try {
        storage.removeItem(STORAGE_KEY);
      } catch {
        // Storage unavailable — fail silently
      }
    },
  };
}
