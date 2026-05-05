import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Table } from '../src/primitives/table.js';

const sampleData = [
  { id: 1, name: 'Alice', age: 30, salary: 50000 },
  { id: 2, name: 'Bob', age: 25, salary: 60000 },
  { id: 3, name: 'Charlie', age: 35, salary: 45000 },
];

const sampleColumns = [
  { id: 'name', label: 'Name', width: '2fr' },
  { id: 'age', label: 'Age', width: '1fr' },
  { id: 'salary', label: 'Salary', width: '1fr' },
];

// ─── Backwards compatibility ────────────────────────────────────────
describe('Table — Backwards compatibility', () => {
  it('renders basic table with data and columns', () => {
    render(<Table data={sampleData} columns={sampleColumns} />);
    // Headers
    expect(screen.getByText('Name')).toBeTruthy();
    expect(screen.getByText('Age')).toBeTruthy();
    expect(screen.getByText('Salary')).toBeTruthy();
    // Data rows
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
    // Data attribute
    const rows = screen.getAllByTestId('data-row');
    expect(rows).toHaveLength(3);
  });

  it('auto-generates columns from data keys when not provided', () => {
    render(<Table data={[{ x: 1, y: 2 }]} />);
    expect(screen.getByText('x')).toBeTruthy();
    expect(screen.getByText('y')).toBeTruthy();
  });

  it('accepts field and key as aliases for id', () => {
    const cols = [
      { field: 'name', label: 'Name' },
      { key: 'age', label: 'Age' },
    ];
    render(<Table data={sampleData} columns={cols as any} />);
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('30')).toBeTruthy();
  });
});

// ─── Empty state ────────────────────────────────────────────────────
describe('Table — Empty state', () => {
  it('renders empty state when data is empty', () => {
    render(
      <Table
        data={[]}
        columns={sampleColumns}
        emptyState={{ message: 'No records found' }}
      />,
    );
    expect(screen.getByText('No records found')).toBeTruthy();
  });
});

// ─── Column formatting ─────────────────────────────────────────────
describe('Table — Column formatting', () => {
  const formatData = [{ price: 1234.5, rate: 0.156, count: 9876 }];

  it('formats currency columns', () => {
    render(
      <Table
        data={formatData}
        columns={[
          {
            id: 'price',
            label: 'Price',
            format: 'currency',
            formatOptions: { currency: 'USD', locale: 'en-US' },
          },
        ]}
      />,
    );
    expect(screen.getByText('$1,234.50')).toBeTruthy();
  });

  it('formats percent columns', () => {
    render(
      <Table
        data={formatData}
        columns={[
          {
            id: 'rate',
            label: 'Rate',
            format: 'percent',
            formatOptions: { locale: 'en-US' },
          },
        ]}
      />,
    );
    // Intl percent: 0.156 → "16%"
    expect(screen.getByText('16%')).toBeTruthy();
  });

  it('formats number columns', () => {
    render(
      <Table
        data={formatData}
        columns={[
          {
            id: 'count',
            label: 'Count',
            format: 'number',
            formatOptions: { locale: 'en-US' },
          },
        ]}
      />,
    );
    expect(screen.getByText('9,876')).toBeTruthy();
  });
});

// ─── Client sorting ─────────────────────────────────────────────────
describe('Table — Client sorting', () => {
  it('sorts by column on header click (ascending)', async () => {
    const user = userEvent.setup();
    render(
      <Table
        data={sampleData}
        columns={sampleColumns}
        sorting={{ enabled: true }}
      />,
    );
    await user.click(screen.getByText('Name'));
    const rows = screen.getAllByTestId('data-row');
    const firstRowCells = within(rows[0]).getAllByTestId(/data-cell/);
    expect(firstRowCells[0].textContent).toBe('Alice');
  });

  it('toggles sort direction on second click (descending)', async () => {
    const user = userEvent.setup();
    render(
      <Table
        data={sampleData}
        columns={sampleColumns}
        sorting={{ enabled: true }}
      />,
    );
    await user.click(screen.getByText('Name'));
    await user.click(screen.getByText('Name'));
    const rows = screen.getAllByTestId('data-row');
    const firstRowCells = within(rows[0]).getAllByTestId(/data-cell/);
    expect(firstRowCells[0].textContent).toBe('Charlie');
  });

  it('applies default sort on initial render', () => {
    render(
      <Table
        data={sampleData}
        columns={sampleColumns}
        sorting={{
          enabled: true,
          default: { field: 'age', direction: 'asc' },
        }}
      />,
    );
    const rows = screen.getAllByTestId('data-row');
    const firstRowCells = within(rows[0]).getAllByTestId(/data-cell/);
    // Age ascending: 25 (Bob), 30 (Alice), 35 (Charlie)
    expect(firstRowCells[0].textContent).toBe('Bob');
  });
});

