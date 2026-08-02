import { apiClient } from './apiClient';

export interface LogEntry {
  id: number;
  category: string;
  level: string;
  message: string;
  meta?: Record<string, unknown> | null;
  userId?: number | null;
  createdAt: string;
}

export interface LogFilters {
  category?: string;
  level?: string;
  userId?: number;
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface LogPage {
  logs: LogEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface LogSummary {
  days: number;
  total: number;
  byCategory: Record<string, number>;
  byLevel: Record<string, number>;
}

// Empty strings would otherwise go out as `category=` and fail validation.
const clean = (filters: LogFilters): Record<string, string | number> =>
  Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ) as Record<string, string | number>;

export const logApi = {
  list: async (filters: LogFilters = {}): Promise<LogPage> => {
    const { data } = await apiClient.get('/logs', { params: clean(filters) });
    if (!data.status) throw new Error(data.message || 'Failed to load system logs');
    return data.data;
  },

  summary: async (days = 7): Promise<LogSummary> => {
    const { data } = await apiClient.get('/logs/summary', { params: { days } });
    if (!data.status) throw new Error(data.message || 'Failed to load the log summary');
    return data.data;
  },

  // Requested as a blob so the CSV never goes through JSON parsing on its way
  // to the download.
  exportCsv: async (filters: LogFilters = {}): Promise<Blob> => {
    const { data } = await apiClient.get('/logs/export', {
      params: clean(filters),
      responseType: 'blob',
    });
    return data as Blob;
  },
};
