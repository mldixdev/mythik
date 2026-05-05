import React from 'react';
import type { CSSProperties } from 'react';
import type { UploadFileState } from 'mythik';
import { useDesignTokens } from './use-design-tokens.js';

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  maxFiles?: number;
  preview?: boolean;
  dropZone?: boolean;
  autoUpload?: boolean;
  label?: string;
  disabled?: boolean;
  style?: CSSProperties;
  _tokens?: Record<string, unknown>;
  /** Internal state from /ui/uploads/{elementId}/files */
  uploadState?: UploadFileState[];
  /** Called when files are selected/dropped */
  onFiles?: (files: File[]) => void;
  /** Called when remove button is clicked */
  onRemove?: (index: number) => void;
  /** Called when retry button is clicked */
  onRetry?: (index: number) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function getFileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  if (dot < 0) return '';
  return name.slice(dot + 1).toUpperCase();
}

function isImageType(type: string): boolean {
  return type.startsWith('image/');
}

// --- Inline SVG Icons ---

function UploadIcon({ color }: { color: string }) {
  return React.createElement('svg', { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2 },
    React.createElement('path', { d: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4' }),
    React.createElement('polyline', { points: '17 8 12 3 7 8' }),
    React.createElement('line', { x1: 12, y1: 3, x2: 12, y2: 15 }),
  );
}

function CheckIcon({ color }: { color: string }) {
  return React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 3 },
    React.createElement('polyline', { points: '20 6 9 17 4 12' }),
  );
}

function XIcon({ color, size = 14 }: { color: string; size?: number }) {
  return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2.5 },
    React.createElement('line', { x1: 18, y1: 6, x2: 6, y2: 18 }),
    React.createElement('line', { x1: 6, y1: 6, x2: 18, y2: 18 }),
  );
}

function RetryIcon({ color }: { color: string }) {
  return React.createElement('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2.5 },
    React.createElement('polyline', { points: '23 4 23 10 17 10' }),
    React.createElement('path', { d: 'M20.49 15a9 9 0 11-2.12-9.36L23 10' }),
  );
}

function SpinnerIcon({ color }: { color: string }) {
  return React.createElement('svg', {
    width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2.5,
    style: { animation: 'spin 0.8s linear infinite' },
  },
    React.createElement('path', { d: 'M12 2a10 10 0 0110 10', strokeLinecap: 'round' }),
  );
}

function FileIcon({ ext, color }: { ext: string; color: string }) {
  return React.createElement('div', {
    style: {
      width: 40, height: 40, borderRadius: 6, backgroundColor: color + '18',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase' as const,
    },
  }, ext || '?');
}

