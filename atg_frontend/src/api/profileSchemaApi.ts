import { apiClient } from './apiClient';
import type { ProfileChapter, ProfileResponse, FieldUpdate } from '../features/profile-builder/profile.types';

export const profileSchemaApi = {
  /** The 20 chapters and their questions. Carries no candidate data. */
  schema: async (): Promise<ProfileChapter[]> => {
    const { data } = await apiClient.get('/profile/schema');
    if (!data.status) throw new Error(data.message || 'Failed to load the profile schema');
    return data.data.chapters;
  },

  me: async (): Promise<ProfileResponse> => {
    const { data } = await apiClient.get('/profile/me');
    if (!data.status) throw new Error(data.message || 'Failed to load your profile');
    return data.data;
  },

  /**
   * Saves a small batch of field values. Autosave sends one field at a time;
   * the array exists so a repeatable entry's fields can go together.
   */
  patchFields: async (updates: FieldUpdate[]): Promise<void> => {
    const { data } = await apiClient.patch('/profile/me/fields', { updates });
    if (!data.status) throw new Error(data.message || 'Failed to save');
  },

  removeEntry: async (code: string, repeatIndex: number): Promise<void> => {
    const { data } = await apiClient.delete(`/profile/me/entries/${encodeURIComponent(code)}/${repeatIndex}`);
    if (!data.status) throw new Error(data.message || 'Failed to remove the entry');
  },

  submitForReview: async (notes?: string): Promise<void> => {
    const { data } = await apiClient.post('/profile/me/review', { notes });
    if (!data.status) throw new Error(data.message || 'Failed to submit for review');
  },

  /** Operator/admin read-only view of a candidate's profile. */
  forUser: async (userId: number): Promise<ProfileResponse> => {
    const { data } = await apiClient.get(`/profile/users/${userId}`);
    if (!data.status) throw new Error(data.message || 'Failed to load the candidate profile');
    return data.data;
  },
};
