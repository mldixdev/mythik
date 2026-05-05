import { randomBytes } from 'crypto';

interface StoredToken {
  username: string;
  expiry: number; // timestamp ms
}

export interface RefreshStore {
  store(username: string, token: string): void;
  getUsername(token: string): string | null;
  revoke(token: string): void;
  generateToken(): string;
}

export function createRefreshStore(ttlMinutes: number): RefreshStore {
  const tokens = new Map<string, StoredToken>();
  const ttlMs = ttlMinutes * 60 * 1000;

  function cleanExpired(): void {
    const now = Date.now();
    for (const [token, entry] of tokens) {
      if (entry.expiry <= now) tokens.delete(token);
    }
  }

  function store(username: string, token: string): void {
    tokens.set(token, { username, expiry: Date.now() + ttlMs });
    cleanExpired();
  }

  function getUsername(token: string): string | null {
    const entry = tokens.get(token);
    if (!entry) return null;
    if (entry.expiry <= Date.now()) {
      tokens.delete(token);
      return null;
    }
    return entry.username;
  }

  function revoke(token: string): void {
    tokens.delete(token);
  }

  function generateToken(): string {
    return randomBytes(64).toString('base64url');
  }

  return { store, getUsername, revoke, generateToken };
}
