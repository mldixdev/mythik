import type { CSSProperties, ReactNode } from 'react';

interface ScreenProps {
  title?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export function Screen({ title, style, children }: ScreenProps) {
  return (
    <main
      role="main"
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        ...style,
      }}
    >
      {title && (
        <header style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb' }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{title}</h1>
        </header>
      )}
      <div style={{ flex: 1, padding: 24 }}>
        {children}
      </div>
    </main>
  );
}
