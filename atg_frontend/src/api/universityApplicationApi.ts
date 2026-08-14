// The shared client, not a bare axios instance: it carries the resolved API
// origin, the Bearer access token, and the refresh-and-retry interceptor. These
// endpoints all require authentication, and the base URL this module used to read
// (VITE_API_BASE_URL) is set nowhere in the project — every call fell back to
// localhost and, in a browser, went nowhere.
import { apiClient } from "./apiClient";

export interface UniversityApplication {
  id: number;
  userId: number;
  universityName: string;
  programName: string;
  applicationStatus: string;
  submissionDate?: string;
  createdAt: string;
  updatedAt: string;
  // The admin list joins the applicant, which these pages render. Optional
  // because the candidate-facing endpoints return the row without it.
  user?: { id: number; name?: string; email: string };
}

const universityApplicationApi = {
  list: async () => {
    const response = await apiClient.get(`/university-applications`);
    return response.data.data;
  },

  listAll: async () => {
    const response = await apiClient.get(`/university-applications/all`);
    return response.data.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get(`/university-applications/${id}`);
    return response.data.data;
  },

  create: async (data: Omit<UniversityApplication, "id" | "userId" | "createdAt" | "updatedAt">) => {
    const response = await apiClient.post(`/university-applications`, data);
    return response.data.data;
  },

  update: async (id: number, data: Partial<UniversityApplication>) => {
    const response = await apiClient.patch(`/university-applications/${id}`, data);
    return response.data.data;
  },

  remove: async (id: number) => {
    const response = await apiClient.delete(`/university-applications/${id}`);
    return response.data;
  },
};

export default universityApplicationApi;
