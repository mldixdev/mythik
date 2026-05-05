import { describe, it, expect, vi } from 'vitest';
import { createUrlStorageAdapter } from '../../src/storage/url.js';

describe('UrlStorageAdapter', () => {
  it('uploads file via POST multipart and returns URL from response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { url: 'https://cdn.test/photo.jpg' } }),
    });
    const adapter = createUrlStorageAdapter({
      uploadUrl: 'https://api.test/upload',
      responsePath: 'data.url',
      fetcher: mockFetch,
    });
    const file = new File(['hello'], 'photo.jpg', { type: 'image/jpeg' });

    const result = await adapter.upload(file, 'users/photo.jpg', 'avatars');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.test/upload');
    expect(options.method).toBe('POST');
    expect(options.body).toBeInstanceOf(FormData);
    expect(result.url).toBe('https://cdn.test/photo.jpg');
  });

  it('uses custom field name', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: 'https://cdn.test/photo.jpg' }),
    });
    const adapter = createUrlStorageAdapter({
      uploadUrl: 'https://api.test/upload',
      responsePath: 'url',
      fieldName: 'attachment',
      fetcher: mockFetch,
    });
    const file = new File(['hello'], 'photo.jpg', { type: 'image/jpeg' });

    await adapter.upload(file, 'photo.jpg', 'docs');

    const body = mockFetch.mock.calls[0][1].body as FormData;
    expect(body.get('attachment')).toBeTruthy();
  });

  it('sends custom headers', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: 'https://cdn.test/photo.jpg' }),
    });
    const adapter = createUrlStorageAdapter({
      uploadUrl: 'https://api.test/upload',
      responsePath: 'url',
      headers: { 'X-Api-Key': 'secret' },
      fetcher: mockFetch,
    });
    const file = new File(['hello'], 'photo.jpg', { type: 'image/jpeg' });

    await adapter.upload(file, 'photo.jpg', 'docs');

    expect(mockFetch.mock.calls[0][1].headers).toEqual({ 'X-Api-Key': 'secret' });
  });

  it('throws on non-ok response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 413,
      statusText: 'Payload Too Large',
    });
    const adapter = createUrlStorageAdapter({
      uploadUrl: 'https://api.test/upload',
      responsePath: 'url',
      fetcher: mockFetch,
    });
    const file = new File(['hello'], 'photo.jpg', { type: 'image/jpeg' });

    await expect(adapter.upload(file, 'photo.jpg', 'docs')).rejects.toThrow('Upload failed: 413 Payload Too Large');
  });

  it('extracts URL from nested response path', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: { files: { publicUrl: 'https://cdn.test/deep.jpg' } } }),
    });
    const adapter = createUrlStorageAdapter({
      uploadUrl: 'https://api.test/upload',
      responsePath: 'result.files.publicUrl',
      fetcher: mockFetch,
    });
    const file = new File(['hello'], 'deep.jpg', { type: 'image/jpeg' });

    const result = await adapter.upload(file, 'deep.jpg', 'docs');
    expect(result.url).toBe('https://cdn.test/deep.jpg');
  });

  it('deletes file via DELETE request', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    const adapter = createUrlStorageAdapter({
      uploadUrl: 'https://api.test/upload',
      deleteUrl: 'https://api.test/files',
      responsePath: 'url',
      fetcher: mockFetch,
    });

    await adapter.delete('users/photo.jpg', 'avatars');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test/files/avatars/users/photo.jpg',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('throws on delete when no deleteUrl configured', async () => {
    const adapter = createUrlStorageAdapter({
      uploadUrl: 'https://api.test/upload',
      responsePath: 'url',
      fetcher: vi.fn(),
    });

    await expect(adapter.delete('photo.jpg', 'docs')).rejects.toThrow('deleteUrl not configured');
  });
});
