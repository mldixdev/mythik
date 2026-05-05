/**
 * Export engine — generates data in various formats.
 * Actual file creation/download is handled by the renderer layer.
 * This module prepares the data.
 */

export interface ExportConfig {
  format: 'csv' | 'json' | 'excel';
  columns?: ExportColumn[];
  filename?: string;
}

export interface ExportColumn {
  field: string;
  label: string;
  format?: (value: unknown) => string;
}

/**
 * Generate CSV string from data array.
 */
export function toCSV(data: Record<string, unknown>[], columns?: ExportColumn[]): string {
  if (data.length === 0) return '';

  const cols: ExportColumn[] = columns ?? Object.keys(data[0]).map((field) => ({ field, label: field }));

  // Header
  const header = cols.map((c) => escapeCSV(c.label)).join(',');

  // Rows
  const rows = data.map((row) =>
    cols.map((col) => {
      const value = row[col.field];
      const formatted = col.format ? col.format(value) : String(value ?? '');
      return escapeCSV(formatted);
    }).join(','),
  );

  return [header, ...rows].join('\n');
}

/**
 * Generate JSON string from data array.
 */
export function toJSON(data: Record<string, unknown>[], columns?: ExportColumn[]): string {
  if (!columns) return JSON.stringify(data, null, 2);

  const filtered = data.map((row) => {
    const obj: Record<string, unknown> = {};
    for (const col of columns) {
      obj[col.label] = col.format ? col.format(row[col.field]) : row[col.field];
    }
    return obj;
  });

  return JSON.stringify(filtered, null, 2);
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
