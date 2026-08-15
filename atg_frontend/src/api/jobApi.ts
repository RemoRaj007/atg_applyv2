import { apiClient } from './apiClient';
import type { Job } from '../types/job.types';
import { toPageMeta, type PageQuery, type Paged } from '../types/pagination.types';

export const jobApi = {
  list: async (): Promise<Job[]> => {
    const { data } = await apiClient.get('/jobs');
    if (!data.status) throw new Error(data.message || 'Failed to load jobs');
    return data.data.jobs;
  },

  listPaged: async (params?: PageQuery): Promise<Paged<Job>> => {
    const { data } = await apiClient.get('/jobs', { params });
    if (!data.status) throw new Error(data.message || 'Failed to load jobs');
    return {
      items: data.data.jobs,
      pagination: toPageMeta(data.data.pagination, data.data.jobs.length),
    };
  },

  getRecommendations: async (): Promise<{ jobs: Job[]; scholarships: any[] }> => {
    const { data } = await apiClient.get('/jobs/recommendations');
    if (!data.status) throw new Error(data.message || 'Failed to load recommendations');
    return data.data;
  },

  getById: async (id: number): Promise<Job> => {
    const { data } = await apiClient.get(`/jobs/${id}`);
    if (!data.status) throw new Error(data.message || 'Failed to load job');
    return data.data.job;
  },
  create: async (payload: Partial<Job>): Promise<Job> => {
    const { data } = await apiClient.post('/jobs', payload);
    if (!data.status) throw new Error(data.message || 'Failed to create job');
    return data.data.job;
  },

  update: async (id: number, payload: Partial<Job>): Promise<Job> => {
    const { data } = await apiClient.put(`/jobs/${id}`, payload);
    if (!data.status) throw new Error(data.message || 'Failed to update job');
    return data.data.job;
  },

  approve: async (id: number, status: 'approved' | 'rejected'): Promise<Job> => {
    const { data } = await apiClient.patch(`/jobs/${id}/approve`, { status });
    if (!data.status) throw new Error(data.message || 'Failed to change job status');
    return data.data.job;
  },

  remove: async (id: number): Promise<void> => {
    const { data } = await apiClient.delete(`/jobs/${id}`);
    if (!data.status) throw new Error(data.message || 'Failed to delete job');
  },
};
