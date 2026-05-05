export interface SearchConfig {
  enabled: boolean;
  fields: string[];
  placeholder?: string;
}

export interface FilterField {
  field: string;
  type: 'select' | 'date-range' | 'number-range' | 'boolean';
  options?: string[];
}

export interface FilterConfig {
  fields: FilterField[];
}

export interface SortConfig {
  enabled: boolean;
  default?: { field: string; direction: 'asc' | 'desc' };
}

export interface PaginationConfig {
  type: 'pages' | 'infinite-scroll';
  pageSize: number;
}

export interface DataOperationsConfig {
  search?: SearchConfig;
  filter?: FilterConfig;
  sort?: SortConfig;
  pagination?: PaginationConfig;
}

export interface ActiveFilters {
  search?: string;
  filters?: Record<string, unknown>;
  sort?: { field: string; direction: 'asc' | 'desc' };
  page?: number;
}

export interface DataOperationsResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Apply search, filter, sort, and pagination to a dataset.
 * All operations happen in-memory on the provided array.
 */
export function applyDataOperations<T extends Record<string, unknown>>(
  data: T[],
  config: DataOperationsConfig,
  active: ActiveFilters,
): DataOperationsResult<T> {
  let result = [...data];

  // Search
  if (config.search?.enabled && active.search) {
    const query = active.search.toLowerCase();
    const fields = config.search.fields;
    result = result.filter((item) =>
      fields.some((field) => {
        const value = item[field];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(query);
      }),
    );
  }

  // Filters
  if (config.filter && active.filters) {
    for (const [field, filterValue] of Object.entries(active.filters)) {
      if (filterValue === undefined || filterValue === null || filterValue === '') continue;
      result = result.filter((item) => {
        const itemValue = item[field];
        if (Array.isArray(filterValue)) {
          // Range filter: [min, max]
          const [min, max] = filterValue as [number, number];
          const num = Number(itemValue);
          return num >= min && num <= max;
        }
        return itemValue === filterValue;
      });
    }
  }

  // Sort
  const sortConfig = active.sort ?? config.sort?.default;
  if (sortConfig) {
    const { field, direction } = sortConfig;
    const mult = direction === 'desc' ? -1 : 1;
    result.sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal) * mult;
      }
      return ((aVal as number) - (bVal as number)) * mult;
    });
  }

  // Pagination
  const total = result.length;
  const pageSize = config.pagination?.pageSize ?? total;
  const page = active.page ?? 0;
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 1;
  const start = page * pageSize;
  result = result.slice(start, start + pageSize);

  return { data: result, total, page, totalPages };
}
