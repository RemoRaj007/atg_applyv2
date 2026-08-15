import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
}

/**
 * Hands search and paging to the server instead of doing them over `data`.
 *
 * Client-side search only ever sees the rows already loaded, so once a list is
 * fetched a page at a time the two cannot coexist: searching would silently
 * miss every match outside the current page. Passing this switches the table to
 * displaying `data` verbatim and reporting intent back to the caller.
 */
export interface ServerPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  loading?: boolean;
}

interface ReusableTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchKeys?: string[];
  itemsPerPage?: number;
  emptyMessage?: string;
  server?: ServerPagination;
}

const getNestedValue = (obj: any, path: string): any => {
  if (!obj) return undefined;
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

export default function ReusableTable<T extends { id: any }>({
  columns,
  data,
  searchPlaceholder = 'Search...',
  searchKeys = [],
  itemsPerPage = 10,
  emptyMessage = 'No matching records found.',
  server,
}: ReusableTableProps<T>) {
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [localPage, setLocalPage] = useState(1);

  const searchQuery = server ? server.searchQuery : localSearchQuery;
  const setSearchQuery = server ? server.onSearchChange : setLocalSearchQuery;
  const currentPage = server ? server.page : localPage;
  const setCurrentPage = server ? server.onPageChange : setLocalPage;

  const filteredData = useMemo(() => {
    // In server mode `data` is already the filtered page.
    if (server) return data;
    if (!searchQuery.trim() || searchKeys.length === 0) return data;
    const lowerQuery = searchQuery.toLowerCase();
    return data.filter((row) =>
      searchKeys.some((key) => {
        const val = getNestedValue(row, key);
        if (val == null) return false;
        return String(val).toLowerCase().includes(lowerQuery);
      })
    );
  }, [data, searchQuery, searchKeys, server]);

  const effectivePageSize = server ? server.pageSize : itemsPerPage;
  const totalItems = server ? server.total : filteredData.length;
  const totalPages = server ? server.totalPages : Math.ceil(totalItems / itemsPerPage);
  const paginatedData = useMemo(() => {
    if (server) return filteredData;
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage, server]);

  const startResult = totalItems === 0 ? 0 : (currentPage - 1) * effectivePageSize + 1;
  const endResult = Math.min(currentPage * effectivePageSize, totalItems);

  const getPageNumbers = () => {
    const pages: number[] = [];
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="w-full flex flex-col">
      {/* Search */}
      {(searchKeys.length > 0 || server) && (
        <div className="px-7 pt-5 pb-4 flex items-center border-b border-slate-800/80 bg-slate-900/40">
          <div className="relative w-full max-w-sm">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
            />
            <input
              type="text"
              className="block w-full pl-9 pr-4 py-2 text-sm rounded-xl outline-none transition-all bg-slate-800/70 border border-slate-700/80 text-slate-100 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto w-full">
        {server?.loading ? (
          <p className="p-10 text-center text-sm font-medium text-slate-400">Loading…</p>
        ) : totalItems === 0 ? (
          <p className="p-10 text-center text-sm font-medium text-slate-400">
            {emptyMessage}
          </p>
        ) : (
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-7 py-3.5 text-[11px] font-bold uppercase tracking-widest text-slate-400"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedData.map((row) => (
                <tr
                  key={row.id}
                  className="transition-colors hover:bg-slate-800/60 bg-slate-900/30"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-7 py-4 text-slate-300"
                    >
                      {col.render
                        ? col.render(row)
                        : String(getNestedValue(row, col.key) ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-7 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800/80 bg-slate-900/40">
          <div className="text-xs text-slate-400">
            Showing{' '}
            <span className="font-bold text-slate-200">
              {startResult}
            </span>{' '}
            to{' '}
            <span className="font-bold text-slate-200">
              {endResult}
            </span>{' '}
            of{' '}
            <span className="font-bold text-slate-200">
              {totalItems}
            </span>{' '}
            results
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg transition-colors border border-slate-700/80 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none"
              title="Previous Page"
            >
              <ChevronLeft size={14} />
            </button>

            {getPageNumbers().map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`min-w-8 h-8 px-2.5 rounded-lg text-xs font-bold transition-all border ${
                  currentPage === page
                    ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                    : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg transition-colors border border-slate-700/80 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none"
              title="Next Page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
