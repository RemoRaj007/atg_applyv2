/** Query a paginated list endpoint. Omit both fields to get every row. */
export interface PageQuery {
  page?: number;
  pageSize?: number;
}

/** The envelope the backend returns alongside a paginated list. */
export interface PageMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Paged<T> {
  items: T[];
  pagination: PageMeta;
}

/**
 * The backend keeps returning the plain array under its original key for
 * callers that never opted in, so `pagination` is absent on older responses.
 * Fall back to describing the array itself as a single full page.
 */
export const toPageMeta = (raw: Partial<PageMeta> | undefined, itemCount: number): PageMeta => ({
  total: raw?.total ?? itemCount,
  page: raw?.page ?? 1,
  pageSize: raw?.pageSize ?? itemCount,
  totalPages: raw?.totalPages ?? 1,
});
