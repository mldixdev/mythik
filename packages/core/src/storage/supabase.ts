import type { StorageAdapter } from './types.js';

/** Minimal Supabase client interface — no direct @supabase/supabase-js dependency */
interface SupabaseStorageClient {
  storage: {
    from(bucket: string): {
      upload(path: string, file: File, options?: { upsert?: boolean }): Promise<{ data: { path: string } | null; error: { message: string } | null }>;
      getPublicUrl(path: string): { data: { publicUrl: string } };
      remove(paths: string[]): Promise<{ data: unknown; error: { message: string } | null }>;
    };
  };
}

export interface SupabaseStorageAdapterConfig {
  client: SupabaseStorageClient;
  /** Upsert mode — overwrite existing files with same path. Default: true */
  upsert?: boolean;
}

export function createSupabaseStorageAdapter(config: SupabaseStorageAdapterConfig): StorageAdapter {
  const { client, upsert = true } = config;

  return {
    async upload(file, path, bucket, onProgress) {
      const storage = client.storage.from(bucket);
      const { error } = await storage.upload(path, file, { upsert });

      if (error) throw new Error(error.message);

      const { data } = storage.getPublicUrl(path);

      // Supabase JS SDK doesn't expose upload progress — report 100% on completion
      onProgress?.(100);

      return { url: data.publicUrl };
    },

    async delete(path, bucket) {
      const storage = client.storage.from(bucket);
      const { error } = await storage.remove([path]);
      if (error) throw new Error(error.message);
    },
  };
}
