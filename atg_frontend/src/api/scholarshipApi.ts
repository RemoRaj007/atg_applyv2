import { apiClient } from './apiClient';
import type { Scholarship } from '../types/scholarship.types';

export const scholarshipApi = {
  list: async (): Promise<Scholarship[]> => {
    const { data } = await apiClient.get('/scholarships');
    if (!data.status) throw new Error(data.message || 'Failed to load scholarships');
    return data.data.scholarships;
  },

  create: async (payload: { title: string; provider: string; amount?: number; deadline?: string; description?: string }): Promise<Scholarship> => {
    const { data } = await apiClient.post('/scholarships', payload);
    if (!data.status) throw new Error(data.message || 'Failed to create scholarship');
    return data.data.scholarship;
  },

  update: async (id: number, payload: Partial<Scholarship>): Promise<Scholarship> => {
    const { data } = await apiClient.put(`/scholarships/${id}`, payload);
    if (!data.status) throw new Error(data.message || 'Failed to update scholarship');
    return data.data.scholarship;
  },

  delete: async (id: number): Promise<void> => {
    const { data } = await apiClient.delete(`/scholarships/${id}`);
    if (!data.status) throw new Error(data.message || 'Failed to delete scholarship');
  },
};