export function FileUpload({
  accept, multiple = false, maxSize = 10_485_760, maxFiles = 10,
  preview = true, dropZone = false, autoUpload = true,
  label = 'Choose file', disabled = false, style, _tokens,
  uploadState, onFiles, onRemove, onRetry,
}: FileUploadProps): React.ReactElement {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const t = useDesignTokens(_tokens);

  const borderColor = dragActive ? t.colors.primary : t.colors.border;
  const primaryColor = t.colors.primary;
  const errorColor = t.colors.error;
  const successColor = t.colors.success;
  const textColor = t.colors.text;
  const mutedColor = t.colors.textMuted;
  const surfaceColor = t.colors.surface;

  const handleFiles = React.useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    onFiles?.(files);
  }, [onFiles]);

  const handleInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      // Reset input so same file can be re-selected
      e.target.value = '';
    }
  }, [handleFiles]);

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setDragActive(true);
  }, [disabled]);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (!disabled && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [disabled, handleFiles]);

  // Hidden input element
  const inputEl = React.createElement('input', {
    ref: inputRef,
    type: 'file',
    accept,
    multiple,
    disabled,
    onChange: handleInputChange,
    style: { display: 'none' },
  });

  // Trigger zone (button or drop zone)
  const triggerEl = dropZone
    ? React.createElement('div', {
        onDragOver: handleDragOver,
        onDragEnter: handleDragOver,
        onDragLeave: handleDragLeave,
        onDrop: handleDrop,
        onClick: () => !disabled && inputRef.current?.click(),
        style: {
          padding: `${t.spacing.scale.lg}px ${t.spacing.scale.md}px`,
          border: `2px dashed ${borderColor}`,
          borderRadius: t.radius(t.shape.radius.lg),
          backgroundColor: dragActive ? primaryColor + '08' : 'transparent',
          cursor: disabled ? 'default' : 'pointer',
          display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: t.spacing.scale.sm,
          transition: `all ${t.motion.duration.fast}ms ${t.motion.easing.default}`,
          opacity: disabled ? 0.5 : 1,
        },
      },
        React.createElement(UploadIcon, { color: mutedColor }),
        React.createElement('span', { style: { fontSize: t.typography.scale.sm.fontSize, color: mutedColor } }, label),
      )
    : React.createElement('button', {
        type: 'button',
        disabled,
        onClick: () => inputRef.current?.click(),
        style: {
          padding: `${t.spacing.scale.sm}px ${t.spacing.scale.md}px`,
          border: `2px dashed ${borderColor}`,
          borderRadius: t.radius(t.shape.radius.md),
          backgroundColor: 'transparent',
          cursor: disabled ? 'default' : 'pointer',
          fontSize: t.typography.scale.sm.fontSize,
          color: mutedColor,
          transition: `all ${t.motion.duration.fast}ms ${t.motion.easing.default}`,
          opacity: disabled ? 0.5 : 1,
        },
      }, label);

  // File list — uploadState comes from /ui/uploads/{elementId}/files in state store
  const validUploadState = Array.isArray(uploadState) ? uploadState : undefined;
  const fileListEl = validUploadState && validUploadState.length > 0
    ? React.createElement('div', { style: { display: 'flex', flexDirection: 'column' as const, gap: t.spacing.unit + 2 } },
        validUploadState.map((file, i) => {
          if (!file || typeof file !== 'object') return null;
          const isImg = isImageType(file.type ?? '');
          const ext = getFileExtension(file.name ?? '');

          // Preview column
          const previewEl = preview
            ? (isImg && file.previewUrl
                ? React.createElement('img', {
                    src: file.previewUrl,
                    alt: file.name,
                    style: { width: 40, height: 40, borderRadius: 6, objectFit: 'cover' as const },
                  })
                : React.createElement(FileIcon, { ext, color: primaryColor }))
            : null;

          // Progress bar
          const progressEl = file.status === 'uploading'
            ? React.createElement('div', {
                role: 'progressbar',
                'aria-valuenow': file.progress,
                'aria-valuemin': 0,
                'aria-valuemax': 100,
                style: { height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, overflow: 'hidden', marginTop: 4 },
              },
                React.createElement('div', {
                  style: {
                    height: '100%', width: `${file.progress}%`,
                    backgroundColor: primaryColor,
                    borderRadius: 2,
                    transition: 'width 0.3s ease',
                  },
                }),
              )
            : null;

          // Status indicator
          let statusEl: React.ReactNode = null;
          if (file.status === 'uploading') {
            statusEl = React.createElement(SpinnerIcon, { color: primaryColor });
          } else if (file.status === 'done') {
            statusEl = React.createElement(CheckIcon, { color: successColor });
          } else if (file.status === 'error') {
            statusEl = onRetry
              ? React.createElement('button', {
                  type: 'button',
                  'aria-label': `Retry ${file.name}`,
                  onClick: () => onRetry(i),
                  style: {
                    background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                    display: 'flex', alignItems: 'center',
                  },
                }, React.createElement(RetryIcon, { color: errorColor }))
              : React.createElement(XIcon, { color: errorColor });
          }

          // Remove button
          const removeEl = onRemove
            ? React.createElement('button', {
                type: 'button',
                'aria-label': `Remove ${file.name}`,
                onClick: () => onRemove(i),
                style: {
                  background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                  display: 'flex', alignItems: 'center', marginLeft: 4,
                },
              }, React.createElement(XIcon, { color: mutedColor, size: 12 }))
            : null;

          return React.createElement('div', {
            key: `${file.name}-${i}`,
            style: {
              display: 'flex', alignItems: 'center', gap: 10,
              padding: `${t.spacing.scale.sm}px 10px`, borderRadius: t.radius(t.shape.radius.md),
              backgroundColor: file.status === 'error' ? errorColor + '08' : surfaceColor,
              border: `1px solid ${file.status === 'error' ? errorColor + '30' : borderColor + '40'}`,
            },
          },
            previewEl,
            React.createElement('div', { style: { flex: 1, minWidth: 0 } },
              React.createElement('div', {
                style: {
                  fontSize: 13, fontWeight: 500, color: textColor,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                },
              }, file.name),
              React.createElement('div', { style: { fontSize: 11, color: mutedColor } },
                formatFileSize(file.size ?? 0),
              ),
              progressEl,
              file.status === 'error' && file.error
                ? React.createElement('div', {
                    style: { fontSize: 11, color: errorColor, marginTop: 2 },
                  }, file.error)
                : null,
            ),
            statusEl,
            removeEl,
          );
        }),
      )
    : null;

  return React.createElement('div', {
    style: { display: 'flex', flexDirection: 'column' as const, gap: t.spacing.scale.sm, ...style },
  },
    inputEl,
    triggerEl,
    fileListEl,
  );
}
