import { apiClient } from './apiClient';

export interface ProfileColumn {
  id: number;
  name: string;
  label: string;
  inputType: 'text' | 'number' | 'file';
  isRequired: boolean;
  options?: string;
  status: string;
}

export interface ProfileValue {
  id: number;
  userId: number;
  columnId: number;
  value: string;
  column?: ProfileColumn;
}

export const profileApi = {
  // Column definitions (CRUD)
  listColumns: async (): Promise<ProfileColumn[]> => {
    const { data } = await apiClient.get('/profile-columns');
    if (!data.status) throw new Error(data.message || 'Failed to load columns');
    return data.data.columns;
  },

  createColumn: async (payload: Partial<ProfileColumn>): Promise<ProfileColumn> => {
    const { data } = await apiClient.post('/profile-columns', payload);
    if (!data.status) throw new Error(data.message || 'Failed to create column');
    return data.data.column;
  },

  updateColumn: async (id: number, payload: Partial<ProfileColumn>): Promise<ProfileColumn> => {
    const { data } = await apiClient.put(`/profile-columns/${id}`, payload);
    if (!data.status) throw new Error(data.message || 'Failed to update column');
    return data.data.column;
  },

  removeColumn: async (id: number): Promise<void> => {
    const { data } = await apiClient.delete(`/profile-columns/${id}`);
    if (!data.status) throw new Error(data.message || 'Failed to delete column');
  },

  // Values (completed by candidate)
  getValues: async (userId?: number): Promise<ProfileValue[]> => {
    const url = userId ? `/profile-values/${userId}` : '/profile-values';
    const { data } = await apiClient.get(url);
    if (!data.status) throw new Error(data.message || 'Failed to load profile values');
    return data.data.values;
  },

  saveValues: async (formData: FormData): Promise<any> => {
    const { data } = await apiClient.post('/profile-values', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    if (!data.status) throw new Error(data.message || 'Failed to save profile values');
    return data.data.saved;
  },
};
