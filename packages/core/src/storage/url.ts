import type { StorageAdapter } from './types.js';

export interface UrlStorageAdapterConfig {
  /** POST endpoint for file upload */
  uploadUrl: string;
  /** DELETE endpoint base URL (optional). Path appended as: deleteUrl/bucket/path */
  deleteUrl?: string;
  /** Form field name for the file. Default: "file" */
  fieldName?: string;
  /** Dot-notation path to extract URL from response JSON. Default: "url" */
  responsePath?: string;
  /** Custom headers for requests */
  headers?: Record<string, string>;
  /** Injectable fetch for testing. Default: globalThis.fetch */
  fetcher?: (url: string, options?: RequestInit) => Promise<Response>;
}

/** Navigate a dot-notation path on an object: "data.url" -> obj.data.url */
function getByPath(obj: unknown, path: string): unknown {
  let current = obj;
  for (const key of path.split('.')) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

export function createUrlStorageAdapter(config: UrlStorageAdapterConfig): StorageAdapter {
  const {
    uploadUrl,
    deleteUrl,
    fieldName = 'file',
    responsePath = 'url',
    headers,
    fetcher = (url, opts) => globalThis.fetch(url, opts!),
  } = config;

  return {
    async upload(file, path, bucket, onProgress) {
      const formData = new FormData();
      formData.append(fieldName, file);
      formData.append('path', path);
      formData.append('bucket', bucket);

      const response = await fetcher(uploadUrl, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const json = await response.json();
      const url = getByPath(json, responsePath) as string;

      if (!url) {
        throw new Error(`No URL found at response path "${responsePath}"`);
      }

      onProgress?.(100);
      return { url };
    },

    async delete(path, bucket) {
      if (!deleteUrl) throw new Error('deleteUrl not configured');

      const response = await fetcher(`${deleteUrl}/${bucket}/${path}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status} ${response.statusText}`);
      }
    },
  };
}
