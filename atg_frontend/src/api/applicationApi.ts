import { apiClient } from './apiClient';
import type { Application } from '../types/application.types';
import { toPageMeta, type PageQuery, type Paged } from '../types/pagination.types';

const unwrapOrThrow = <T>(payload: { status: boolean; message: string; data: T }) => {
  if (!payload.status) throw new Error(payload.message || 'Request failed');
  return payload.data;
};

export const applicationApi = {
  list: async (params?: { staffId?: string | number }): Promise<Application[]> => {
    try {
      const { data } = await apiClient.get('/applications', { params });
      return unwrapOrThrow<{ applications: Application[] }>(data).applications;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to load applications');
    }
  },

  // Paginated variant. list() stays unpaginated because the dashboards depend on
  // receiving every row; table pages use this instead.
  listPaged: async (
    params?: PageQuery & { staffId?: string | number }
  ): Promise<Paged<Application>> => {
    try {
      const { data } = await apiClient.get('/applications', { params });
      const payload = unwrapOrThrow<{ applications: Application[]; pagination?: any }>(data);
      return {
        items: payload.applications,
        pagination: toPageMeta(payload.pagination, payload.applications.length),
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to load applications');
    }
  },

  book: async (id: number): Promise<Application> => {
    try {
      const { data } = await apiClient.patch(`/applications/${id}/book`);
      return unwrapOrThrow<{ application: Application }>(data).application;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to book application');
    }
  },

  setCandidateApproval: async (id: number, approved: boolean, comment?: string): Promise<Application> => {
    try {
      const { data } = await apiClient.patch(`/applications/${id}/candidate-approval`, { approved, comment });
      return unwrapOrThrow<{ application: Application }>(data).application;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update application');
    }
  },

  setQcApproval: async (id: number, approved: boolean): Promise<Application> => {
    try {
      const { data } = await apiClient.patch(`/applications/${id}/qc-approval`, { approved });
      return unwrapOrThrow<{ application: Application }>(data).application;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update QC approval');
    }
  },

  create: async (payload: Partial<Application>): Promise<Application> => {
    try {
      const { data } = await apiClient.post('/applications', payload);
      return unwrapOrThrow<{ application: Application }>(data).application;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create application');
    }
  },

  /** NEW: Candidate submits an external job URL for operator review — does NOT consume quota */
  submitLinkRequest: async (jobLinkRequest: string, comment?: string): Promise<Application> => {
    try {
      const { data } = await apiClient.post('/applications/link-request', { jobLinkRequest, comment });
      return unwrapOrThrow<{ application: Application }>(data).application;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to submit job link request');
    }
  },

  /** NEW: Operator submits a fit score and notes for a link request */
  submitFitReview: async (id: number, fitScore: number, operatorFitNote?: string): Promise<Application> => {
    try {
      const { data } = await apiClient.patch(`/applications/${id}/fit-review`, { fitScore, operatorFitNote });
      return unwrapOrThrow<{ application: Application }>(data).application;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to submit fit review');
    }
  },

  /** NEW: Candidate confirms their application after reviewing operator fit assessment — QUOTA consumed here */
  confirmApply: async (id: number): Promise<Application> => {
    try {
      const { data } = await apiClient.patch(`/applications/${id}/confirm-apply`);
      return unwrapOrThrow<{ application: Application }>(data).application;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to confirm application');
    }
  },

  update: async (id: number, payload: Partial<Application> | FormData): Promise<Application> => {
    try {
      const headers = payload instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined;
      const { data } = await apiClient.patch(`/applications/${id}`, payload, { headers });
      return unwrapOrThrow<{ application: Application }>(data).application;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update application');
    }
  },

  addComment: async (id: number, text: string, type: 'public' | 'internal' = 'public'): Promise<Application> => {
    try {
      const { data } = await apiClient.post(`/applications/${id}/comments`, { text, type });
      return unwrapOrThrow<{ application: Application }>(data).application;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to add comment');
    }
  },

  submitFeedback: async (id: number, rating: number, text: string): Promise<Application> => {
    try {
      const { data } = await apiClient.post(`/applications/${id}/feedback`, { rating, text });
      return unwrapOrThrow<{ application: Application }>(data).application;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to submit feedback');
    }
  },

  downloadExportCsv: async (): Promise<void> => {
    const response = await apiClient.get('/applications/export', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = `applications-export-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
