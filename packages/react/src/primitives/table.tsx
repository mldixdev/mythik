import React, { type CSSProperties, useState, useCallback, useMemo } from 'react';
import { TABLE_COLUMN_PROPS } from 'mythik';
import type { EventBinding } from 'mythik';
import { useDesignTokens } from './use-design-tokens.js';

// ─── Types ──────────────────────────────────────────────────────────

interface TableColumn {
  id?: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  format?: 'currency' | 'number' | 'percent' | 'date';
  formatOptions?: {
    currency?: string;
    locale?: string;
    decimals?: number;
  };
  sortable?: boolean;
  visible?: boolean;
  /** Per-column cell style applied to each data cell */
  style?: CSSProperties;
  /** Action buttons for this column (renders icon buttons instead of data) */
  actions?: Array<{
    icon: string;
    color?: string;
    bgColor?: string;
    hoverBgColor?: string;
    onPress?: Record<string, unknown>;
  }>;
  /** Backwards compat aliases */
  field?: string;
  key?: string;
}

// Compile-time guard: adding a key to TableColumn without updating TABLE_COLUMN_PROPS causes a type error.
type _AssertColumnProps = Exclude<keyof TableColumn, (typeof TABLE_COLUMN_PROPS)[number]>;
type _ColumnPropsComplete = [_AssertColumnProps] extends [never] ? true : _AssertColumnProps;
const _checkColumnProps: _ColumnPropsComplete = true;
void _checkColumnProps;

interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}

interface TableProps {
  data?: Record<string, unknown>[];
  columns?: TableColumn[];
  style?: CSSProperties;
  _tokens?: Record<string, unknown>;
  className?: string;

  sorting?: {
    enabled: boolean;
    mode?: 'client' | 'server';
    default?: { field: string; direction: 'asc' | 'desc' };
    state?: string;
  };

  pagination?: {
    enabled: boolean;
    pageSize?: number;
    mode?: 'client' | 'server';
    state?: string;
    totalItems?: number;
  };

  selection?: {
    enabled: boolean;
    mode?: 'single' | 'multiple';
    state?: string;
  };

  groupBy?: {
    field: string;
    header?: boolean;
    footer?: 'subtotal' | false;
    expanded?: boolean;
    collapsible?: boolean;
    /** Field to use as main label in group header (default: groupBy.field value) */
    headerLabel?: string;
    /** Badge pills to render in the group header, each reading a field from the first row */
    headerBadges?: Array<{
      field: string;
      prefix?: string;
      color?: string;
      bgColor?: string;
      /** Icon name to render before the badge text (requires renderIcon prop) */
      icon?: string;
    }>;
    /** Styling for the count badge in group header */
    headerCountBadge?: {
      bgColor?: string;
      color?: string;
    };
  };

  stickyHeader?: boolean;
  emptyState?: { icon?: string; message: string };
  rowStyle?: { hover?: Record<string, unknown>; base?: CSSProperties };
  /**
   * Row click handler. Accepts either:
   * - A function callback (programmatic consumer mode) — invoked with the row
   *   object directly. Used by tests and custom integrations.
   * - An EventBinding (ActionBinding, ActionBinding[], or TransactionBinding —
   *   spec-driven canonical mode) — the renderer wraps these into a function
   *   that writes the row to /ui/selectedRow before dispatching the action chain.
   *   See ai-context-runtime-semantics.md § 2.1 for the row context model.
   */
  onRowClick?:
    | EventBinding
    | ((row: Record<string, unknown>) => void);
  onStateChange?: (path: string, value: unknown) => void;
  dispatchAction?: (binding: EventBinding | EventBinding[] | undefined, row?: Record<string, unknown>) => void;
  /** Render an icon by name. When provided, replaces emoji fallbacks with real SVG icons. */
  renderIcon?: (name: string, size: number, color: string) => React.ReactNode;

  // Styling overrides
  headerStyle?: CSSProperties;
  groupHeaderStyle?: CSSProperties;
  groupHeaderRender?: (key: string, rows: Record<string, unknown>[], groupData: Record<string, unknown>) => React.ReactNode;
  subtotalStyle?: CSSProperties;
  grandTotalStyle?: CSSProperties;
  grandTotal?: Record<string, unknown>;
  cellStyle?: (value: unknown, column: TableColumn & { id: string }, row: Record<string, unknown>) => CSSProperties | undefined;
}

