import { describe, it, expect, vi } from 'vitest';
import { createSupabaseStorageAdapter } from '../../src/storage/supabase.js';

function createMockClient() {
  const uploadFn = vi.fn().mockResolvedValue({ data: { path: 'avatars/photo.jpg' }, error: null });
  const getPublicUrlFn = vi.fn().mockReturnValue({ data: { publicUrl: 'https://storage.test/avatars/photo.jpg' } });
  const removeFn = vi.fn().mockResolvedValue({ data: null, error: null });

  return {
    storage: {
      from: vi.fn().mockReturnValue({
        upload: uploadFn,
        getPublicUrl: getPublicUrlFn,
        remove: removeFn,
      }),
    },
    _mocks: { uploadFn, getPublicUrlFn, removeFn },
  };
}

describe('SupabaseStorageAdapter', () => {
  it('uploads file and returns public URL', async () => {
    const client = createMockClient();
    const adapter = createSupabaseStorageAdapter({ client: client as any });
    const file = new File(['hello'], 'photo.jpg', { type: 'image/jpeg' });

    const result = await adapter.upload(file, 'users/photo.jpg', 'avatars');

    expect(client.storage.from).toHaveBeenCalledWith('avatars');
    expect(client._mocks.uploadFn).toHaveBeenCalledWith('users/photo.jpg', file, expect.any(Object));
    expect(result.url).toBe('https://storage.test/avatars/photo.jpg');
  });

  it('throws on upload error', async () => {
    const client = createMockClient();
    client._mocks.uploadFn.mockResolvedValue({ data: null, error: { message: 'Bucket not found' } });
    const adapter = createSupabaseStorageAdapter({ client: client as any });
    const file = new File(['hello'], 'photo.jpg', { type: 'image/jpeg' });

    await expect(adapter.upload(file, 'photo.jpg', 'missing')).rejects.toThrow('Bucket not found');
  });

  it('deletes file from storage', async () => {
    const client = createMockClient();
    const adapter = createSupabaseStorageAdapter({ client: client as any });

    await adapter.delete('users/photo.jpg', 'avatars');

    expect(client.storage.from).toHaveBeenCalledWith('avatars');
    expect(client._mocks.removeFn).toHaveBeenCalledWith(['users/photo.jpg']);
  });

  it('throws on delete error', async () => {
    const client = createMockClient();
    client._mocks.removeFn.mockResolvedValue({ data: null, error: { message: 'Not found' } });
    const adapter = createSupabaseStorageAdapter({ client: client as any });

    await expect(adapter.delete('missing.jpg', 'avatars')).rejects.toThrow('Not found');
  });

  it('calls onProgress on completion', async () => {
    const client = createMockClient();
    const adapter = createSupabaseStorageAdapter({ client: client as any });
    const file = new File(['hello'], 'photo.jpg', { type: 'image/jpeg' });
    const onProgress = vi.fn();

    await adapter.upload(file, 'photo.jpg', 'avatars', onProgress);

    expect(onProgress).toHaveBeenCalledWith(100);
  });
});
