import { describe, it, expect } from 'vitest';
import { createResolver } from '../../src/expressions/resolver.js';
import { createStateStore } from '../../src/state/store.js';

describe('$i18n expression handler', () => {
  const translations = {
    en: { 'greeting': 'Hello, {name}!', 'save': 'Save' },
    es: { 'greeting': 'Hola, {name}!', 'save': 'Guardar' },
  };

  it('resolves a simple translation key', () => {
    const store = createStateStore({});
    const resolver = createResolver({ store, locale: 'en', translations });
    expect(resolver.resolve({ $i18n: 'save' })).toBe('Save');
  });

  it('resolves translation in different locale', () => {
    const store = createStateStore({});
    const resolver = createResolver({ store, locale: 'es', translations });
    expect(resolver.resolve({ $i18n: 'save' })).toBe('Guardar');
  });

  it('resolves translation with $state args', () => {
    const store = createStateStore({ user: { name: 'Alice' } });
    const resolver = createResolver({ store, locale: 'en', translations });
    expect(resolver.resolve({
      $i18n: 'greeting',
      args: { name: { $state: '/user/name' } },
    })).toBe('Hello, Alice!');
  });

  it('resolves translation with $state args in Spanish', () => {
    const store = createStateStore({ user: { name: 'Alice' } });
    const resolver = createResolver({ store, locale: 'es', translations });
    expect(resolver.resolve({
      $i18n: 'greeting',
      args: { name: { $state: '/user/name' } },
    })).toBe('Hola, Alice!');
  });

  it('returns key for missing translation', () => {
    const store = createStateStore({});
    const resolver = createResolver({ store, locale: 'en', translations });
    expect(resolver.resolve({ $i18n: 'missing.key' })).toBe('missing.key');
  });
});

describe('$i18n dynamic locale from state', () => {
  const translations = {
    en: { hello: 'Hello' },
    es: { hello: 'Hola' },
  };

  it('reads locale from /preferences/locale state', () => {
    const store = createStateStore({ preferences: { locale: 'en' } });
    const resolver = createResolver({ store, translations });
    expect(resolver.resolve({ $i18n: 'hello' })).toBe('Hello');

    store.set('/preferences/locale', 'es');
    expect(resolver.resolve({ $i18n: 'hello' })).toBe('Hola');
  });
});
