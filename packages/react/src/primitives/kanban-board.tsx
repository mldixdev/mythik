import type { CSSProperties, ReactNode } from 'react';

interface KanbanColumn {
  id: string;
  title: string;
}

interface KanbanBoardProps {
  columns?: KanbanColumn[];
  style?: CSSProperties;
  children?: ReactNode;
}

export function KanbanBoard({ columns = [], style, children }: KanbanBoardProps) {
  return (
    <div role="region" aria-label="Kanban board" style={{ display: 'flex', gap: 16, overflowX: 'auto', ...style }}>
      {columns.map((col) => (
        <div key={col.id} style={{ flex: '0 0 280px', backgroundColor: '#f9fafb', borderRadius: 8, padding: 12 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#374151' }}>{col.title}</h3>
          {children}
        </div>
      ))}
    </div>
  );
}
