import type { ExpressionHandlerDefinition, ResolverContext, ResolveFn } from '../../types.js';

/**
 * $format — value formatting without code.
 *
 * Usage:
 *   { "$format": "currency", "value": { "$state": "/price" }, "currency": "USD" }
 *   { "$format": "currency", "value": 1234, "currency": "HNL", "locale": "es-HN" }
 *   { "$format": "number", "value": 1234.5, "decimals": 2 }
 *   { "$format": "number", "value": 1234567, "notation": "compact" }
 *   { "$format": "number", "value": -500, "signDisplay": "always" }
 *   { "$format": "percent", "value": 0.75 }
 *   { "$format": "phone", "value": { "$state": "/phone" } }
 *   { "$format": "uppercase", "value": { "$state": "/name" } }
 *   { "$format": "lowercase", "value": { "$state": "/email" } }
 *   { "$format": "capitalize", "value": "hello world" }
 *   { "$format": "truncate", "value": "long text...", "length": 20 }
 */
export const formatHandler: ExpressionHandlerDefinition = {
  key: '$format',
  resolve(expr: Record<string, unknown>, context: ResolverContext, resolveFn?: ResolveFn): unknown {
    const resolve = resolveFn ?? ((e: unknown) => e);
    const op = expr.$format as string;
    const value = resolve(expr.value);
    const contextLocale = context.locale ?? 'en';

    // Locale can be an expression (e.g., { $state: "/userLocale" }) or a plain string
    const localeRaw = expr.locale !== undefined ? resolve(expr.locale) : contextLocale;
    const locale = typeof localeRaw === 'string' ? localeRaw : contextLocale;

    switch (op) {
      case 'currency': {
        const num = Number(value);
        if (Number.isNaN(num)) return String(value);
        const currency = (resolve(expr.currency) as string) ?? 'USD';
        const options: Intl.NumberFormatOptions = { style: 'currency', currency };
        if (expr.notation) options.notation = expr.notation as Intl.NumberFormatOptions['notation'];
        if (expr.signDisplay) options.signDisplay = expr.signDisplay as Intl.NumberFormatOptions['signDisplay'];
        if (expr.useGrouping !== undefined) options.useGrouping = expr.useGrouping as boolean;
        return new Intl.NumberFormat(locale, options).format(num);
      }

      case 'number': {
        const num = Number(value);
        if (Number.isNaN(num)) return String(value);
        const decimals = expr.decimals as number | undefined;
        const options: Intl.NumberFormatOptions = {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        };
        if (expr.notation) options.notation = expr.notation as Intl.NumberFormatOptions['notation'];
        if (expr.signDisplay) options.signDisplay = expr.signDisplay as Intl.NumberFormatOptions['signDisplay'];
        if (expr.useGrouping !== undefined) options.useGrouping = expr.useGrouping as boolean;
        return new Intl.NumberFormat(locale, options).format(num);
      }

      case 'percent': {
        const num = Number(value);
        if (Number.isNaN(num)) return String(value);
        const options: Intl.NumberFormatOptions = { style: 'percent', maximumFractionDigits: 1 };
        if (expr.signDisplay) options.signDisplay = expr.signDisplay as Intl.NumberFormatOptions['signDisplay'];
        return new Intl.NumberFormat(locale, options).format(num);
      }

      case 'phone': {
        const str = String(value ?? '').replace(/\D/g, '');
        if (str.length === 10) return `(${str.slice(0, 3)}) ${str.slice(3, 6)}-${str.slice(6)}`;
        if (str.length === 7) return `${str.slice(0, 3)}-${str.slice(3)}`;
        return String(value);
      }

      case 'uppercase':
        return String(value ?? '').toUpperCase();

      case 'lowercase':
        return String(value ?? '').toLowerCase();

      case 'capitalize':
        return String(value ?? '').replace(/\b\w/g, (c) => c.toUpperCase());

      case 'truncate': {
        const str = String(value ?? '');
        const length = (expr.length as number) ?? 50;
        const suffix = (expr.suffix as string) ?? '...';
        return str.length > length ? str.slice(0, length) + suffix : str;
      }

      default:
        throw new Error(`Unknown $format operation: "${op}"`);
    }
  },
};
