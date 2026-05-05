import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockInput, mockConnect, mockClose } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockInput: vi.fn().mockReturnThis(),
  mockConnect: vi.fn(),
  mockClose: vi.fn(),
}));

vi.mock('mssql', () => {
  const NVarCharFn = Object.assign(
    (size: unknown) => `NVarChar(${size})`,
  );
  const poolInstance = {
    request: () => ({ input: mockInput, query: mockQuery }),
    close: mockClose,
  };
  mockConnect.mockResolvedValue(poolInstance);
  return {
    default: {
      ConnectionPool: vi.fn().mockImplementation(() => ({
        connect: () => mockConnect(),
      })),
      NVarChar: NVarCharFn,
      MAX: 'MAX',
    },
  };
});

import { SqlServerSpecStore } from '../../src/spec-stores/sqlserver.js';

describe('SqlServerSpecStore', () => {
  const config = {
    server: 'localhost',
    database: 'testdb',
    user: 'sa',
    password: 'test',
  };

  beforeEach(() => {
    mockQuery.mockReset();
    mockInput.mockReset().mockReturnThis();
  });

  it('load returns parsed spec from recordset', async () => {
    const spec = { root: 'page', elements: { page: { type: 'box', props: {} } } };
    mockQuery.mockResolvedValue({ recordset: [{ spec: JSON.stringify(spec) }] });

    const store = new SqlServerSpecStore(config);
    const result = await store.load('test-screen');

    expect(result).toEqual(spec);
  });

  it('load throws when spec not found', async () => {
    mockQuery.mockResolvedValue({ recordset: [] });

    const store = new SqlServerSpecStore(config);
    await expect(store.load('missing')).rejects.toThrow('Spec "missing" not found');
  });

  it('load handles spec already parsed as object', async () => {
    const spec = { root: 'page', elements: { page: { type: 'box', props: {} } } };
    mockQuery.mockResolvedValue({ recordset: [{ spec }] });

    const store = new SqlServerSpecStore(config);
    const result = await store.load('test');

    expect(result).toEqual(spec);
  });

  it('save calls MERGE upsert', async () => {
    mockQuery.mockResolvedValue({});

    const store = new SqlServerSpecStore(config);
    await store.save('my-screen', { root: 'r', elements: { r: { type: 'box', props: {} } } });

    expect(mockQuery).toHaveBeenCalled();
    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain('MERGE [screens]');
    expect(sql).toContain('WHEN MATCHED');
    expect(sql).toContain('WHEN NOT MATCHED');
  });

  it('list returns array of screen ids', async () => {
    mockQuery.mockResolvedValue({
      recordset: [{ id: 'screen-a' }, { id: 'screen-b' }],
    });

    const store = new SqlServerSpecStore(config);
    const ids = await store.list();

    expect(ids).toEqual(['screen-a', 'screen-b']);
  });
});
