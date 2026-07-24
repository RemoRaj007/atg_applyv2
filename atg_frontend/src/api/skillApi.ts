import { apiClient } from './apiClient';

export interface Skill {
  id: number;
  name: string;
  category: string | null;
  status: string;
}

export const skillApi = {
  list: (): Promise<{ skills: Skill[] }> => apiClient.get('/skills').then(res => res.data.data),
  create: (data: Partial<Skill>): Promise<{ skill: Skill }> => apiClient.post('/skills', data).then(res => res.data.data),
  update: (id: number, data: Partial<Skill>): Promise<{ skill: Skill }> => apiClient.put(`/skills/${id}`, data).then(res => res.data.data),
  remove: (id: number): Promise<void> => apiClient.delete(`/skills/${id}`).then(res => res.data.data),
};
