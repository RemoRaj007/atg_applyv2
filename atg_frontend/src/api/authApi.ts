import { apiClient } from './apiClient';
import type { AuthResponse, RegisterPayload } from '../types/auth.types';

const unwrapOrThrow = <T>(payload: { status: boolean; message: string; data: T }) => {
  if (!payload.status) throw new Error(payload.message || 'Request failed');
  return payload.data;
};

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const { data } = await apiClient.post('/auth/login', { email, password });
      return unwrapOrThrow<AuthResponse>(data);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to log in');
    }
  },

  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    try {
      const { data } = await apiClient.post('/auth/register', payload);
      return unwrapOrThrow<AuthResponse>(data);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to register');
    }
  },

  googleLogin: async (idToken: string): Promise<AuthResponse> => {
    try {
      const { data } = await apiClient.post('/auth/google', { idToken });
      return unwrapOrThrow<AuthResponse>(data);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Google authentication failed');
    }
  },

  refresh: async (): Promise<AuthResponse> => {
    const { data } = await apiClient.post('/auth/refresh');
    return unwrapOrThrow<AuthResponse>(data);
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  forgotPassword: async (email: string): Promise<void> => {
    try {
      await apiClient.post('/auth/forgot-password', { email });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to request password reset');
    }
  },

  resetPassword: async (payload: any): Promise<void> => {
    try {
      await apiClient.post('/auth/reset-password', payload);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to reset password');
    }
  },
};
