import axios from 'axios';
import type { AxiosResponse } from 'axios';
import i18n from '../i18n/i18n';

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
  if (!isLocal) {
    // Loud, because the fallback is a guess: if the API ever moves off this
    // host, a deploy missing the variable keeps working until it suddenly
    // doesn't, with nothing pointing at the cause.
    console.warn(
      `VITE_API_URL was not set at build time; falling back to ${PRODUCTION_API_URL}. ` +
        'Set it in the deploy environment so the API origin is explicit.'
    );
  }
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

// Called when a refresh finally fails, so the auth context can clear `user` and
// send the browser to /login. Clearing only the token left `isAuthenticated`
// true: the user sat on a protected page where every request 401'd behind a
// generic toast, with nothing telling them their session had ended.
type SessionExpiredHandler = () => void;
let onSessionExpired: SessionExpiredHandler | null = null;

export const setSessionExpiredHandler = (handler: SessionExpiredHandler | null) => {
  onSessionExpired = handler;
};

// One refresh at a time. A dashboard firing five parallel requests used to send
// five independent refreshes; with rotating refresh tokens all but the first
// would fail, logging the user out mid-session. Everyone now awaits the same
// promise and retries once it settles.
let refreshInFlight: Promise<string> | null = null;

const refreshAccessToken = () => {
  if (!refreshInFlight) {
    refreshInFlight = axios
      .post(`${baseURL}/auth/refresh`, {}, { withCredentials: true })
      .then(({ data }) => {
        const token = data.data.accessToken as string;
        setAccessToken(token);
        return token;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
};

apiClient.interceptors.request.use((config) => {
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  // Tells the API which language to answer errors in. Read from the live i18n
  // instance on every request rather than captured once, so switching language
  // takes effect immediately instead of on the next full page load.
  if (config.headers) {
    config.headers['Accept-Language'] = i18n.language || 'en';
  }
  return config;
});

// Endpoints that never carry (or are themselves establishing) an access token —
// a 401 from these is a real auth failure, not an expired-token signal to retry
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout', '/auth/forgot-password', '/auth/reset-password', '/auth/google', '/auth/microsoft'];

// Replaces axios's own message with the one the API sent.
//
// Almost every module in this directory is written as
//
//   const { data } = await apiClient.post(...);
//   if (!data.status) throw new Error(data.message ?? 'Failed to …');
//
// but that check can never run on a failure: axios rejects on any non-2xx, so
// the body — and the message the API went to the trouble of writing — is thrown
// away before the line is reached. The component's `catch (err) { err.message }`
// then renders axios's own string, so "An account with this email already
// exists" reached the user as "Request failed with status code 409", and every
// server fault as "Request failed with status code 500".
//
// Rewriting the message here fixes all 20 of those modules at once, and keeps
// working for the three that already unwrap the body themselves.
const applyServerMessage = (error: any) => {
  // The API's stable identifier for this failure, when it sent one. Kept under
  // its own name rather than `error.code`, which axios already uses for its own
  // transport codes ('ECONNABORTED' below) — overwriting it would break the
  // timeout branch. resolveErrorMessage() in utils/errorMessage.ts turns this
  // into a translated sentence; the English `message` below stays the fallback,
  // so a code the client does not recognise still reads as prose.
  const serverCode = error?.response?.data?.code;
  if (typeof serverCode === 'string' && serverCode.trim()) {
    error.apiErrorCode = serverCode;
  }

  const serverMessage = error?.response?.data?.message;
  if (typeof serverMessage === 'string' && serverMessage.trim()) {
    error.message = serverMessage;
  } else if (error?.response) {
    error.message = `The server returned an unexpected error (HTTP ${error.response.status}).`;
  } else if (error?.code === 'ECONNABORTED') {
    error.message = 'The server took too long to respond. Please try again.';
  } else if (error?.request) {
    // No response at all: offline, DNS, or a CORS rejection — which looks
    // identical to a network failure from here.
    error.message = 'Could not reach the server. Check your connection and try again.';
  }

  // A 500 body carries an errorId matching the server log line. Quoting it gives
  // the user something to report that can actually be traced.
  const errorId = error?.response?.data?.errorId;
  if (errorId) error.message = `${error.message} (ref: ${errorId})`;

  return error;
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthEndpoint = AUTH_ENDPOINTS.some((endpoint) => originalRequest.url?.includes(endpoint));

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      try {
        const token = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      } catch {
        setAccessToken(null);
        // The session is genuinely over: tell the app so it can clear the user
        // and redirect, rather than leaving a signed-out UI that looks signed in.
        onSessionExpired?.();
        // Surface the original request's error, not the refresh attempt's, since that's
        // what's actually relevant to the caller (e.g. the page that made the request)
        return Promise.reject(applyServerMessage(error));
      }
    }

    return Promise.reject(applyServerMessage(error));
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
