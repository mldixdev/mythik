import type { StateStore } from '../state/store.js';

export interface RealtimeChannelConfig {
  source: string; // WebSocket URL template
  bind: Record<string, string>; // incoming field → state path
}

export interface RealtimeConfig {
  channels: Record<string, RealtimeChannelConfig>;
}

export interface RealtimeEngine {
  /** Connect all channels. Returns cleanup function. */
  connect: () => () => void;
  /** Simulate an incoming message (for testing without real WebSocket) */
  simulateMessage: (channel: string, data: Record<string, unknown>) => void;
}

/**
 * Creates a real-time engine that binds WebSocket messages to state paths.
 * In production, this connects to actual WebSockets.
 * For testing, use simulateMessage.
 */
export function createRealtimeEngine(store: StateStore, config: RealtimeConfig): RealtimeEngine {
  const bindings = new Map<string, Record<string, string>>();

  // Store bindings for each channel
  for (const [name, channelConfig] of Object.entries(config.channels)) {
    bindings.set(name, channelConfig.bind);
  }

  function applyMessage(channel: string, data: Record<string, unknown>): void {
    const channelBindings = bindings.get(channel);
    if (!channelBindings) return;

    for (const [field, statePath] of Object.entries(channelBindings)) {
      if (field in data) {
        store.set(statePath, data[field]);
      }
    }
  }

  function connect(): () => void {
    // In a real implementation, this would open WebSocket connections.
    // The renderer layer (React, RN) handles the actual WebSocket lifecycle.
    // Here we set connection status for each channel.
    for (const name of bindings.keys()) {
      store.set(`/realtime/${name}/connected`, true);
    }

    return () => {
      for (const name of bindings.keys()) {
        store.set(`/realtime/${name}/connected`, false);
      }
    };
  }

  function simulateMessage(channel: string, data: Record<string, unknown>): void {
    applyMessage(channel, data);
  }

  return { connect, simulateMessage };
}
