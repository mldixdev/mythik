import { describe, it, expect } from 'vitest';
import { createResolver } from '../../src/expressions/resolver.js';
import { createStateStore } from '../../src/state/store.js';

describe('$format extended options', () => {
  const store = createStateStore({ total: 1234567.89, negative: -500, zero: 0 });

  describe('locale override', () => {
    it('currency with explicit locale', () => {
      const resolver = createResolver({ store, locale: 'en' });
      const result = resolver.resolve({
        $format: 'currency',
        value: { $state: '/total' },
        currency: 'EUR',
        locale: 'de-DE',
      }) as string;
      // German locale uses . for thousands and , for decimals
      expect(result).toContain('1.234.567');
    });

    it('number with explicit locale', () => {
      const resolver = createResolver({ store, locale: 'en' });
      const result = resolver.resolve({
        $format: 'number',
        value: 1234.5,
        decimals: 2,
        locale: 'de-DE',
      }) as string;
      expect(result).toContain('1.234');
    });

    it('locale override via expression', () => {
      const store2 = createStateStore({ val: 1234.5, userLocale: 'fr-FR' });
      const resolver2 = createResolver({ store: store2 });
      const result = resolver2.resolve({
        $format: 'number',
        value: { $state: '/val' },
        decimals: 2,
        locale: { $state: '/userLocale' },
      }) as string;
      // French uses narrow no-break space as thousands separator
      expect(result).toMatch(/1.?234/);
    });
  });

  describe('notation', () => {
    it('compact notation', () => {
      const resolver = createResolver({ store, locale: 'en' });
      const result = resolver.resolve({
        $format: 'number',
        value: { $state: '/total' },
        notation: 'compact',
      }) as string;
      expect(result).toMatch(/M/);
    });

    it('scientific notation', () => {
      const resolver = createResolver({ store, locale: 'en' });
      const result = resolver.resolve({
        $format: 'number',
        value: { $state: '/total' },
        notation: 'scientific',
      }) as string;
      expect(result).toMatch(/E/);
    });
  });

  describe('signDisplay', () => {
    it('always shows sign', () => {
      const resolver = createResolver({ store, locale: 'en' });
      const result = resolver.resolve({
        $format: 'number',
        value: 1234,
        signDisplay: 'always',
      }) as string;
      expect(result).toContain('+');
    });

    it('exceptZero hides sign for zero', () => {
      const resolver = createResolver({ store, locale: 'en' });
      const positive = resolver.resolve({
        $format: 'number',
        value: 100,
        signDisplay: 'exceptZero',
      }) as string;
      const zeroResult = resolver.resolve({
        $format: 'number',
        value: 0,
        signDisplay: 'exceptZero',
      }) as string;
      expect(positive).toContain('+');
      expect(zeroResult).not.toContain('+');
    });
  });

  describe('useGrouping', () => {
    it('disables thousands separator', () => {
      const resolver = createResolver({ store, locale: 'en' });
      const result = resolver.resolve({
        $format: 'number',
        value: { $state: '/total' },
        useGrouping: false,
      }) as string;
      expect(result).not.toContain(',');
      expect(result).toContain('1234567');
    });
  });

  describe('backwards compatibility', () => {
    it('existing currency format still works', () => {
      const resolver = createResolver({ store, locale: 'en' });
      const result = resolver.resolve({
        $format: 'currency',
        value: { $state: '/total' },
        currency: 'USD',
      }) as string;
      expect(result).toContain('$');
      expect(result).toContain('1,234,567.89');
    });

    it('existing number format still works', () => {
      const resolver = createResolver({ store, locale: 'en' });
      const result = resolver.resolve({
        $format: 'number',
        value: 1234.5,
        decimals: 2,
      }) as string;
      expect(result).toContain('1,234.50');
    });
  });
});
