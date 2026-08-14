import { apiClient } from './apiClient';

export interface AnonymousDiscoveryProfile {
  id: number;
  userId: number;
  industry: string;
  targetRole: string;
  remotePreference: 'remote' | 'hybrid' | 'onsite' | 'any';
  salaryMin: number | null;
  salaryMax: number | null;
  skillsKeywords: string;
  experienceYears: number | null;
  createdAt: string;
  updatedAt: string;
  operators?: AIOperator[];
}

export interface AIOperator {
  id: number;
  profileId: number;
  name: string;
  isActive: boolean;
  runFrequency: 'hourly' | 'daily' | 'weekly' | 'manual';
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DiscoveryRunResult {
  matches: AnonymousJobMatch[];
  marketSearchUnavailable: boolean;
  message?: string;
}

export interface AnonymousJobMatch {
  id: number;
  profileId: number;
  jobTitle: string;
  companyName: string | null;
  location: string | null;
  jobUrl: string | null;
  description: string | null;
  fitScore: number;
  fitReason: string | null;
  status: 'new' | 'bookmarked' | 'applied' | 'ignored';
  createdAt: string;
  updatedAt: string;
}

export interface AdminDiscoveryProfileDetails extends AnonymousDiscoveryProfile {
  user: {
    id: number;
    name: string;
    email: string;
  };
  operators: AIOperator[];
  matches: AnonymousJobMatch[];
}

export const anonymousDiscoveryApi = {
  getProfile: async (): Promise<AnonymousDiscoveryProfile> => {
    const { data } = await apiClient.get('/anonymous-discovery/profile');
    if (!data.status) throw new Error(data.message || 'Failed to load profile');
    return data.data;
  },

  updateProfile: async (payload: Partial<AnonymousDiscoveryProfile>): Promise<AnonymousDiscoveryProfile> => {
    const { data } = await apiClient.put('/anonymous-discovery/profile', payload);
    if (!data.status) throw new Error(data.message || 'Failed to update profile');
    return data.data;
  },

  getOperators: async (): Promise<AIOperator[]> => {
    const { data } = await apiClient.get('/anonymous-discovery/operators');
    if (!data.status) throw new Error(data.message || 'Failed to load operators');
    return data.data;
  },

  createOperator: async (payload: { name: string; runFrequency: string; isActive?: boolean }): Promise<AIOperator> => {
    const { data } = await apiClient.post('/anonymous-discovery/operators', payload);
    if (!data.status) throw new Error(data.message || 'Failed to create operator');
    return data.data;
  },

  toggleOperator: async (id: number, isActive: boolean): Promise<AIOperator> => {
    const { data } = await apiClient.put(`/anonymous-discovery/operators/${id}`, { isActive });
    if (!data.status) throw new Error(data.message || 'Failed to update operator status');
    return data.data;
  },

  deleteOperator: async (id: number): Promise<void> => {
    const { data } = await apiClient.delete(`/anonymous-discovery/operators/${id}`);
    if (!data.status) throw new Error(data.message || 'Failed to delete operator');
  },

  getMatches: async (): Promise<AnonymousJobMatch[]> => {
    const { data } = await apiClient.get('/anonymous-discovery/matches');
    if (!data.status) throw new Error(data.message || 'Failed to load job matches');
    return data.data;
  },

  updateMatchStatus: async (id: number, status: AnonymousJobMatch['status']): Promise<AnonymousJobMatch> => {
    const { data } = await apiClient.put(`/anonymous-discovery/matches/${id}`, { status });
    if (!data.status) throw new Error(data.message || 'Failed to update match status');
    return data.data;
  },

  runDiscovery: async (): Promise<DiscoveryRunResult> => {
    const { data } = await apiClient.post('/anonymous-discovery/run');
    if (!data.status) throw new Error(data.message || 'Failed to run job discovery');
    return {
      matches: data.data,
      // Set when the upstream market search could not be reached. The server
      // used to substitute invented listings here; it now says so instead, and
      // leaves any existing matches in place.
      marketSearchUnavailable: Boolean(data.marketSearchUnavailable),
      message: data.message,
    };
  },

  // Admin/Operator methods
  adminGetAllProfiles: async (): Promise<AdminDiscoveryProfileDetails[]> => {
    const { data } = await apiClient.get('/anonymous-discovery/admin/profiles');
    if (!data.status) throw new Error(data.message || 'Failed to load admin profiles');
    return data.data;
  },

  adminRunDiscoveryForProfile: async (profileId: number): Promise<AnonymousJobMatch[]> => {
    const { data } = await apiClient.post(`/anonymous-discovery/admin/run/${profileId}`);
    if (!data.status) throw new Error(data.message || 'Failed to run discovery for candidate profile');
    return data.data;
  }
};
