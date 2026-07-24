import { apiClient } from './apiClient';

export interface LogEntry {
  id: number;
  category: string;
  level: string;
  message: string;
  meta?: any;
  userId?: number;
  createdAt: string;
}

export const logApi = {
  list: async (): Promise<LogEntry[]> => {
    const { data } = await apiClient.get('/logs');
    if (!data.status) throw new Error(data.message || 'Failed to load system logs');
    return data.data.logs;
  },
};
