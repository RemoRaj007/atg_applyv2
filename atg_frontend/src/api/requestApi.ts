import { apiClient } from './apiClient';

export interface ChangeRequest {
  id: number;
  type: 'edit_user' | 'delete_user';
  targetId: number;
  reason: string;
  details?: string; // stringified JSON
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  createdById: number;
  createdBy?: {
    id: number;
    name: string;
    email: string;
  };
}

export const requestApi = {
  list: async (): Promise<ChangeRequest[]> => {
    const { data } = await apiClient.get('/requests');
    if (!data.status) throw new Error(data.message || 'Failed to load change requests');
    return data.data.requests;
  },

  create: async (payload: { type: 'edit_user' | 'delete_user'; targetId: number; reason: string; details?: any }): Promise<ChangeRequest> => {
    const { data } = await apiClient.post('/requests', payload);
    if (!data.status) throw new Error(data.message || 'Failed to submit change request');
    return data.data.request;
  },

  approve: async (id: number): Promise<ChangeRequest> => {
    const { data } = await apiClient.patch(`/requests/${id}/approve`);
    if (!data.status) throw new Error(data.message || 'Failed to approve request');
    return data.data.request;
  },

  reject: async (id: number): Promise<ChangeRequest> => {
    const { data } = await apiClient.patch(`/requests/${id}/reject`);
    if (!data.status) throw new Error(data.message || 'Failed to reject request');
    return data.data.request;
  },
};
