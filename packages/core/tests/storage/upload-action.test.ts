import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUploadHandler, createDeleteHandler, validateUploadFile } from '../../src/storage/upload-action.js';
import { createStateStore } from '../../src/state/store.js';
import type { StorageAdapter, StorageAdapterConfig } from '../../src/storage/types.js';

function createMockAdapter(): StorageAdapter {
  return {
    upload: vi.fn().mockResolvedValue({ url: 'https://cdn.test/uploaded.jpg' }),
    delete: vi.fn().mockResolvedValue(undefined),
  };
}

describe('validateUploadFile', () => {
  it('rejects file exceeding maxSize', () => {
    const file = new File(['x'], 'big.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 20_000_000 });
    const result = validateUploadFile(file, '*', 10_485_760, {});
    expect(result).toContain('too large');
  });

  it('rejects file not matching accept MIME', () => {
    const file = new File(['hello'], 'doc.pdf', { type: 'application/pdf' });
    const result = validateUploadFile(file, 'image/*', 10_485_760, {});
    expect(result).toContain('not allowed');
  });

  it('rejects file not matching accept extension', () => {
    const file = new File(['hello'], 'photo.png', { type: 'image/png' });
    const result = validateUploadFile(file, '.jpg,.jpeg', 10_485_760, {});
    expect(result).toContain('not allowed');
  });

  it('passes valid file with wildcard accept', () => {
    const file = new File(['hello'], 'photo.jpg', { type: 'image/jpeg' });
    const result = validateUploadFile(file, '*', 10_485_760, {});
    expect(result).toBeNull();
  });

  it('passes valid file matching MIME category', () => {
    const file = new File(['hello'], 'photo.png', { type: 'image/png' });
    const result = validateUploadFile(file, 'image/*', 10_485_760, {});
    expect(result).toBeNull();
  });

  it('passes valid file matching exact MIME', () => {
    const file = new File(['hello'], 'photo.jpg', { type: 'image/jpeg' });
    const result = validateUploadFile(file, 'image/jpeg', 10_485_760, {});
    expect(result).toBeNull();
  });

  it('rejects file blocked by global allowedTypes', () => {
    const file = new File(['hello'], 'script.js', { type: 'text/javascript' });
    const result = validateUploadFile(file, '*', 10_485_760, { allowedTypes: ['image/jpeg', 'image/png'] });
    expect(result).toContain('not allowed');
  });

  it('rejects file blocked by global maxSize', () => {
    const file = new File(['x'], 'big.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 6_000_000 });
    const result = validateUploadFile(file, '*', 10_485_760, { maxSize: 5_000_000 });
    expect(result).toContain('too large');
  });
});

describe('createUploadHandler', () => {
  let store: ReturnType<typeof createStateStore>;
  let adapter: StorageAdapter;

  beforeEach(() => {
    store = createStateStore();
    adapter = createMockAdapter();
  });

  it('uploads single file and writes URL to target', async () => {
    const handler = createUploadHandler(adapter, store, {});
    const file = new File(['hello'], 'photo.jpg', { type: 'image/jpeg' });

    await handler({
      files: [file],
      bucket: 'avatars',
      target: '/form/avatar',
      elementId: 'upload-1',
      accept: '*',
      maxSize: 10_485_760,
    });

    expect(store.get('/form/avatar')).toBe('https://cdn.test/uploaded.jpg');
  });

  it('uploads multiple files and writes URL array to target', async () => {
    const mockAdapter: StorageAdapter = {
      upload: vi.fn()
        .mockResolvedValueOnce({ url: 'https://cdn.test/a.jpg' })
        .mockResolvedValueOnce({ url: 'https://cdn.test/b.jpg' }),
      delete: vi.fn(),
    };
    const handler = createUploadHandler(mockAdapter, store, {});
    const files = [
      new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
      new File(['b'], 'b.jpg', { type: 'image/jpeg' }),
    ];

    await handler({
      files,
      bucket: 'photos',
      target: '/form/photos',
      elementId: 'upload-2',
      accept: '*',
      maxSize: 10_485_760,
    });

    expect(store.get('/form/photos')).toEqual(['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg']);
  });

  it('writes progress and done status to /ui/uploads/{elementId}/files', async () => {
    const mockAdapter: StorageAdapter = {
      upload: vi.fn().mockImplementation((_file, _path, _bucket, onProgress) => {
        onProgress?.(50);
        onProgress?.(100);
        return Promise.resolve({ url: 'https://cdn.test/photo.jpg' });
      }),
      delete: vi.fn(),
    };
    const handler = createUploadHandler(mockAdapter, store, {});
    const file = new File(['hello'], 'photo.jpg', { type: 'image/jpeg' });

    await handler({
      files: [file],
      bucket: 'avatars',
      target: '/form/avatar',
      elementId: 'up1',
      accept: '*',
      maxSize: 10_485_760,
    });

    const files = store.get('/ui/uploads/up1/files') as any[];
    expect(files[0].status).toBe('done');
    expect(files[0].progress).toBe(100);
  });

  it('sets error status on upload failure after retry', async () => {
    const mockAdapter: StorageAdapter = {
      upload: vi.fn().mockRejectedValue(new Error('Network error')),
      delete: vi.fn(),
    };
    const handler = createUploadHandler(mockAdapter, store, {});
    const file = new File(['hello'], 'photo.jpg', { type: 'image/jpeg' });

    await handler({
      files: [file],
      bucket: 'avatars',
      target: '/form/avatar',
      elementId: 'up-err',
      accept: '*',
      maxSize: 10_485_760,
    });

    const files = store.get('/ui/uploads/up-err/files') as any[];
    expect(files[0].status).toBe('error');
    expect(files[0].error).toBe('Network error');
    // Should have been called twice (initial + 1 retry)
    expect(mockAdapter.upload).toHaveBeenCalledTimes(2);
  }, 10000);

  it('skips files that fail validation', async () => {
    const handler = createUploadHandler(adapter, store, {});
    const file = new File(['x'], 'script.exe', { type: 'application/exe' });

    await handler({
      files: [file],
      bucket: 'docs',
      target: '/form/doc',
      elementId: 'up-val',
      accept: 'image/*',
      maxSize: 10_485_760,
    });

    const files = store.get('/ui/uploads/up-val/files') as any[];
    expect(files[0].status).toBe('error');
    expect(files[0].error).toContain('not allowed');
    expect(adapter.upload).not.toHaveBeenCalled();
  });

  it('uses path template with ${filename}', async () => {
    const handler = createUploadHandler(adapter, store, {});
    const file = new File(['hello'], 'photo.jpg', { type: 'image/jpeg' });

    await handler({
      files: [file],
      bucket: 'avatars',
      target: '/form/avatar',
      elementId: 'up-path',
      path: 'users/123/${filename}',
      accept: '*',
      maxSize: 10_485_760,
    });

    expect(adapter.upload).toHaveBeenCalledWith(
      file,
      'users/123/photo.jpg',
      'avatars',
      expect.any(Function),
    );
  });
});

describe('createDeleteHandler', () => {
  it('deletes file from storage', async () => {
    const adapter = createMockAdapter();
    const handler = createDeleteHandler(adapter);

    await handler({ path: 'users/photo.jpg', bucket: 'avatars' });

    expect(adapter.delete).toHaveBeenCalledWith('users/photo.jpg', 'avatars');
  });
});
