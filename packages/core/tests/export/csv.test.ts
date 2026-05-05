import { describe, it, expect } from 'vitest';
import { generateCSV } from '../../src/export/csv.js';

describe('generateCSV', () => {
  const columns = [
    { field: 'name', label: 'Name' },
    { field: 'price', label: 'Price', format: 'currency' as const, formatOptions: { currency: 'USD' } },
  ];

  it('generates blob with correct MIME type', () => {
    const blob = generateCSV({ columns, rows: [], formattedRows: [] });
    expect(blob.type).toBe('text/csv;charset=utf-8');
  });

  it('generates CSV with formatted values', async () => {
    const rows = [{ name: 'Widget', price: 9.99 }];
    const formattedRows = [{ name: 'Widget', price: '$9.99' }];
    const blob = generateCSV({ columns, rows, formattedRows });
    const text = await blob.text();
    expect(text).toContain('Name,Price');
    expect(text).toContain('Widget,$9.99');
  });

  it('escapes commas in values', async () => {
    const rows = [{ name: 'Widget, Large', price: 10 }];
    const formattedRows = [{ name: 'Widget, Large', price: '10' }];
    const blob = generateCSV({ columns, rows, formattedRows });
    const text = await blob.text();
    expect(text).toContain('"Widget, Large"');
  });

  it('escapes quotes in values', async () => {
    const rows = [{ name: 'The "Best"', price: 10 }];
    const formattedRows = [{ name: 'The "Best"', price: '10' }];
    const blob = generateCSV({ columns, rows, formattedRows });
    const text = await blob.text();
    expect(text).toContain('"The ""Best"""');
  });

  it('escapes newlines in values', async () => {
    const rows = [{ name: 'Line1\nLine2', price: 5 }];
    const formattedRows = [{ name: 'Line1\nLine2', price: '5' }];
    const blob = generateCSV({ columns, rows, formattedRows });
    const text = await blob.text();
    expect(text).toContain('"Line1\nLine2"');
  });

  it('handles empty rows — headers only', async () => {
    const blob = generateCSV({ columns, rows: [], formattedRows: [] });
    const text = await blob.text();
    expect(text).toBe('Name,Price');
  });

  it('handles null/undefined values', async () => {
    const rows = [{ name: null, price: undefined }];
    const formattedRows = [{ name: '', price: '' }];
    const blob = generateCSV({ columns, rows, formattedRows });
    const text = await blob.text();
    const lines = text.split('\n');
    expect(lines[1]).toBe(',');
  });
});