// ─── Helpers ────────────────────────────────────────────────────────

/** Resolve canonical column id from id / field / key */
function resolveId(col: TableColumn): string {
  return col.id ?? col.field ?? col.key ?? '';
}

/** Normalize columns: ensure every column has a resolved `id` */
function normalizeColumns(
  columns: TableColumn[] | undefined,
  data: Record<string, unknown>[],
): (TableColumn & { id: string })[] {
  const raw =
    columns ??
    (data.length > 0
      ? Object.keys(data[0]).map((f): TableColumn => ({ id: f, label: f }))
      : []);
  return raw
    .map((c) => ({ ...c, id: resolveId(c) }))
    .filter((c) => c.visible !== false);
}

/** Format a cell value */
function formatValue(
  value: unknown,
  col: TableColumn & { id: string },
): string {
  if (value == null) return '';
  if (!col.format) return String(value);

  const locale = col.formatOptions?.locale ?? 'en-US';
  const decimals = col.formatOptions?.decimals;
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);

  switch (col.format) {
    case 'currency': {
      const cur = col.formatOptions?.currency ?? 'USD';
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: cur,
        ...(decimals != null
          ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals }
          : {}),
      }).format(num);
    }
    case 'percent':
      return new Intl.NumberFormat(locale, {
        style: 'percent',
        ...(decimals != null
          ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals }
          : {}),
      }).format(num);
    case 'number':
      return new Intl.NumberFormat(locale, {
        useGrouping: true,
        ...(decimals != null
          ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals }
          : {}),
      }).format(num);
    case 'date':
      return String(value);
    default:
      return String(value);
  }
}

/** Compare two values for sorting */
function compareValues(a: unknown, b: unknown, direction: 'asc' | 'desc'): number {
  const aVal = a ?? '';
  const bVal = b ?? '';
  let cmp: number;
  if (typeof aVal === 'number' && typeof bVal === 'number') {
    cmp = aVal - bVal;
  } else {
    cmp = String(aVal).localeCompare(String(bVal));
  }
  return direction === 'desc' ? -cmp : cmp;
}

/** Group data by a field */
function groupData(
  data: Record<string, unknown>[],
  field: string,
): Map<string, Record<string, unknown>[]> {
  const groups = new Map<string, Record<string, unknown>[]>();
  for (const row of data) {
    const key = String(row[field] ?? '');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }
  return groups;
}

/** Sum numeric values in a column across rows */
function sumColumn(rows: Record<string, unknown>[], field: string): number | null {
  let sum = 0;
  let hasNumeric = false;
  for (const row of rows) {
    const v = row[field];
    if (typeof v === 'number') {
      sum += v;
      hasNumeric = true;
    }
  }
  return hasNumeric ? sum : null;
}

// ─── Action Button (separate component for hover state) ────────────

function ActionButton({ icon, color, bgColor, hoverBgColor, renderIcon: renderIconFn, onPress }: {
  icon: string;
  color: string;
  bgColor: string;
  hoverBgColor: string;
  renderIcon?: (name: string, size: number, color: string) => React.ReactNode;
  onPress?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onPress?.(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: 8,
        borderRadius: 10,
        border: 'none',
        backgroundColor: hovered ? hoverBgColor : bgColor,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: '0.15s',
        transform: hovered ? 'scale(1.1)' : 'scale(1)',
      }}
    >
      {renderIconFn ? renderIconFn(icon, 14, color) : icon}
    </button>
  );
}

// ─── Component ──────────────────────────────────────────────────────

