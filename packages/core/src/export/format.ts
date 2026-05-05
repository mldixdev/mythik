import type { ExportColumn } from './types.js';

export function formatExportValue(value: unknown, column: ExportColumn): string {
  if (value === null || value === undefined) return '';
  if (!column.format) return String(value);

  const locale = column.formatOptions?.locale ?? 'en-US';
  const decimals = column.formatOptions?.decimals;

  switch (column.format) {
    case 'currency': {
      const currency = column.formatOptions?.currency ?? 'USD';
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: decimals ?? 2,
        maximumFractionDigits: decimals ?? 2,
      }).format(Number(value));
    }
    case 'number': {
      const opts: Intl.NumberFormatOptions = {};
      if (decimals !== undefined) {
        opts.minimumFractionDigits = decimals;
        opts.maximumFractionDigits = decimals;
      }
      return new Intl.NumberFormat(locale, opts).format(Number(value));
    }
    case 'percent': {
      return new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: decimals ?? 0,
        maximumFractionDigits: decimals ?? 0,
      }).format(Number(value));
    }
    case 'date': {
      const d = new Date(value as string);
      if (isNaN(d.getTime())) return String(value);
      return d.toLocaleDateString(locale);
    }
    default:
      return String(value);
  }
}
