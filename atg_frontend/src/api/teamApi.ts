import { apiClient } from './apiClient';
import type { OperatorCapacity } from '../types/team.types';

export const teamApi = {
  getCapacity: async (): Promise<OperatorCapacity[]> => {
    const { data } = await apiClient.get('/team/capacity');
    if (!data.status) throw new Error(data.message || 'Failed to load team capacity');
    return data.data.operators;
  },
};
