import type { StateStore } from '../state/store.js';
import type { StorageAdapter, StorageAdapterConfig, UploadFileState } from './types.js';

export interface UploadParams {
  files: File[];
  bucket: string;
  target: string;
  elementId: string;
  path?: string;
  accept: string;
  maxSize: number;
}

/**
 * Validate a single file against accept, maxSize, and global config.
 * Returns error message or null if valid.
 */
export function validateUploadFile(
  file: File,
  accept: string,
  maxSize: number,
  globalConfig: StorageAdapterConfig,
): string | null {
  // Global maxSize check
  const effectiveMaxSize = globalConfig.maxSize ? Math.min(maxSize, globalConfig.maxSize) : maxSize;
  if (file.size > effectiveMaxSize) {
    const maxMB = (effectiveMaxSize / (1024 * 1024)).toFixed(1);
    return `File too large. Max: ${maxMB} MB`;
  }

  // Global allowedTypes check
  if (globalConfig.allowedTypes && globalConfig.allowedTypes.length > 0) {
    if (!globalConfig.allowedTypes.includes(file.type)) {
      return `Type "${file.type}" not allowed by storage config`;
    }
  }

  // Per-element accept check
  if (accept && accept !== '*') {
    const acceptParts = accept.split(',').map((s) => s.trim());
    const matches = acceptParts.some((part) => {
      if (part.startsWith('.')) {
        // Extension match
        return file.name.toLowerCase().endsWith(part.toLowerCase());
      }
      if (part.endsWith('/*')) {
        // MIME category match (e.g., image/*)
        const category = part.split('/')[0];
        return file.type.startsWith(category + '/');
      }
      // Exact MIME match
      return file.type === part;
    });
    if (!matches) {
      return `Type "${file.type}" not allowed. Accepts: ${accept}`;
    }
  }

  return null;
}

function buildFilePath(pathTemplate: string | undefined, filename: string): string {
  if (!pathTemplate) return filename;
  return pathTemplate.replace('${filename}', filename);
}

function updateFileState(store: StateStore, elementId: string, index: number, update: Partial<UploadFileState>): void {
  const files = ((store.get(`/ui/uploads/${elementId}/files`) as UploadFileState[]) ?? []).slice();
  if (files[index]) {
    files[index] = { ...files[index], ...update };
    store.set(`/ui/uploads/${elementId}/files`, files);
  }
}

export function createUploadHandler(
  adapter: StorageAdapter,
  store: StateStore,
  globalConfig: StorageAdapterConfig,
) {
  return async (params: UploadParams): Promise<void> => {
    const { files, bucket, target, elementId, path, accept, maxSize } = params;

    // Read existing file states (renderer may have already set previewUrl)
    const existingStates = (store.get(`/ui/uploads/${elementId}/files`) as UploadFileState[]) ?? [];
    const fileStates: UploadFileState[] = files.map((f, i) => ({
      name: f.name,
      size: f.size,
      type: f.type,
      progress: 0,
      status: 'pending' as const,
      previewUrl: existingStates[i]?.previewUrl ?? null,
      error: null,
    }));
    store.set(`/ui/uploads/${elementId}/files`, fileStates);

    const urls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate
      const validationError = validateUploadFile(file, accept, maxSize, globalConfig);
      if (validationError) {
        updateFileState(store, elementId, i, { status: 'error', error: validationError });
        continue;
      }

      // Upload
      updateFileState(store, elementId, i, { status: 'uploading' });
      const filePath = buildFilePath(path, file.name);

      let retries = 1;
      let uploaded = false;

      while (retries >= 0 && !uploaded) {
        try {
          const result = await adapter.upload(file, filePath, bucket, (pct) => {
            updateFileState(store, elementId, i, { progress: pct });
          });
          urls.push(result.url);
          updateFileState(store, elementId, i, { status: 'done', progress: 100 });
          uploaded = true;
        } catch (err) {
          retries--;
          if (retries < 0) {
            const message = err instanceof Error ? err.message : 'Upload failed';
            updateFileState(store, elementId, i, { status: 'error', error: message });
          } else {
            // Wait 1 second before retry
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      }
    }

    // Write URLs to target
    if (urls.length === 1) {
      store.set(target, urls[0]);
    } else if (urls.length > 1) {
      store.set(target, urls);
    }
  };
}

export function createDeleteHandler(adapter: StorageAdapter) {
  return async (params: { path: string; bucket: string }): Promise<void> => {
    await adapter.delete(params.path, params.bucket);
  };
}
