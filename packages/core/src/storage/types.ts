export interface StorageAdapter {
  upload(
    file: File,
    path: string,
    bucket: string,
    onProgress?: (percent: number) => void,
  ): Promise<{ url: string }>;

  delete(path: string, bucket: string): Promise<void>;
}

export interface StorageAdapterConfig {
  /** Global MIME type allowlist. Rejects files not matching, regardless of spec accept prop. */
  allowedTypes?: string[];
  /** Global max file size in bytes. Applied on top of per-element maxSize. */
  maxSize?: number;
}

export interface UploadFileState {
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  previewUrl: string | null;
  error: string | null;
}
