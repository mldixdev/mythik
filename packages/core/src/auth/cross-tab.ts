import type { AuthEvent } from './types.js';

const CHANNEL_NAME = 'mythik-auth';
const STORAGE_KEY = 'mythik-auth-event';

/** Valid auth event types for message validation. */
const VALID_EVENT_TYPES = new Set([
  'SIGNED_IN', 'SIGNED_OUT', 'TOKEN_REFRESHED', 'SESSION_EXPIRED', 'AUTH_ERROR',
]);

export interface CrossTabSync {
  /** Broadcast an auth event to all other tabs. */
  broadcast: (event: AuthEvent) => void;
  /** Register a listener for auth events from other tabs. Returns unsubscribe. */
  onEvent: (callback: (event: AuthEvent) => void) => () => void;
  /** Clean up channel and listeners. */
  destroy: () => void;
}

function dispatchToListeners(listeners: Set<(event: AuthEvent) => void>, data: unknown): void {
  if (!data || typeof data !== 'object' || !VALID_EVENT_TYPES.has((data as Record<string, unknown>).type as string)) {
    return;
  }
  const event = data as AuthEvent;
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // Individual listener failure must not prevent other listeners from running
    }
  }
}

/**
 * Creates cross-tab auth synchronization.
 *
 * Primary: BroadcastChannel (modern browsers, 97%+ support).
 * Fallback: localStorage `storage` events (legacy browsers).
 *
 * - Logout in Tab A → all other tabs clear session and redirect to login
 * - Sign in in Tab A → other tabs can restore session from persistence
 * - Token refresh in Tab A → other tabs pick up new token
 *
 * The channelFactory parameter enables testing without real BroadcastChannel.
 * Pass `() => null` for environments where BroadcastChannel is unavailable.
 */
export function createCrossTabSync(
  channelFactory?: () => BroadcastChannel,
): CrossTabSync {
  const listeners = new Set<(event: AuthEvent) => void>();
  let destroyed = false;

  // ─── Try BroadcastChannel first ───
  let channel: BroadcastChannel | null = null;
  try {
    channel = channelFactory
      ? channelFactory()
      : (typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null);
  } catch {
    // BroadcastChannel not available
  }

  // ─── Storage event fallback handler ───
  let storageHandler: ((ev: StorageEvent) => void) | null = null;
  const useStorageFallback = !channel && typeof globalThis.localStorage !== 'undefined';

  if (channel) {
    channel.onmessage = (ev: MessageEvent) => {
      dispatchToListeners(listeners, ev.data);
    };
  } else if (useStorageFallback) {
    storageHandler = (ev: StorageEvent) => {
      if (ev.key !== STORAGE_KEY || !ev.newValue) return;
      try {
        const data = JSON.parse(ev.newValue);
        dispatchToListeners(listeners, data);
      } catch {
        // Invalid JSON — ignore
      }
    };
    globalThis.addEventListener('storage', storageHandler);
  }

  function broadcast(event: AuthEvent): void {
    if (destroyed) return;

    if (channel) {
      try {
        channel.postMessage(event);
      } catch {
        // Channel closed or unavailable
      }
    } else if (useStorageFallback) {
      try {
        // Write to localStorage triggers `storage` event in OTHER tabs (not this one)
        globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(event));
        // Remove immediately — we only need the event, not persisted data
        globalThis.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Storage unavailable
      }
    }
  }

  function onEvent(callback: (event: AuthEvent) => void): () => void {
    if (!channel && !useStorageFallback) return () => {};
    if (destroyed) return () => {};
    listeners.add(callback);
    return () => { listeners.delete(callback); };
  }

  function destroy(): void {
    destroyed = true;
    listeners.clear();
    if (channel) {
      try { channel.close(); } catch { /* Already closed */ }
      channel = null;
    }
    if (storageHandler) {
      globalThis.removeEventListener('storage', storageHandler);
      storageHandler = null;
    }
  }

  return { broadcast, onEvent, destroy };
}
