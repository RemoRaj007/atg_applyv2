import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export interface DocumentApplication {
  id: number;
  userId: number;
  documentType: string;
  status: string;
  submissionDate?: string;
  createdAt: string;
  updatedAt: string;
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
    const response = await axios.get(`${API_BASE_URL}/document-applications`);
    return response.data.data;
  },

  listAll: async () => {
    const response = await axios.get(`${API_BASE_URL}/document-applications/all`);
    return response.data.data;
  },

  getById: async (id: number) => {
    const response = await axios.get(`${API_BASE_URL}/document-applications/${id}`);
    return response.data.data;
  },

  create: async (data: Omit<DocumentApplication, "id" | "userId" | "createdAt" | "updatedAt">) => {
    const response = await axios.post(`${API_BASE_URL}/document-applications`, data);
    return response.data.data;
  },

  update: async (id: number, data: Partial<DocumentApplication>) => {
    const response = await axios.patch(`${API_BASE_URL}/document-applications/${id}`, data);
    return response.data.data;
  },

  remove: async (id: number) => {
    const response = await axios.delete(`${API_BASE_URL}/document-applications/${id}`);
    return response.data;
  },
};

export default documentApplicationApi;
