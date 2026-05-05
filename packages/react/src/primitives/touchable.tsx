import type { CSSProperties, ReactNode } from 'react';

interface TouchableProps {
  style?: CSSProperties;
  className?: string;
  children?: ReactNode;
  onClick?: () => void;
}

export function Touchable({ style, className, children, onClick }: TouchableProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      className={className}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
      style={{ cursor: 'pointer', transition: 'all 0.15s ease', ...style }}
    >
      {children}
    </div>
  );
}