// ─── Server sorting ─────────────────────────────────────────────────
describe('Table — Server sorting', () => {
  it('writes sort state via onStateChange instead of sorting internally', async () => {
    const user = userEvent.setup();
    const onStateChange = vi.fn();
    render(
      <Table
        data={sampleData}
        columns={sampleColumns}
        sorting={{ enabled: true, mode: 'server', state: 'sort' }}
        onStateChange={onStateChange}
      />,
    );
    await user.click(screen.getByText('Name'));
    expect(onStateChange).toHaveBeenCalledWith('sort', {
      field: 'name',
      direction: 'asc',
    });
    // Data order should NOT change (server mode)
    const rows = screen.getAllByTestId('data-row');
    const firstRowCells = within(rows[0]).getAllByTestId(/data-cell/);
    expect(firstRowCells[0].textContent).toBe('Alice');
  });
});

// ─── Client pagination ─────────────────────────────────────────────
describe('Table — Client pagination', () => {
  const bigData = Array.from({ length: 25 }, (_, i) => ({
    id: i + 1,
    name: `Person ${i + 1}`,
  }));
  const bigCols = [
    { id: 'id', label: 'ID' },
    { id: 'name', label: 'Name' },
  ];

  it('shows only pageSize rows', () => {
    render(
      <Table
        data={bigData}
        columns={bigCols}
        pagination={{ enabled: true, pageSize: 10 }}
      />,
    );
    const rows = screen.getAllByTestId('data-row');
    expect(rows).toHaveLength(10);
  });

  it('renders pagination controls', () => {
    render(
      <Table
        data={bigData}
        columns={bigCols}
        pagination={{ enabled: true, pageSize: 10 }}
      />,
    );
    expect(screen.getByText(/Showing 1-10 of 25/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /next/i })).toBeTruthy();
  });

  it('navigates to next page on click', async () => {
    const user = userEvent.setup();
    render(
      <Table
        data={bigData}
        columns={bigCols}
        pagination={{ enabled: true, pageSize: 10 }}
      />,
    );
    await user.click(screen.getByRole('button', { name: /next/i }));
    const rows = screen.getAllByTestId('data-row');
    expect(rows).toHaveLength(10);
    expect(screen.getByText(/Showing 11-20 of 25/)).toBeTruthy();
  });
});

// ─── Server pagination ──────────────────────────────────────────────
describe('Table — Server pagination', () => {
  it('writes page state via onStateChange', async () => {
    const user = userEvent.setup();
    const onStateChange = vi.fn();
    const data = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      name: `P${i + 1}`,
    }));
    render(
      <Table
        data={data}
        columns={[{ id: 'name', label: 'Name' }]}
        pagination={{
          enabled: true,
          pageSize: 5,
          mode: 'server',
          state: 'page',
          totalItems: 25,
        }}
        onStateChange={onStateChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(onStateChange).toHaveBeenCalledWith('page', 2);
  });
});

// ─── Selection ──────────────────────────────────────────────────────
describe('Table — Selection', () => {
  it('renders checkboxes in multiple mode', () => {
    render(
      <Table
        data={sampleData}
        columns={sampleColumns}
        selection={{ enabled: true, mode: 'multiple' }}
      />,
    );
    const checkboxes = screen.getAllByRole('checkbox');
    // 1 header + 3 rows
    expect(checkboxes).toHaveLength(4);
  });

  it('toggles row selection on checkbox click', async () => {
    const user = userEvent.setup();
    const onStateChange = vi.fn();
    render(
      <Table
        data={sampleData}
        columns={sampleColumns}
        selection={{ enabled: true, mode: 'multiple', state: 'selected' }}
        onStateChange={onStateChange}
      />,
    );
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]); // First row checkbox
    expect(onStateChange).toHaveBeenCalledWith('selected', [1]); // Row ID, not index
  });

  it('select-all checkbox selects all rows', async () => {
    const user = userEvent.setup();
    const onStateChange = vi.fn();
    render(
      <Table
        data={sampleData}
        columns={sampleColumns}
        selection={{ enabled: true, mode: 'multiple', state: 'selected' }}
        onStateChange={onStateChange}
      />,
    );
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]); // Header select-all
    expect(onStateChange).toHaveBeenCalledWith('selected', [1, 2, 3]); // Row IDs
  });

  it('single mode renders radio buttons', () => {
    render(
      <Table
        data={sampleData}
        columns={sampleColumns}
        selection={{ enabled: true, mode: 'single' }}
      />,
    );
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
  });
});

