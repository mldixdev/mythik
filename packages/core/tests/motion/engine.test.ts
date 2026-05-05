import { describe, it, expect } from 'vitest';
import { resolveMotionConfig, calculateTimeline } from '../../src/motion/engine.js';

describe('Motion Engine', () => {
  describe('resolveMotionConfig', () => {
    it('resolves $token references in duration', () => {
      const resolve = (expr: unknown) => {
        if (expr && typeof expr === 'object' && '$token' in (expr as Record<string, unknown>)) {
          const path = (expr as Record<string, unknown>).$token as string;
          if (path === 'motion.fast') return '150ms ease-out';
          if (path === 'motion.normal') return '250ms ease-in-out';
          if (path === 'motion.slow') return '400ms ease-in-out';
        }
        return expr;
      };

      const result = resolveMotionConfig({
        onMount: {
          sequence: [
            { target: 'header', animation: 'fadeInDown', duration: { $token: 'motion.fast' } },
            { target: 'cards', animation: 'fadeInUp', duration: { $token: 'motion.normal' }, stagger: 100 },
            { target: 'footer', animation: 'fadeIn', duration: { $token: 'motion.slow' }, delay: 200 },
          ],
        },
      }, resolve);

      const onMount = result.onMount as { steps: Array<{ duration: string; target: string }> };
      expect(onMount.steps).toHaveLength(3);
      expect(onMount.steps[0].duration).toBe('150ms ease-out');
      expect(onMount.steps[1].duration).toBe('250ms ease-in-out');
      expect(onMount.steps[2].duration).toBe('400ms ease-in-out');
    });

    it('resolves onStateChange config', () => {
      const resolve = (expr: unknown) => {
        if (expr && typeof expr === 'object' && '$token' in (expr as Record<string, unknown>)) return '200ms';
        return expr;
      };

      const result = resolveMotionConfig({
        onStateChange: { path: '/activeTab', animation: 'fadeIn', duration: { $token: 'motion.fast' } },
      }, resolve);

      const osc = result.onStateChange as Record<string, unknown>;
      expect(osc.duration).toBe('200ms');
      expect(osc.path).toBe('/activeTab');
    });

    it('passes through literal durations', () => {
      const result = resolveMotionConfig({
        onMount: {
          sequence: [
            { target: 'box', animation: 'fadeIn', duration: 300 },
          ],
        },
      }, (e) => e);

      const onMount = result.onMount as { steps: Array<{ duration: number }> };
      expect(onMount.steps[0].duration).toBe(300);
    });
  });

  describe('calculateTimeline', () => {
    it('creates sequential timeline from steps', () => {
      const timeline = calculateTimeline({
        steps: [
          { target: 'header', animation: 'fadeIn', duration: 150, delay: 0, stagger: 0 },
          { target: 'body', animation: 'slideUp', duration: 250, delay: 0, stagger: 0 },
          { target: 'footer', animation: 'fadeIn', duration: 150, delay: 0, stagger: 0 },
        ],
      });

      expect(timeline).toHaveLength(3);
      expect(timeline[0]).toEqual({ target: 'header', animation: 'fadeIn', startMs: 0, durationMs: 150 });
      expect(timeline[1]).toEqual({ target: 'body', animation: 'slideUp', startMs: 150, durationMs: 250 });
      expect(timeline[2]).toEqual({ target: 'footer', animation: 'fadeIn', startMs: 400, durationMs: 150 });
    });

    it('accounts for delays', () => {
      const timeline = calculateTimeline({
        steps: [
          { target: 'a', animation: 'fadeIn', duration: 100, delay: 50, stagger: 0 },
          { target: 'b', animation: 'fadeIn', duration: 100, delay: 200, stagger: 0 },
        ],
      });

      expect(timeline[0].startMs).toBe(50);
      expect(timeline[1].startMs).toBe(350); // 50 + 100 + 200
    });

    it('parses string durations', () => {
      const timeline = calculateTimeline({
        steps: [
          { target: 'a', animation: 'fadeIn', duration: '0.3s', delay: 0, stagger: 0 },
          { target: 'b', animation: 'fadeIn', duration: '150ms', delay: 0, stagger: 0 },
        ],
      });

      expect(timeline[0].durationMs).toBe(300);
      expect(timeline[1].durationMs).toBe(150);
      expect(timeline[1].startMs).toBe(300);
    });

    it('parses duration with easing suffix', () => {
      const timeline = calculateTimeline({
        steps: [
          { target: 'a', animation: 'fadeIn', duration: '250ms ease-out', delay: 0, stagger: 0 },
        ],
      });
      expect(timeline[0].durationMs).toBe(250);
    });
  });
});
