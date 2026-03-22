/** Backend wraps some responses in ApiResponse<T> */
export interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data?: T;
  errors?: string[] | Record<string, string[]>;
}

/** Paged list response for tenants and users */
export interface PaginatedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export function unwrapApiResponse<T>(response: ApiResponse<T> | T): T {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as ApiResponse<T>).data as T;
  }
  return response as T;
}

export function unwrapPaginated<T>(response: unknown): PaginatedResult<T> {
  const r = response as ApiResponse<PaginatedResult<T>>;
  if (r?.data) return r.data;
  if (response && typeof response === 'object' && 'items' in response) {
    return response as PaginatedResult<T>;
  }
  return {
    items: [],
    pageNumber: 1,
    pageSize: 20,
    totalCount: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  };
}
