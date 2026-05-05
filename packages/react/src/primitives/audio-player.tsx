import type { CSSProperties } from 'react';

interface AudioPlayerProps {
  src?: string;
  label?: string;
  style?: CSSProperties;
}

export function AudioPlayer({ src, label, style }: AudioPlayerProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, ...style }}>
      {label && <label style={{ fontSize: 14 }}>{label}</label>}
      <audio controls src={src} style={{ width: '100%' }}>
        Your browser does not support the audio element.
      </audio>
    </div>
  );
}
