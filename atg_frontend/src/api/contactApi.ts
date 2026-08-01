import { apiClient } from './apiClient';

export interface ContactPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export const contactApi = {
  submit: async (payload: ContactPayload): Promise<void> => {
    const { data } = await apiClient.post('/contact', payload);
    if (!data.status) throw new Error(data.message || 'Failed to send message');
  },
};
