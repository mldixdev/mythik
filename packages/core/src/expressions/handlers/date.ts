import type { ExpressionHandlerDefinition, ResolverContext, ResolveFn } from '../../types.js';

/**
 * $date — date operations without code.
 *
 * Usage:
 *   { "$date": "age", "from": { "$state": "/patient/birthDate" } }
 *   { "$date": "now" }
 *   { "$date": "today" }
 *   { "$date": "diff", "from": { "$state": "/start" }, "to": { "$state": "/end" }, "unit": "days" }
 *   { "$date": "format", "value": { "$state": "/date" }, "pattern": "short" }
 *   { "$date": "add", "value": { "$state": "/date" }, "amount": 7, "unit": "days" }
 */
export const dateHandler: ExpressionHandlerDefinition = {
  key: '$date',
  resolve(expr: Record<string, unknown>, context: ResolverContext, resolveFn?: ResolveFn): unknown {
    const resolve = resolveFn ?? ((e: unknown) => e);
    const op = expr.$date as string;

    switch (op) {
      case 'now':
        return new Date().toISOString();

      case 'today':
        return new Date().toISOString().split('T')[0];

      case 'age': {
        const from = resolve(expr.from) as string;
        if (!from) return 0;
        const birth = new Date(from);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
      }

      case 'diff': {
        const from = new Date(resolve(expr.from) as string);
        const to = expr.to ? new Date(resolve(expr.to) as string) : new Date();
        const unit = (expr.unit as string) ?? 'days';
        const diffMs = to.getTime() - from.getTime();

        switch (unit) {
          case 'milliseconds': return diffMs;
          case 'seconds': return Math.floor(diffMs / 1000);
          case 'minutes': return Math.floor(diffMs / 60000);
          case 'hours': return Math.floor(diffMs / 3600000);
          case 'days': return Math.floor(diffMs / 86400000);
          case 'weeks': return Math.floor(diffMs / 604800000);
          case 'months': return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
          case 'years': return to.getFullYear() - from.getFullYear();
          default: return Math.floor(diffMs / 86400000);
        }
      }

      case 'format': {
        const value = resolve(expr.value) as string;
        if (!value) return '';
        const date = new Date(value);
        const locale = context.locale ?? 'en';
        const pattern = (expr.pattern as string) ?? 'short';

        const options: Record<string, Intl.DateTimeFormatOptions> = {
          short: { year: 'numeric', month: 'short', day: 'numeric' },
          long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
          numeric: { year: 'numeric', month: '2-digit', day: '2-digit' },
          time: { hour: '2-digit', minute: '2-digit' },
          datetime: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
        };

        return new Intl.DateTimeFormat(locale, options[pattern] ?? options.short).format(date);
      }

      case 'add': {
        const value = new Date(resolve(expr.value) as string);
        const amount = Number(expr.amount ?? 0);
        const unit = (expr.unit as string) ?? 'days';

        switch (unit) {
          case 'days': value.setDate(value.getDate() + amount); break;
          case 'months': value.setMonth(value.getMonth() + amount); break;
          case 'years': value.setFullYear(value.getFullYear() + amount); break;
          case 'hours': value.setHours(value.getHours() + amount); break;
          case 'minutes': value.setMinutes(value.getMinutes() + amount); break;
        }

        return value.toISOString().split('T')[0];
      }

      default:
        throw new Error(`Unknown $date operation: "${op}"`);
    }
  },
};