export function Table({
  data = [],
  columns: columnsProp,
  style,
  _tokens,
  className,
  sorting,
  pagination,
  selection,
  groupBy,
  stickyHeader,
  emptyState,
  rowStyle,
  onRowClick,
  onStateChange,
  dispatchAction,
  renderIcon,
  headerStyle: headerStyleOverride,
  groupHeaderStyle,
  groupHeaderRender,
  subtotalStyle,
  grandTotalStyle,
  grandTotal,
  cellStyle,
}: TableProps) {
  const t = useDesignTokens(_tokens);
  const cols = useMemo(
    () => normalizeColumns(columnsProp, data),
    [columnsProp, data],
  );

  // ── Sorting state ──
  const [sortState, setSortState] = useState<SortState | null>(
    sorting?.default ?? null,
  );

  const handleSort = useCallback(
    (field: string) => {
      if (!sorting?.enabled) return;
      const col = cols.find((c) => c.id === field);
      if (col?.sortable === false) return;

      let next: SortState;
      if (sortState?.field === field) {
        next =
          sortState.direction === 'asc'
            ? { field, direction: 'desc' }
            : { field, direction: 'asc' };
      } else {
        next = { field, direction: 'asc' };
      }

      if (sorting.mode === 'server') {
        onStateChange?.(sorting.state ?? 'sort', next);
        setSortState(next);
      } else {
        setSortState(next);
        // Reset pagination to page 1 when sort changes (avoid stale page)
        if (pagination?.enabled && pagination.mode !== 'server') {
          setPage(1);
        }
      }
    },
    [sorting, sortState, cols, onStateChange],
  );

  // ── Pagination state ──
  const pageSize = pagination?.pageSize ?? 20;
  const [page, setPage] = useState(1);

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (pagination?.mode === 'server') {
        onStateChange?.(pagination.state ?? 'page', newPage);
        setPage(newPage);
      } else {
        setPage(newPage);
      }
    },
    [pagination, onStateChange],
  );

  // ── Selection state (tracks row IDs, not indices) ──
  const [selectedIds, setSelectedIds] = useState<unknown[]>([]);
  const selectionMode = selection?.mode ?? 'multiple';

  /** Extract the ID value from a row. Uses 'id' field by default. */
  const getRowId = useCallback(
    (row: Record<string, unknown>, index: number): unknown => {
      // Prefer 'id' field if it exists, fallback to index
      return row.id !== undefined ? row.id : index;
    },
    [],
  );

  const handleSelect = useCallback(
    (rowId: unknown) => {
      let next: unknown[];
      if (selectionMode === 'single') {
        next = selectedIds.includes(rowId) ? [] : [rowId];
      } else {
        next = selectedIds.includes(rowId)
          ? selectedIds.filter((id) => id !== rowId)
          : [...selectedIds, rowId];
      }
      setSelectedIds(next);
      if (selection?.state) {
        onStateChange?.(selection.state, next);
      }
    },
    [selectedIds, selectionMode, selection, onStateChange],
  );

  const handleSelectAll = useCallback(() => {
    const allIds = data.map((row, i) => getRowId(row, i));
    const next = selectedIds.length === data.length ? [] : allIds;
    setSelectedIds(next);
    if (selection?.state) {
      onStateChange?.(selection.state, next);
    }
  }, [selectedIds, data, selection, onStateChange, getRowId]);

  // ── GroupBy collapse state ──
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );

  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // ── Hover state ──
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  // ── Process data ──
  let processedData = [...data];

  // Client sorting
  if (sorting?.enabled && sorting.mode !== 'server' && sortState) {
    processedData.sort((a, b) =>
      compareValues(a[sortState.field], b[sortState.field], sortState.direction),
    );
  }

  // Pagination calculations
  const totalItems = pagination?.mode === 'server'
    ? (pagination.totalItems ?? data.length)
    : processedData.length;
  const totalPages = pagination?.enabled
    ? Math.max(1, Math.ceil(totalItems / pageSize))
    : 1;

  // Client pagination — slice
  if (pagination?.enabled && pagination.mode !== 'server') {
    const start = (page - 1) * pageSize;
    processedData = processedData.slice(start, start + pageSize);
  }

  // ── Grid template ──
  const selectionColWidth = selection?.enabled ? '40px ' : '';
  const gridTemplate = `${selectionColWidth}${cols.map((c) => c.width ?? '1fr').join(' ')}`;

  // ── Empty state ──
  if (data.length === 0) {
    return (
      <div
        role="table"
        style={{
          width: '100%',
          fontSize: 14,
          color: t.colors.text,
          ...style,
        }}
        className={className}
      >
        {emptyState && (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: t.colors.textMuted,
            }}
          >
            {emptyState.icon && (
              <div style={{ fontSize: 32, marginBottom: 8 }}>
                {emptyState.icon}
              </div>
            )}
            <div>{emptyState.message}</div>
          </div>
        )}
      </div>
    );
  }

  // ── Render helpers ──
  const headerStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: gridTemplate,
    ...(stickyHeader
      ? {
          position: 'sticky',
          top: 0,
          zIndex: 1,
          background: t.colors.surface,
        }
      : {}),
    ...headerStyleOverride,
  };

  function renderHeader() {
    return (
      <div data-testid="table-header" data-table-header style={headerStyle}>
        {selection?.enabled && selectionMode === 'multiple' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 4px',
              borderBottom: `2px solid ${t.colors.border}`,
            }}
          >
            <input
              type="checkbox"
              checked={selectedIds.length === data.length && data.length > 0}
              onChange={handleSelectAll}
            />
          </div>
        )}
        {selection?.enabled && selectionMode === 'single' && (
          <div
            style={{
              padding: '10px 4px',
              borderBottom: `2px solid ${t.colors.border}`,
            }}
          />
        )}
        {cols.map((col) => (
          <div
            key={col.id}
            style={{
              textAlign: (col.align ?? 'left') as CSSProperties['textAlign'],
              padding: '0 12px',
              display: 'flex',
              alignItems: 'center',
              fontWeight: 600,
              fontSize: 12,
              textTransform: 'uppercase' as const,
              letterSpacing: 0.5,
              color: t.colors.textMuted,
              cursor: sorting?.enabled && col.sortable !== false ? 'pointer' : 'default',
              userSelect: 'none' as const,
            }}
            onClick={() => handleSort(col.id)}
          >
            {col.label}
            {sortState?.field === col.id && (
              <span style={{ marginLeft: 4 }}>
                {sortState.direction === 'asc' ? '▲' : '▼'}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  function renderRow(
    row: Record<string, unknown>,
    rowIndex: number,
    displayIndex: number,
  ) {
    const rowId = getRowId(row, rowIndex);
    const isHovered = hoveredRow === displayIndex;
    const hoverStyles =
      isHovered && rowStyle?.hover
        ? (rowStyle.hover as CSSProperties)
        : {};

    return (
      <div
        key={displayIndex}
        data-testid="data-row"
        data-row
        style={{
          display: 'grid',
          gridTemplateColumns: gridTemplate,
          transition: 'background-color 100ms',
          cursor: onRowClick ? 'pointer' : 'default',
          borderBottom: `1px solid ${t.colors.border}`,
          alignItems: 'center',
          ...(rowStyle?.base ?? {}),
          ...hoverStyles,
        }}
        onMouseEnter={() => setHoveredRow(displayIndex)}
        onMouseLeave={() => setHoveredRow(null)}
        onClick={() => {
          // The renderer (MythikRenderer) wraps EventBinding-shaped onRowClick
          // into a function before passing to this primitive — see
          // ai-context-runtime-semantics § 2.1 row context model. So at runtime
          // we only ever see a function here. The typeof guard is for the
          // type system (the public typing accepts EventBinding | function).
          if (typeof onRowClick === 'function') onRowClick(row);
        }}
      >
        {selection?.enabled && selectionMode === 'multiple' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 4px',
              borderBottom: `1px solid ${t.colors.border}`,
            }}
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(rowId)}
              onChange={(e) => {
                e.stopPropagation();
                handleSelect(rowId);
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
        {selection?.enabled && selectionMode === 'single' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 4px',
              borderBottom: `1px solid ${t.colors.border}`,
            }}
          >
            <input
              type="radio"
              name="table-selection"
              checked={selectedIds.includes(rowId)}
              onChange={() => handleSelect(rowId)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
        {cols.map((col) => {
          const cellVal = row[col.id];
          const customCellStyle = cellStyle?.(cellVal, col, row);

          // Action column: render icon buttons instead of data
          if (col.actions) {
            return (
              <div
                key={col.id}
                data-testid={`data-cell-${col.id}`}
                style={{
                  display: 'flex',
                  gap: 4,
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  padding: '0 12px',
                  ...col.style,
                }}
              >
                {col.actions.map((action, ai) => (
                  <ActionButton
                    key={ai}
                    icon={action.icon}
                    color={action.color ?? t.colors.text}
                    bgColor={action.bgColor ?? 'transparent'}
                    hoverBgColor={action.hoverBgColor ?? action.bgColor ?? 'transparent'}
                    renderIcon={renderIcon}
                    onPress={action.onPress && dispatchAction ? () => dispatchAction(action.onPress as unknown as EventBinding, row) : undefined}
                  />
                ))}
              </div>
            );
          }

          return (
            <div
              key={col.id}
              data-testid={`data-cell-${col.id}`}
              data-cell-column={col.id}
              style={{
                textAlign: (col.align ?? 'left') as CSSProperties['textAlign'],
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                fontSize: 12,
                fontFamily: "'Inter', sans-serif",
                ...col.style,
                ...customCellStyle,
              }}
            >
              {formatValue(cellVal, col)}
            </div>
          );
        })}
      </div>
    );
  }

  function renderPagination() {
    if (!pagination?.enabled) return null;
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, totalItems);

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          fontSize: 13,
          color: t.colors.textMuted,
        }}
      >
        <span>
          Showing {start}-{end} of {totalItems}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            aria-label="Previous"
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
            style={{
              padding: '4px 10px',
              border: `1px solid ${t.colors.border}`,
              background: t.colors.surface,
              color: t.colors.text,
              borderRadius: 4,
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
              opacity: page <= 1 ? 0.5 : 1,
            }}
          >
            Prev
          </button>
          <button
            aria-label="Next"
            disabled={page >= totalPages}
            onClick={() => handlePageChange(page + 1)}
            style={{
              padding: '4px 10px',
              border: `1px solid ${t.colors.border}`,
              background: t.colors.surface,
              color: t.colors.text,
              borderRadius: 4,
              cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              opacity: page >= totalPages ? 0.5 : 1,
            }}
          >
            Next
          </button>
        </div>
      </div>
    );
  }

  function renderGrandTotal() {
    if (!grandTotal) return null;
    return (
      <div
        data-testid="grand-total-row"
        style={{
          display: 'grid',
          gridTemplateColumns: gridTemplate,
          fontWeight: 700,
          fontSize: 13,
          ...grandTotalStyle,
        }}
      >
        {selection?.enabled && <div style={{ padding: '8px 4px' }} />}
        {cols.map((col, colIdx) => {
          const val = grandTotal[col.id];
          return (
            <div
              key={col.id}
              style={{
                textAlign: (col.align ?? 'left') as CSSProperties['textAlign'],
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                fontSize: 12,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {colIdx === 0 && val == null ? 'GRAN TOTAL' : val != null ? formatValue(val, col) : (colIdx === 0 ? 'GRAN TOTAL' : '')}
            </div>
          );
        })}
      </div>
    );
  }

  // ── Group header content renderer ──
  function renderGroupHeaderContent(
    key: string,
    rows: Record<string, unknown>[],
    gb: NonNullable<TableProps['groupBy']>,
    isCollapsed: boolean,
  ) {
    const firstRow = rows[0] ?? {};
    const hasRichHeader = gb.headerLabel || gb.headerBadges || gb.headerCountBadge;

    if (!hasRichHeader) {
      return (
        <>
          {gb.collapsible && (
            <span style={{ marginRight: 6 }}>
              {renderIcon
                ? renderIcon(isCollapsed ? 'chevron-right' : 'chevron-down', 14, '#64748B')
                : (isCollapsed ? '\u25B6' : '\u25BC')}
            </span>
          )}
          {`${key} (${rows.length})`}
        </>
      );
    }

    const mainLabel = gb.headerLabel ? String(firstRow[gb.headerLabel] ?? key) : key;

    // Count badge styles
    const countBadgeStyle: CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2px 10px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700,
      background: gb.headerCountBadge?.bgColor ?? t.colors.border,
      color: gb.headerCountBadge?.color ?? t.colors.text,
      marginLeft: 8,
      lineHeight: '18px',
    };

    // Period badge from _periodo field if present
    const periodo = firstRow._periodo ? String(firstRow._periodo) : null;

    return (
      <div>
        {/* Line 1: chevron + icon + label + count + period */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          {gb.collapsible && (
            <span style={{ marginRight: 2, fontSize: 11, display: 'inline-flex', alignItems: 'center' }}>
              {renderIcon
                ? renderIcon(isCollapsed ? 'chevron-right' : 'chevron-down', 14, '#64748B')
                : (isCollapsed ? '\u25B6' : '\u25BC')}
            </span>
          )}
          <span style={{ fontSize: 15, display: 'inline-flex', alignItems: 'center' }}>
            {renderIcon ? renderIcon('building-2', 16, '#2563EB') : '\uD83C\uDFE2'}
          </span>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>{mainLabel}</span>
          <span style={{ flex: 1 }} />
          <span style={countBadgeStyle}>{rows.length} registros</span>
          {periodo && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 10px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 600,
              background: 'rgba(99,102,241,0.08)',
              color: '#4338CA',
            }}>
              {renderIcon ? renderIcon('calendar', 12, '#4338CA') : '\uD83D\uDCC5'} {periodo}
            </span>
          )}
        </div>
        {/* Line 2: metadata badges */}
        {gb.headerBadges && gb.headerBadges.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6, paddingLeft: 24 }}>
            {gb.headerBadges.map((badge, idx) => {
              const val = firstRow[badge.field];
              if (val == null || val === '') return null;
              return (
                <span
                  key={idx}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 10px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                    background: badge.bgColor ?? 'rgba(0,0,0,0.05)',
                    color: badge.color ?? t.colors.text,
                  }}
                >
                  {badge.icon && renderIcon && renderIcon(badge.icon, 12, badge.color ?? t.colors.text)}
                  {badge.prefix ? `${badge.prefix} ` : ''}{String(val)}
                </span>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── GroupBy rendering ──
  if (groupBy) {
    const groups = groupData(processedData, groupBy.field);
    const showHeader = groupBy.header !== false;
    let displayIdx = 0;

    return (
      <div
        role="table"
        style={{ width: '100%', fontSize: 14, color: t.colors.text, borderRadius: t.radius(t.shape.radius.md), overflow: 'hidden', ...t.surface.card, ...style }}
        className={className}
      >
        {renderHeader()}
        {Array.from(groups.entries()).map(([key, rows]) => {
          const isCollapsed = collapsedGroups.has(key);
          const groupRows = rows;
          const startIdx = displayIdx;
          displayIdx += rows.length;

          return (
            <div key={key}>
              {showHeader && (
                <div
                  data-testid={`group-header-${key}`}
                  data-group-header={key}
                  style={{
                    padding: '8px 12px',
                    fontWeight: 600,
                    fontSize: 13,
                    background: t.colors.background,
                    borderBottom: `1px solid ${t.colors.border}`,
                    cursor: groupBy.collapsible ? 'pointer' : 'default',
                    userSelect: 'none',
                    ...groupHeaderStyle,
                  }}
                  onClick={() => groupBy.collapsible && toggleGroup(key)}
                >
                  {groupHeaderRender
                    ? groupHeaderRender(key, rows, rows[0] ?? {})
                    : renderGroupHeaderContent(key, rows, groupBy, isCollapsed)}
                </div>
              )}
              {!isCollapsed &&
                groupRows.map((row, i) => {
                  return renderRow(row, startIdx + i, startIdx + i);
                })}
              {!isCollapsed && groupBy.footer === 'subtotal' && (
                <div
                  data-testid={`group-footer-${key}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: gridTemplate,
                    fontWeight: 600,
                    fontSize: 13,
                    borderBottom: `2px solid ${t.colors.border}`,
                    ...subtotalStyle,
                  }}
                >
                  {selection?.enabled && <div style={{ padding: '8px 4px' }} />}
                  {cols.map((col, colIdx) => {
                    const total = sumColumn(groupRows, col.id);
                    return (
                      <div
                        key={col.id}
                        style={{
                          textAlign: (col.align ?? 'left') as CSSProperties['textAlign'],
                          padding: '0 12px',
                          display: 'flex',
                          alignItems: 'center',
                          fontSize: 12,
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        {colIdx === 0 && total == null ? 'SUBTOTAL' : total != null ? formatValue(total, col) : ''}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {grandTotal && renderGrandTotal()}
        {renderPagination()}
      </div>
    );
  }

  // ── Standard (non-grouped) rendering ──
  return (
    <div
      role="table"
      style={{ width: '100%', fontSize: 14, color: t.colors.text, borderRadius: t.radius(t.shape.radius.md), overflow: 'hidden', ...t.surface.card, ...style }}
      className={className}
    >
      {renderHeader()}
      {processedData.map((row, i) => {
        return renderRow(row, i, i);
      })}
      {grandTotal && renderGrandTotal()}
      {renderPagination()}
    </div>
  );
}
