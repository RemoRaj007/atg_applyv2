import { apiClient } from './apiClient';

export interface Company {
  id: number;
  name: string;
  email: string;
  website?: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export const companyApi = {
  list: async (): Promise<Company[]> => {
    const { data } = await apiClient.get('/companies');
    if (!data.status) throw new Error(data.message || 'Failed to load companies');
    return data.data.companies;
  },

  create: async (payload: Partial<Company>): Promise<Company> => {
    const { data } = await apiClient.post('/companies', payload);
    if (!data.status) throw new Error(data.message || 'Failed to create company');
    return data.data.company;
  },

  update: async (id: number, payload: Partial<Company>): Promise<Company> => {
    const { data } = await apiClient.put(`/companies/${id}`, payload);
    if (!data.status) throw new Error(data.message || 'Failed to update company');
    return data.data.company;
  },

  approve: async (id: number, status: 'approved' | 'rejected'): Promise<Company> => {
    const { data } = await apiClient.patch(`/companies/${id}/approve`, { status });
    if (!data.status) throw new Error(data.message || 'Failed to change company status');
    return data.data.company;
  },

  remove: async (id: number): Promise<void> => {
    const { data } = await apiClient.delete(`/companies/${id}`);
    if (!data.status) throw new Error(data.message || 'Failed to delete company');
  },
};
