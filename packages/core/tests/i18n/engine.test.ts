import { describe, it, expect } from 'vitest';
import { createI18nEngine } from '../../src/i18n/engine.js';

describe('I18nEngine', () => {
  const config = {
    defaultLocale: 'en',
    supportedLocales: ['en', 'es'],
    translations: {
      en: {
        'patient.name': 'Name',
        'patient.save': 'Save',
        'welcome': 'Welcome, {name}!',
        'items.zero': 'No items',
        'items.one': '1 item',
        'items.other': '{count} items',
      },
      es: {
        'patient.name': 'Nombre',
        'patient.save': 'Guardar',
        'welcome': 'Bienvenido, {name}!',
        'items.zero': 'Sin elementos',
        'items.one': '1 elemento',
        'items.other': '{count} elementos',
      },
    },
  };

  it('translates a key in default locale', () => {
    const i18n = createI18nEngine(config);
    expect(i18n.t('patient.name')).toBe('Name');
  });

  it('translates after switching locale', () => {
    const i18n = createI18nEngine(config);
    i18n.setLocale('es');
    expect(i18n.t('patient.name')).toBe('Nombre');
    expect(i18n.t('patient.save')).toBe('Guardar');
  });

  it('interpolates args', () => {
    const i18n = createI18nEngine(config);
    expect(i18n.t('welcome', { name: 'Alice' })).toBe('Welcome, Alice!');
  });

  it('interpolates args in Spanish', () => {
    const i18n = createI18nEngine(config);
    i18n.setLocale('es');
    expect(i18n.t('welcome', { name: 'Alice' })).toBe('Bienvenido, Alice!');
  });

  it('returns key for missing translation', () => {
    const i18n = createI18nEngine(config);
    expect(i18n.t('nonexistent.key')).toBe('nonexistent.key');
  });

  it('falls back to default locale', () => {
    const i18n = createI18nEngine({
      ...config,
      translations: {
        ...config.translations,
        fr: { 'patient.name': 'Nom' }, // partial translations
      },
      supportedLocales: ['en', 'es', 'fr'],
    });
    i18n.setLocale('fr');
    expect(i18n.t('patient.name')).toBe('Nom');
    expect(i18n.t('patient.save')).toBe('Save'); // Falls back to en
  });

  it('ignores unsupported locale', () => {
    const i18n = createI18nEngine(config);
    i18n.setLocale('jp');
    expect(i18n.getLocale()).toBe('en'); // Unchanged
  });

  describe('pluralization', () => {
    it('uses zero form', () => {
      const i18n = createI18nEngine(config);
      expect(i18n.pluralize('items', 0)).toBe('No items');
    });

    it('uses one form', () => {
      const i18n = createI18nEngine(config);
      expect(i18n.pluralize('items', 1)).toBe('1 item');
    });

    it('uses other form with count', () => {
      const i18n = createI18nEngine(config);
      expect(i18n.pluralize('items', 5)).toBe('5 items');
    });

    it('pluralizes in Spanish', () => {
      const i18n = createI18nEngine(config);
      i18n.setLocale('es');
      expect(i18n.pluralize('items', 0)).toBe('Sin elementos');
      expect(i18n.pluralize('items', 1)).toBe('1 elemento');
      expect(i18n.pluralize('items', 10)).toBe('10 elementos');
    });
  });

  describe('formatting', () => {
    it('formats numbers per locale', () => {
      const i18n = createI18nEngine(config);
      const result = i18n.formatNumber(1234.56, { style: 'currency', currency: 'USD' });
      expect(result).toContain('1,234.56');
    });

    it('formats dates', () => {
      const i18n = createI18nEngine(config);
      const result = i18n.formatDate(new Date('2026-03-28'), { year: 'numeric', month: 'long', day: 'numeric' });
      expect(result).toContain('2026');
    });
  });
});
