import { apiClient } from './apiClient';

export interface JobFormColumn {
  id: number;
  jobId: number;
  name: string;
  label: string;
  inputType: 'text' | 'number' | 'file';
  isRequired: boolean;
  options?: string;
  status: string;
}

export interface JobFormValue {
  id: number;
  applicationId: number;
  columnId: number;
  value: string;
  column?: JobFormColumn;
}

export const jobFormApi = {
  // Columns for job
  getColumns: async (jobId: number): Promise<JobFormColumn[]> => {
    const { data } = await apiClient.get(`/job-forms/jobs/${jobId}/columns`);
    if (!data.status) throw new Error(data.message || 'Failed to load job form columns');
    return data.data.columns;
  },

  saveColumns: async (jobId: number, columns: Partial<JobFormColumn>[]): Promise<JobFormColumn[]> => {
    const { data } = await apiClient.post(`/job-forms/jobs/${jobId}/columns`, { columns });
    if (!data.status) throw new Error(data.message || 'Failed to save job form columns');
    return data.data.columns;
  },

  // Values for application
  getValues: async (applicationId: number): Promise<JobFormValue[]> => {
    const { data } = await apiClient.get(`/job-forms/applications/${applicationId}/values`);
    if (!data.status) throw new Error(data.message || 'Failed to load job form values');
    return data.data.values;
  },

  saveValues: async (applicationId: number, formData: FormData): Promise<any> => {
    const { data } = await apiClient.post(`/job-forms/applications/${applicationId}/values`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    if (!data.status) throw new Error(data.message || 'Failed to save job form values');
    return data.data.saved;
  },
};
