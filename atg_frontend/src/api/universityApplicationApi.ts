import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export interface UniversityApplication {
  id: number;
  userId: number;
  universityName: string;
  programName: string;
  applicationStatus: string;
  submissionDate?: string;
  createdAt: string;
  updatedAt: string;
}

const universityApplicationApi = {
  list: async () => {
    const response = await axios.get(`${API_BASE_URL}/university-applications`);
    return response.data.data;
  },

  listAll: async () => {
    const response = await axios.get(`${API_BASE_URL}/university-applications/all`);
    return response.data.data;
  },

  getById: async (id: number) => {
    const response = await axios.get(`${API_BASE_URL}/university-applications/${id}`);
    return response.data.data;
  },

  create: async (data: Omit<UniversityApplication, "id" | "userId" | "createdAt" | "updatedAt">) => {
    const response = await axios.post(`${API_BASE_URL}/university-applications`, data);
    return response.data.data;
  },

  update: async (id: number, data: Partial<UniversityApplication>) => {
    const response = await axios.patch(`${API_BASE_URL}/university-applications/${id}`, data);
    return response.data.data;
  },

  remove: async (id: number) => {
    const response = await axios.delete(`${API_BASE_URL}/university-applications/${id}`);
    return response.data;
  },
};

export default universityApplicationApi;
