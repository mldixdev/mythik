export interface I18nConfig {
  defaultLocale: string;
  supportedLocales: string[];
  translations: Record<string, Record<string, string>>; // locale → key → value
}

export interface I18nEngine {
  t: (key: string, args?: Record<string, unknown>) => string;
  getLocale: () => string;
  setLocale: (locale: string) => void;
  pluralize: (key: string, count: number, args?: Record<string, unknown>) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
}

export function createI18nEngine(config: I18nConfig): I18nEngine {
  let currentLocale = config.defaultLocale;

  function t(key: string, args?: Record<string, unknown>): string {
    const localeTranslations = config.translations[currentLocale];
    if (!localeTranslations) return key;

    let value = localeTranslations[key];
    if (value === undefined) {
      // Fallback to default locale
      const fallback = config.translations[config.defaultLocale];
      value = fallback?.[key];
    }
    if (value === undefined) return key;

    // Interpolate args: "Hello, {name}!" with { name: "Alice" } → "Hello, Alice!"
    if (args) {
      for (const [argKey, argVal] of Object.entries(args)) {
        value = value.replace(new RegExp(`\\{${argKey}\\}`, 'g'), String(argVal ?? ''));
      }
    }

    return value;
  }

  function getLocale(): string {
    return currentLocale;
  }

  function setLocale(locale: string): void {
    if (config.supportedLocales.includes(locale)) {
      currentLocale = locale;
    }
  }

  function pluralize(key: string, count: number, args?: Record<string, unknown>): string {
    // Convention: key.zero, key.one, key.other
    const mergedArgs = { ...args, count };
    if (count === 0) {
      const zeroKey = `${key}.zero`;
      const zeroVal = t(zeroKey, mergedArgs);
      if (zeroVal !== zeroKey) return zeroVal;
    }
    if (count === 1) {
      const oneKey = `${key}.one`;
      const oneVal = t(oneKey, mergedArgs);
      if (oneVal !== oneKey) return oneVal;
    }
    const otherKey = `${key}.other`;
    const otherVal = t(otherKey, mergedArgs);
    if (otherVal !== otherKey) return otherVal;
    return t(key, mergedArgs);
  }

  function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(currentLocale, options).format(value);
  }

  function formatDate(value: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
    const date = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat(currentLocale, options).format(date);
  }

  return { t, getLocale, setLocale, pluralize, formatNumber, formatDate };
}
