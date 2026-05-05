import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createStateStore } from '../../src/state/store.js';
import { createActionDispatcher } from '../../src/actions/dispatcher.js';
import type { ExportAdapter } from '../../src/export/types.js';

// Mock URL.createObjectURL/revokeObjectURL for jsdom
beforeEach(() => {
  if (!URL.createObjectURL) {
    (URL as unknown as Record<string, unknown>).createObjectURL = vi.fn().mockReturnValue('blob:mock');
  } else {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
  }
  if (!URL.revokeObjectURL) {
    (URL as unknown as Record<string, unknown>).revokeObjectURL = vi.fn();
  } else {
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('export action', () => {
  function setup(exportAdapters?: Record<string, ExportAdapter>) {
    const store = createStateStore();
    store.set('/tasks', [
      { id: 1, title: 'Task A', price: 10.5 },
      { id: 2, title: 'Task B', price: 20 },
    ]);
    const dispatcher = createActionDispatcher({ store, exportAdapters });
    const resolve = (expr: unknown) => {
      if (typeof expr === 'object' && expr !== null && '$state' in expr) {
        return store.get((expr as Record<string, string>).$state);
      }
      return expr;
    };
    return { store, dispatcher, resolve };
  }

  function mockDownload() {
    const clickFn = vi.fn();
    const createElementOrig = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        const el = createElementOrig('a');
        el.click = clickFn;
        return el;
      }
      return createElementOrig(tag);
    });
    return clickFn;
  }

  it('generates CSV and triggers download for format csv', async () => {
    const { dispatcher, resolve } = setup();
    const clickFn = mockDownload();

    await dispatcher.dispatch({
      action: 'export',
      params: {
        source: '/tasks',
        columns: [
          { field: 'title', label: 'Title' },
          { field: 'price', label: 'Price', format: 'number', formatOptions: { decimals: 2 } },
        ],
        filename: 'report',
        format: 'csv',
      },
    }, resolve);

    expect(clickFn).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('calls export adapter for non-csv format', async () => {
    const generateFn = vi.fn().mockResolvedValue(new Blob(['xlsx-data']));
    const adapter: ExportAdapter = { generate: generateFn };
    const { dispatcher, resolve } = setup({ xlsx: adapter });
    const clickFn = mockDownload();

    await dispatcher.dispatch({
      action: 'export',
      params: {
        source: '/tasks',
        columns: [{ field: 'title', label: 'Title' }],
        filename: 'report',
        format: 'xlsx',
      },
    }, resolve);

    expect(generateFn).toHaveBeenCalledTimes(1);
    expect(generateFn.mock.calls[0][1]).toBe('xlsx');
    expect(clickFn).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('warns when adapter not found for format', async () => {
    const { dispatcher, resolve } = setup();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await dispatcher.dispatch({
      action: 'export',
      params: {
        source: '/tasks',
        columns: [{ field: 'title', label: 'Title' }],
        filename: 'report',
        format: 'xlsx',
      },
    }, resolve);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No export adapter'));
    warnSpy.mockRestore();
  });

  it('defaults format to csv when not specified', async () => {
    const { dispatcher, resolve } = setup();
    const clickFn = mockDownload();

    await dispatcher.dispatch({
      action: 'export',
      params: {
        source: '/tasks',
        columns: [{ field: 'title', label: 'Title' }],
        filename: 'report',
      },
    }, resolve);

    expect(clickFn).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('handles empty source array', async () => {
    const store = createStateStore();
    store.set('/empty', []);
    const dispatcher = createActionDispatcher({ store });
    const clickFn = mockDownload();

    await dispatcher.dispatch({
      action: 'export',
      params: {
        source: '/empty',
        columns: [{ field: 'title', label: 'Title' }],
        filename: 'report',
        format: 'csv',
      },
    }, (expr) => {
      if (typeof expr === 'object' && expr !== null && '$state' in expr) {
        return store.get((expr as Record<string, string>).$state);
      }
      return expr;
    });

    expect(clickFn).toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
