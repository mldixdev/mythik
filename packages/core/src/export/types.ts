export interface ExportColumn {
  field: string;
  label: string;
  format?: 'currency' | 'number' | 'percent' | 'date';
  formatOptions?: {
    currency?: string;
    decimals?: number;
    locale?: string;
  };
  width?: number;
}

export interface ExportData {
  columns: ExportColumn[];
  rows: Record<string, unknown>[];
  formattedRows: Record<string, string>[];
  title?: string;
  metadata?: Record<string, unknown>;
}

export interface ExportAdapter {
  generate(data: ExportData, format: string): Promise<Blob>;
}
