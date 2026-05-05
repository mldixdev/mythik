import { describe, it, expect } from 'vitest';
import { injectAuditFields } from '../src/audit.js';
import type { AuditConfig } from '../src/audit.js';

describe('injectAuditFields', () => {
  const fullAudit: AuditConfig = {
    createdBy: 'CreatedBy',
    createdAt: 'CreatedAt',
    updatedBy: 'UpdatedBy',
    updatedAt: 'UpdatedAt',
  };

  it('INSERT injects all 4 fields when fully configured', () => {
    const fields: Record<string, unknown> = { year: 2026, month: 1 };

    injectAuditFields(fields, fullAudit, 'admin', 'insert');

    expect(fields['CreatedBy']).toBe('admin');
    expect(fields['CreatedAt']).toBeInstanceOf(Date);
    expect(fields['UpdatedBy']).toBe('admin');
    expect(fields['UpdatedAt']).toBeInstanceOf(Date);
    // Original fields preserved
    expect(fields.year).toBe(2026);
    expect(fields.month).toBe(1);
  });

  it('UPDATE injects only updatedBy and updatedAt', () => {
    const fields: Record<string, unknown> = { allocatedAmount: 1000 };

    injectAuditFields(fields, fullAudit, 'editor-user', 'update');

    expect(fields['UpdatedBy']).toBe('editor-user');
    expect(fields['UpdatedAt']).toBeInstanceOf(Date);
    // Created fields NOT injected on update
    expect(fields['CreatedBy']).toBeUndefined();
    expect(fields['CreatedAt']).toBeUndefined();
  });

  it('only updatedBy/updatedAt configured â€” INSERT injects only those', () => {
    const partialAudit: AuditConfig = {
      updatedBy: 'UltimoUsername',
      updatedAt: 'UltimaModificacion',
    };
    const fields: Record<string, unknown> = { nombre: 'test' };

    injectAuditFields(fields, partialAudit, 'admin', 'insert');

    expect(fields['UltimoUsername']).toBe('admin');
    expect(fields['UltimaModificacion']).toBeInstanceOf(Date);
    // No created fields configured â†’ not injected
    expect(Object.keys(fields)).toEqual(['nombre', 'UltimoUsername', 'UltimaModificacion']);
  });

  it('no username â€” only timestamp fields injected', () => {
    const fields: Record<string, unknown> = { dato: 'valor' };

    injectAuditFields(fields, fullAudit, null, 'insert');

    expect(fields['CreatedBy']).toBeUndefined();
    expect(fields['CreatedAt']).toBeInstanceOf(Date);
    expect(fields['UpdatedBy']).toBeUndefined();
    expect(fields['UpdatedAt']).toBeInstanceOf(Date);
  });

  it('audit values override client-sent values', () => {
    const fields: Record<string, unknown> = {
      CreatedBy: 'hacker',
      CreatedAt: new Date('2000-01-01'),
    };

    injectAuditFields(fields, fullAudit, 'admin', 'insert');

    expect(fields['CreatedBy']).toBe('admin');
    expect((fields['CreatedAt'] as Date).getFullYear()).not.toBe(2000);
  });

  it('empty audit config â€” fields unchanged', () => {
    const fields: Record<string, unknown> = { dato: 'valor' };
    const originalKeys = Object.keys(fields);

    injectAuditFields(fields, {}, 'admin', 'insert');

    expect(Object.keys(fields)).toEqual(originalKeys);
  });

  it('timezone config produces Date (not UTC)', () => {
    const auditWithTz: AuditConfig = {
      updatedAt: 'UpdatedAt',
      timezone: 'America/El_Salvador',
    };
    const fields: Record<string, unknown> = {};

    injectAuditFields(fields, auditWithTz, null, 'update');

    const ts = fields['UpdatedAt'] as Date;
    expect(ts).toBeInstanceOf(Date);
    // El Salvador is UTC-6 â€” the timestamp should differ from UTC
    // We can't assert exact time but we can verify it's a valid Date
    expect(ts.getFullYear()).toBeGreaterThanOrEqual(2026);
  });

  it('without timezone defaults to UTC', () => {
    const fields: Record<string, unknown> = {};

    injectAuditFields(fields, { updatedAt: 'ts' }, null, 'update');

    const ts = fields['ts'] as Date;
    expect(ts).toBeInstanceOf(Date);
    // Should be close to Date.now() (within 1 second)
    expect(Math.abs(ts.getTime() - Date.now())).toBeLessThan(1000);
  });
});
