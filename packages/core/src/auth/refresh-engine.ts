/**
 * Token refresh engine with mutex (anti-stampede) and proactive scheduling.
 *
 * Mutex: If 5 requests detect token expiry simultaneously, only 1 refresh
 * executes. The other 4 wait and receive the same result.
 *
 * Proactive: Schedules refresh at 80% of token lifetime (before expiry).
 * Minimum schedule time: 5 seconds (prevents tight loops on very short tokens).
 */

export interface RefreshEngineConfig {
  /** The actual refresh function. Returns new token or throws. */
  doRefresh: () => Promise<string>;
}

export interface RefreshEngine {
  /** Request a token refresh. Concurrent calls share the same refresh via mutex. */
  requestRefresh: () => Promise<string | null>;
  /** Schedule proactive refresh. Fires at 80% of lifetimeMs. */
  scheduleProactive: (lifetimeMs: number) => void;
  /** Cancel any scheduled proactive refresh. */
  cancelProactive: () => void;
  /** Clean up timers. */
  destroy: () => void;
}

const MIN_SCHEDULE_MS = 5000;

export function createRefreshEngine(config: RefreshEngineConfig): RefreshEngine {
  const { doRefresh } = config;

  // ─── Mutex state ───
  let refreshPromise: Promise<string | null> | null = null;

  // ─── Proactive timer ───
  let proactiveTimer: ReturnType<typeof setTimeout> | null = null;

  async function requestRefresh(): Promise<string | null> {
    // If a refresh is already in progress, wait for it (mutex)
    if (refreshPromise) {
      return refreshPromise;
    }

    // Start new refresh — all concurrent callers will share this promise
    refreshPromise = (async () => {
      try {
        const newToken = await doRefresh();
        return newToken;
      } catch {
        return null;
      } finally {
        // Release mutex after completion
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  }

  function scheduleProactive(lifetimeMs: number): void {
    cancelProactive();

    // Schedule at 80% of lifetime, minimum 5 seconds
    const refreshAt = Math.max(MIN_SCHEDULE_MS, Math.floor(lifetimeMs * 0.8));

    proactiveTimer = setTimeout(() => {
      proactiveTimer = null;
      requestRefresh();
    }, refreshAt);
  }

  function cancelProactive(): void {
    if (proactiveTimer !== null) {
      clearTimeout(proactiveTimer);
      proactiveTimer = null;
    }
  }

  function destroy(): void {
    cancelProactive();
    refreshPromise = null;
  }

  return { requestRefresh, scheduleProactive, cancelProactive, destroy };
}
