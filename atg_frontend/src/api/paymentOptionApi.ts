import { apiClient } from './apiClient';
import type { PaymentOption } from '../types/paymentOption.types';

export const paymentOptionApi = {
  list: async (): Promise<PaymentOption[]> => {
    const { data } = await apiClient.get('/payment-options');
    if (!data.status) throw new Error(data.message || 'Failed to load payment options');
    return data.data.options;
  },

  getById: async (id: number): Promise<PaymentOption> => {
    const { data } = await apiClient.get(`/payment-options/${id}`);
    if (!data.status) throw new Error(data.message || 'Failed to load payment option');
    return data.data.option;
  },

  create: async (payload: Partial<PaymentOption>): Promise<PaymentOption> => {
    const { data } = await apiClient.post('/payment-options', payload);
    if (!data.status) throw new Error(data.message || 'Failed to create payment option');
    return data.data.option;
  },

  update: async (id: number, payload: Partial<PaymentOption>): Promise<PaymentOption> => {
    const { data } = await apiClient.patch(`/payment-options/${id}`, payload);
    if (!data.status) throw new Error(data.message || 'Failed to update payment option');
    return data.data.option;
  },

  remove: async (id: number): Promise<void> => {
    const { data } = await apiClient.delete(`/payment-options/${id}`);
    if (!data.status) throw new Error(data.message || 'Failed to delete payment option');
  },
};
