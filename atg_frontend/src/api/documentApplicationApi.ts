// The shared client, not a bare axios instance: it carries the resolved API
// origin, the Bearer access token, and the refresh-and-retry interceptor. These
// endpoints all require authentication, and the base URL this module used to read
// (VITE_API_BASE_URL) is set nowhere in the project — every call fell back to
// localhost and, in a browser, went nowhere.
import { apiClient } from "./apiClient";

export interface DocumentApplication {
  id: number;
  userId: number;
  documentType: string;
  status: string;
  submissionDate?: string;
  createdAt: string;
  updatedAt: string;
  // The admin list joins the applicant, which these pages render. Optional
  // because the candidate-facing endpoints return the row without it.
  user?: { id: number; name?: string; email: string };
}

export const DOCUMENT_TYPES = [
  "visa",
  "id",
  "citizenship",
  "bank",
  "passport",
  "driving_license",
  "employment_letter",
  "education_certificate",
  "residence_permit",
  "work_permit",
  "other",
];

const documentApplicationApi = {
  list: async () => {
    const response = await apiClient.get(`/document-applications`);
    return response.data.data;
  },

  listAll: async () => {
    const response = await apiClient.get(`/document-applications/all`);
    return response.data.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get(`/document-applications/${id}`);
    return response.data.data;
  },

  create: async (data: Omit<DocumentApplication, "id" | "userId" | "createdAt" | "updatedAt">) => {
    const response = await apiClient.post(`/document-applications`, data);
    return response.data.data;
  },

  update: async (id: number, data: Partial<DocumentApplication>) => {
    const response = await apiClient.patch(`/document-applications/${id}`, data);
    return response.data.data;
  },

  remove: async (id: number) => {
    const response = await apiClient.delete(`/document-applications/${id}`);
    return response.data;
  },
};

export default documentApplicationApi;
