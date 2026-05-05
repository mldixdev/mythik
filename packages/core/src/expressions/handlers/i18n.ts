import type { ExpressionHandlerDefinition, ResolverContext, ResolveFn } from '../../types.js';

/**
 * $i18n resolves a translation key using the current locale.
 * Usage: { "$i18n": "patient.name" }
 * With args: { "$i18n": "welcome", "args": { "name": { "$state": "/user/name" } } }
 */
export const i18nHandler: ExpressionHandlerDefinition = {
  key: '$i18n',
  resolve(expr: Record<string, unknown>, context: ResolverContext, resolveFn?: ResolveFn): unknown {
    const resolve = resolveFn ?? ((e: unknown) => e);
    const key = expr.$i18n as string;
    const argsExpr = expr.args as Record<string, unknown> | undefined;

    // Dynamic locale: read from state first (like $token reads /preferences/theme),
    // fall back to static config locale, then default to 'en'
    const stateLocale = context.getState('/preferences/locale') as string | undefined;
    const locale = stateLocale ?? context.locale ?? 'en';
    const translations = context.translations;
    if (!translations) return key;

    const localeTranslations = translations[locale];
    if (!localeTranslations) return key;

    let value = localeTranslations[key];
    if (value === undefined) return key;

    // Resolve and interpolate args
    if (argsExpr) {
      for (const [argKey, argVal] of Object.entries(argsExpr)) {
        const resolved = resolve(argVal);
        value = value.replace(new RegExp(`\\{${argKey}\\}`, 'g'), String(resolved ?? ''));
      }
    }

    return value;
  },
};
