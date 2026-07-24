import { apiClient as api } from './apiClient';
import type { Skill } from './skillApi';

export interface JobRoleSkill {
  id: number;
  jobRoleId: number;
  skillId: number;
  skill: Skill;
}

export interface JobRole {
  id: number;
  name: string;
  status: 'pending' | 'active' | 'rejected';
  d_status: string;
  createdAt: string;
  jobRoleSkills?: JobRoleSkill[];
}

export const jobRoleApi = {
  list: async (): Promise<{ jobRoles: JobRole[] }> => {
    const res = await api.get('/job-roles');
    return res.data.data;
  },
  
  getById: async (id: number): Promise<{ jobRole: JobRole }> => {
    const res = await api.get(`/job-roles/${id}`);
    return res.data.data;
  },

  create: async (data: { name: string; skills?: number[] }): Promise<{ jobRole: JobRole }> => {
    const res = await api.post('/job-roles', data);
    return res.data.data;
  },

  update: async (id: number, data: { name?: string; skills?: number[] }): Promise<{ jobRole: JobRole }> => {
    const res = await api.put(`/job-roles/${id}`, data);
    return res.data.data;
  },

  remove: async (id: number): Promise<{ message: string }> => {
    const res = await api.delete(`/job-roles/${id}`);
    return res.data;
  },

  approve: async (id: number, status: 'approved' | 'rejected'): Promise<{ jobRole: JobRole }> => {
    const finalStatus = status === 'approved' ? 'active' : 'rejected';
    const res = await api.put(`/job-roles/${id}`, { status: finalStatus });
    return res.data.data;
  }
};
