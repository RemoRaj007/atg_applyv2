import { apiClient } from './apiClient';

export interface SiteSetting {
  id: number;
  key: string;
  value: string;
  valueType: 'text' | 'longtext' | 'number' | 'boolean' | 'url' | 'email' | 'color';
  group: string;
  label: string;
  description?: string | null;
  isPublic: boolean;
  sortOrder: number;
}

export interface ContentBlock {
  id: number;
  page: string;
  key: string;
  value: string;
  valueType: string;
  label: string;
  helpText?: string | null;
  sortOrder: number;
}

export interface EmailTemplate {
  id: number;
  key: string;
  name: string;
  subject: string;
  body: string;
  description?: string | null;
  variables?: string | null;
  isActive: boolean;
}

// Coerced server-side to the type each row declares, so a number setting
// arrives as a number rather than a string.
export type PublicSettings = Record<string, string | number | boolean>;
export type PageContent = Record<string, string>;

export const contentApi = {
  // ── Public ────────────────────────────────────────────────────────────────
  publicSettings: async (): Promise<PublicSettings> => {
    const { data } = await apiClient.get('/content/public/settings');
    return data.data.settings;
  },

  publicPage: async (page: string): Promise<PageContent> => {
    const { data } = await apiClient.get(`/content/public/pages/${page}`);
    return data.data.content;
  },

  // ── Admin ─────────────────────────────────────────────────────────────────
  listSettings: async (group?: string): Promise<SiteSetting[]> => {
    const { data } = await apiClient.get('/content/settings', { params: group ? { group } : {} });
    if (!data.status) throw new Error(data.message);
    return data.data.settings;
  },

  saveSettings: async (settings: { key: string; value: string }[]): Promise<SiteSetting[]> => {
    const { data } = await apiClient.put('/content/settings', { settings });
    if (!data.status) throw new Error(data.message);
    return data.data.settings;
  },

  listContent: async (page?: string): Promise<ContentBlock[]> => {
    const { data } = await apiClient.get('/content/pages', { params: page ? { page } : {} });
    if (!data.status) throw new Error(data.message);
    return data.data.content;
  },

  saveContent: async (blocks: { id: number; value: string }[]): Promise<ContentBlock[]> => {
    const { data } = await apiClient.put('/content/pages', { blocks });
    if (!data.status) throw new Error(data.message);
    return data.data.content;
  },

  resetPage: async (page: string): Promise<ContentBlock[]> => {
    const { data } = await apiClient.post(`/content/pages/${page}/reset`);
    if (!data.status) throw new Error(data.message);
    return data.data.content;
  },

  listTemplates: async (): Promise<EmailTemplate[]> => {
    const { data } = await apiClient.get('/content/email-templates');
    if (!data.status) throw new Error(data.message);
    return data.data.templates;
  },

  saveTemplate: async (
    id: number,
    patch: { subject?: string; body?: string; isActive?: boolean }
  ): Promise<EmailTemplate> => {
    const { data } = await apiClient.put(`/content/email-templates/${id}`, patch);
    if (!data.status) throw new Error(data.message);
    return data.data.template;
  },

  resetTemplate: async (id: number): Promise<EmailTemplate> => {
    const { data } = await apiClient.post(`/content/email-templates/${id}/reset`);
    if (!data.status) throw new Error(data.message);
    return data.data.template;
  },

  seedDefaults: async (): Promise<void> => {
    await apiClient.post('/content/seed');
  },
};
