const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

/**
 * Read pagination out of a query string.
 *
 * Returns null when the caller asked for no pagination at all, which keeps the
 * pre-existing "return every row" behaviour for consumers that still depend on
 * it. Callers that do pass page/pageSize get a bounded window: pageSize is
 * clamped to MAX_PAGE_SIZE so a client cannot ask for the whole table by
 * sending pageSize=100000.
 */
const parsePagination = (query = {}) => {
  const hasPage = query.page !== undefined && query.page !== "";
  const hasPageSize = query.pageSize !== undefined && query.pageSize !== "";
  if (!hasPage && !hasPageSize) return null;

  const rawPage = Number.parseInt(query.page, 10);
  const rawPageSize = Number.parseInt(query.pageSize, 10);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize = Number.isFinite(rawPageSize) && rawPageSize > 0
    ? Math.min(rawPageSize, MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;

  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
};

/**
 * Wrap rows in the envelope every paginated list endpoint returns.
 *
 * `total` is the count of rows matching the filter, not the page, so a client
 * can render "showing 25 of 812" and compute the last page.
 */
const paginated = (rows, total, pagination) => ({
  data: rows,
  total,
  page: pagination ? pagination.page : 1,
  pageSize: pagination ? pagination.pageSize : rows.length,
  totalPages: pagination ? Math.max(1, Math.ceil(total / pagination.pageSize)) : 1,
});

module.exports = { parsePagination, paginated, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE };
