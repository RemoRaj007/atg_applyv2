import { apiClient } from './apiClient';

export interface OperatorWorkload {
  id: number;
  name: string;
  active: number;
  capacity: number;
  total: number;
}

export interface AdminOverview {
  usersCount: number;
  jobsCount: number;
  companiesCount: number;
  totalRevenue: number;
  roleCounts: Record<string, number>;
  packageCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  revenueByPackage: Record<string, number>;
  operatorWorkloads: OperatorWorkload[];
}

export interface RevenuePoint {
  createdAt: string;
  amount: number;
  cumulative: number;
}

export const statsApi = {
  // Replaces six full-table fetches the dashboard used to reduce in the browser.
  adminOverview: async (): Promise<AdminOverview> => {
    const { data } = await apiClient.get('/stats/admin/overview');
    if (!data.status) throw new Error(data.message || 'Failed to load dashboard stats');
    return data.data;
  },

  revenueTrend: async (limit = 200): Promise<RevenuePoint[]> => {
    const { data } = await apiClient.get('/stats/admin/revenue-trend', { params: { limit } });
    if (!data.status) throw new Error(data.message || 'Failed to load revenue trend');
    return data.data.trend;
  },
};
