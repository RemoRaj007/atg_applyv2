import { apiClient } from './apiClient';
import type { User } from '../types/user.types';

export const userApi = {
  list: async (): Promise<User[]> => {
    const { data } = await apiClient.get('/users');
    if (!data.status) throw new Error(data.message || 'Failed to load users');
    return data.data.users;
  },

  updateSelf: async (id: number, payload: { name?: string; phone?: string; country?: string; city?: string; password?: string; profilePhoto?: string; bio?: string; department?: string }): Promise<User> => {
    const { data } = await apiClient.put(`/users/${id}`, payload);
    if (!data.status) throw new Error(data.message || 'Failed to update profile');
    return data.data.user;
  },

  uploadProfilePhoto: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('photo', file);
    const { data } = await apiClient.post('/users/profile-photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    if (!data.status) throw new Error(data.message || 'Failed to upload profile photo');
    return data.data.fileUrl;
  },

  changePassword: async (payload: { oldPassword?: string; newPassword?: string }): Promise<void> => {
    const { data } = await apiClient.put('/users/me/password', payload);
    if (!data.status) throw new Error(data.message || 'Failed to change password');
  },

  verifyPassword: async (password: string): Promise<boolean> => {
    const { data } = await apiClient.post('/users/me/verify-password', { password });
    if (!data.status) throw new Error(data.message || 'Failed to verify password');
    return data.data.isValid;
  },

  create: async (payload: Partial<User> & { password?: string }): Promise<User> => {
    const { data } = await apiClient.post('/users', payload);
    if (!data.status) throw new Error(data.message || 'Failed to create user');
    return data.data.user;
  },

  update: async (id: number, payload: Partial<User> & { password?: string }): Promise<User> => {
    const { data } = await apiClient.put(`/users/${id}`, payload);
    if (!data.status) throw new Error(data.message || 'Failed to update user');
    return data.data.user;
  },

  remove: async (id: number): Promise<void> => {
    const { data } = await apiClient.delete(`/users/${id}`);
    if (!data.status) throw new Error(data.message || 'Failed to delete user');
  },
};