// ─── GroupBy ────────────────────────────────────────────────────────
describe('Table — GroupBy', () => {
  const groupData = [
    { dept: 'Engineering', name: 'Alice', salary: 100 },
    { dept: 'Engineering', name: 'Bob', salary: 200 },
    { dept: 'Sales', name: 'Charlie', salary: 150 },
  ];
  const groupCols = [
    { id: 'dept', label: 'Department' },
    { id: 'name', label: 'Name' },
    { id: 'salary', label: 'Salary' },
  ];

  it('renders group headers', () => {
    render(
      <Table
        data={groupData}
        columns={groupCols}
        groupBy={{ field: 'dept' }}
      />,
    );
    const engHeader = screen.getByTestId('group-header-Engineering');
    expect(engHeader).toBeTruthy();
    const salesHeader = screen.getByTestId('group-header-Sales');
    expect(salesHeader).toBeTruthy();
    // Group headers contain group name + count
    expect(engHeader.textContent).toContain('Engineering');
    expect(salesHeader.textContent).toContain('Sales');
  });

  it('renders subtotal footer', () => {
    render(
      <Table
        data={groupData}
        columns={groupCols}
        groupBy={{ field: 'dept', footer: 'subtotal' }}
      />,
    );
    // Engineering subtotal salary: 100 + 200 = 300
    const engFooter = screen.getByTestId('group-footer-Engineering');
    expect(within(engFooter).getByText('300')).toBeTruthy();
    // Sales subtotal salary: 150
    const salesFooter = screen.getByTestId('group-footer-Sales');
    expect(within(salesFooter).getByText('150')).toBeTruthy();
  });

  it('collapse/expand groups when collapsible', async () => {
    const user = userEvent.setup();
    render(
      <Table
        data={groupData}
        columns={groupCols}
        groupBy={{ field: 'dept', collapsible: true }}
      />,
    );
    // All rows visible initially (expanded: true by default)
    expect(screen.getAllByTestId('data-row')).toHaveLength(3);
    // Click Engineering group header to collapse
    await user.click(screen.getByTestId('group-header-Engineering'));
    // Only Sales rows visible
    expect(screen.getAllByTestId('data-row')).toHaveLength(1);
  });
});

// ─── Sticky header ──────────────────────────────────────────────────
describe('Table — Sticky header', () => {
  it('applies position sticky to header', () => {
    render(
      <Table
        data={sampleData}
        columns={sampleColumns}
        stickyHeader={true}
      />,
    );
    const header = screen.getByTestId('table-header');
    expect(header.style.position).toBe('sticky');
    expect(header.style.top).toBe('0px');
  });
});

// ─── Row interactions ───────────────────────────────────────────────
describe('Table — Row interactions', () => {
  it('row hover applies style', async () => {
    render(
      <Table
        data={sampleData}
        columns={sampleColumns}
        rowStyle={{ hover: { backgroundColor: '#f0f0f0' } }}
      />,
    );
    const rows = screen.getAllByTestId('data-row');
    fireEvent.mouseEnter(rows[0]);
    // jsdom normalizes hex to rgb
    expect(rows[0].style.backgroundColor).toBe('rgb(240, 240, 240)');
    fireEvent.mouseLeave(rows[0]);
    expect(rows[0].style.backgroundColor).not.toBe('rgb(240, 240, 240)');
  });

  it('onRowClick called with row data', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Table
        data={sampleData}
        columns={sampleColumns}
        onRowClick={onClick}
      />,
    );
    const rows = screen.getAllByTestId('data-row');
    await user.click(rows[0]);
    expect(onClick).toHaveBeenCalledWith(sampleData[0]);
  });
});
