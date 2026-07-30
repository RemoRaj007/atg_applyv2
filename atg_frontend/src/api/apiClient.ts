import axios from 'axios';
import type { AxiosResponse } from 'axios';

// Vite inlines import.meta.env at build time, so VITE_API_URL must be present in the
// build environment — it cannot be injected at runtime by the host. When it's absent
// (e.g. a deploy that forgot to set it) fall back on the origin rather than on
// localhost, which would otherwise point every visitor at their own machine.
const PRODUCTION_API_URL = 'https://atg-applyv2.vercel.app/api';
const LOCAL_API_URL = 'http://localhost:5000/api';

const resolveBaseURL = () => {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (configured) return configured;

  const hostname = typeof window === 'undefined' ? '' : window.location.hostname;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  return isLocal ? LOCAL_API_URL : PRODUCTION_API_URL;
};

const baseURL = resolveBaseURL();

// Exported so utils/fileUrl.ts derives file URLs from the same resolved API
// origin, rather than each call site re-deriving it (and defaulting to
// localhost) on its own.
export const apiBaseUrl = baseURL;

export const apiClient = axios.create({
  baseURL,
  // Vercel cold starts plus a first Supabase connection can take well over 10s;
  // a tighter timeout surfaces as a spurious "unexpected error" on the first request.
  timeout: 30000,
  withCredentials: true, // sends/receives the httpOnly refresh-token cookie
});

let accessToken: string | null = null;

export const getAccessToken = () => accessToken;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

apiClient.interceptors.request.use((config) => {
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Endpoints that never carry (or are themselves establishing) an access token —
// a 401 from these is a real auth failure, not an expired-token signal to retry
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout', '/auth/forgot-password', '/auth/reset-password', '/auth/google', '/auth/microsoft'];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthEndpoint = AUTH_ENDPOINTS.some((endpoint) => originalRequest.url?.includes(endpoint));

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      try {
        const { data } = await axios.post(`${baseURL}/auth/refresh`, {}, { withCredentials: true });
        setAccessToken(data.data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return apiClient(originalRequest);
      } catch {
        setAccessToken(null);
        // Surface the original request's error, not the refresh attempt's, since that's
        // what's actually relevant to the caller (e.g. the page that made the request)
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export const handleApi = async <T>(
  request: Promise<AxiosResponse<{ status: boolean; message: string; data: T }>>
): Promise<ApiResponse<T>> => {
  try {
    const response = await request;
    return { data: response.data.data, error: null };
  } catch (error: any) {
    console.error('API Error:', error);
    const message = error.response?.data?.message || 'An unexpected error occurred';
    return { data: null, error: message };
  }
};
