import type { CSSProperties } from 'react';

interface CameraProps {
  label?: string;
  accept?: 'photo' | 'video' | 'both';
  disabled?: boolean;
  style?: CSSProperties;
  onCapture?: (file: File) => void;
}

/**
 * Camera primitive — uses the native file input with capture attribute.
 * On mobile devices this opens the camera directly.
 */
export function Camera({ label = 'Take photo', accept = 'photo', disabled, style, onCapture }: CameraProps) {
  const acceptMap = { photo: 'image/*', video: 'video/*', both: 'image/*,video/*' };

  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        border: '1px solid #d1d5db',
        borderRadius: 8,
        cursor: disabled ? 'default' : 'pointer',
        fontSize: 14,
        opacity: disabled ? 0.4 : 1,
        ...style,
      }}
    >
      <input
        type="file"
        accept={acceptMap[accept]}
        capture="environment"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onCapture?.(file);
        }}
        style={{ display: 'none' }}
      />
      {label}
    </label>
  );
}
