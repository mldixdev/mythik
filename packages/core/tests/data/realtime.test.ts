import { describe, it, expect } from 'vitest';
import { createRealtimeEngine } from '../../src/data/realtime.js';
import { createStateStore } from '../../src/state/store.js';

describe('RealtimeEngine', () => {
  it('binds incoming messages to state paths', () => {
    const store = createStateStore({ monitor: {} });
    const engine = createRealtimeEngine(store, {
      channels: {
        vitals: {
          source: 'ws://api/vitals/1',
          bind: {
            heartRate: '/monitor/heartRate',
            bloodPressure: '/monitor/bp',
            temperature: '/monitor/temp',
          },
        },
      },
    });

    engine.simulateMessage('vitals', { heartRate: 72, bloodPressure: '120/80', temperature: 36.6 });

    expect(store.get('/monitor/heartRate')).toBe(72);
    expect(store.get('/monitor/bp')).toBe('120/80');
    expect(store.get('/monitor/temp')).toBe(36.6);
  });

  it('only updates bound fields', () => {
    const store = createStateStore({ monitor: {} });
    const engine = createRealtimeEngine(store, {
      channels: {
        vitals: {
          source: 'ws://api/vitals/1',
          bind: { heartRate: '/monitor/heartRate' },
        },
      },
    });

    engine.simulateMessage('vitals', { heartRate: 72, unknownField: 'ignored' });
    expect(store.get('/monitor/heartRate')).toBe(72);
    expect(store.get('/monitor/unknownField')).toBeUndefined();
  });

  it('handles multiple channels independently', () => {
    const store = createStateStore({});
    const engine = createRealtimeEngine(store, {
      channels: {
        vitals: { source: 'ws://api/vitals', bind: { hr: '/vitals/hr' } },
        alerts: { source: 'ws://api/alerts', bind: { count: '/alerts/count' } },
      },
    });

    engine.simulateMessage('vitals', { hr: 80 });
    engine.simulateMessage('alerts', { count: 3 });

    expect(store.get('/vitals/hr')).toBe(80);
    expect(store.get('/alerts/count')).toBe(3);
  });

  it('ignores messages for unknown channels', () => {
    const store = createStateStore({});
    const engine = createRealtimeEngine(store, {
      channels: { vitals: { source: 'ws://api/vitals', bind: { hr: '/vitals/hr' } } },
    });

    engine.simulateMessage('unknown', { hr: 999 });
    expect(store.get('/vitals/hr')).toBeUndefined();
  });

  it('connect sets connection status', () => {
    const store = createStateStore({});
    const engine = createRealtimeEngine(store, {
      channels: {
        vitals: { source: 'ws://api/vitals', bind: { hr: '/v/hr' } },
      },
    });

    const cleanup = engine.connect();
    expect(store.get('/realtime/vitals/connected')).toBe(true);

    cleanup();
    expect(store.get('/realtime/vitals/connected')).toBe(false);
  });

  it('updates state reactively on each message', () => {
    const store = createStateStore({ monitor: { heartRate: 0 } });
    const engine = createRealtimeEngine(store, {
      channels: { vitals: { source: 'ws://api/vitals', bind: { heartRate: '/monitor/heartRate' } } },
    });

    engine.simulateMessage('vitals', { heartRate: 72 });
    expect(store.get('/monitor/heartRate')).toBe(72);

    engine.simulateMessage('vitals', { heartRate: 85 });
    expect(store.get('/monitor/heartRate')).toBe(85);
  });
});
