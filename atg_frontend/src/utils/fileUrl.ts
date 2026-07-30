import { apiBaseUrl } from '../api/apiClient';

// Origin serving uploaded files, derived from the configured API base URL.
// Anchored replace: a plain `.replace('/api', '')` would also strip an "/api"
// occurring earlier in the URL.
const fileOrigin = apiBaseUrl.replace(/\/api\/?$/, '');

/**
 * Resolves a stored file reference to a URL usable in `src`/`href`.
 *
 * Uploads live in Supabase Storage and are stored as absolute URLs, so those are
 * returned untouched — prefixing them would corrupt them. Rows created before
 * that migration hold a relative `/uploads/...` path, which is served by the
 * backend's static mount and so needs the API origin prepended.
 */
export const getFileUrl = (pathOrUrl?: string | null): string => {
  if (!pathOrUrl) return '';
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${fileOrigin}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
};

/** As getFileUrl, plus a cache-buster for images that can change in place. */
export const getFileUrlFresh = (pathOrUrl?: string | null): string => {
  const url = getFileUrl(pathOrUrl);
  if (!url) return '';
  return `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
};
