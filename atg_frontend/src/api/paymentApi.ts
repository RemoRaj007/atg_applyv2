import { apiClient } from './apiClient';
import type { Payment } from '../types/payment.types';

export const paymentApi = {
  list: async (): Promise<Payment[]> => {
    const { data } = await apiClient.get('/payments');
    if (!data.status) throw new Error(data.message || 'Failed to load payments');
    return data.data.payments;
  },

  create: async (payload: FormData | { pkg?: string; amount: number; method?: string; paid?: boolean; status?: string; jobId?: number; appsCount?: number; details?: string }): Promise<Payment> => {
    const headers = payload instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined;
    const { data } = await apiClient.post('/payments', payload, { headers });
    if (!data.status) throw new Error(data.message || 'Failed to create payment');
    return data.data.payment;
  },

  update: async (id: number, payload: { paid?: boolean; status?: string; operatorComment?: string }): Promise<Payment> => {
    const { data } = await apiClient.patch(`/payments/${id}`, payload);
    if (!data.status) throw new Error(data.message || 'Failed to update payment');
    return data.data.payment;
  },
};
