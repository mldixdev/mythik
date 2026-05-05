import type { ExportData } from './types.js';

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function generateCSV(data: ExportData): Blob {
  const header = data.columns.map((c) => escapeCSV(c.label)).join(',');

  const rows = data.formattedRows.map((row) =>
    data.columns.map((col) => {
      const val = row[col.field] ?? '';
      return escapeCSV(val);
    }).join(','),
  );

  const csv = [header, ...rows].join('\n');
  return new Blob([csv], { type: 'text/csv;charset=utf-8' });
}
