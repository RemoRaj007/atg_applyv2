import { apiClient } from './apiClient';

export type ProfileInputType = 'text' | 'textarea' | 'select' | 'multiselect' | 'number' | 'file';

/** How exposed an answer is. Drives the badge the builder shows on a question. */
export type ProfileSensitivity = 'CAREER' | 'PRIVATE' | 'SENSITIVE' | 'RESTRICTED';

export type ExternalAiPolicy = 'YES' | 'LIMITED' | 'NO';

export interface ProfileField {
  id: number;
  /** Catalogue field code (SYS-01, EDU1-03). The stable key for an answer. */
  code: string;
  label: string;
  inputType: ProfileInputType;
  isRequired: boolean;
  helpText: string | null;
  purpose: string | null;
  sensitivity: ProfileSensitivity;
  externalAiPolicy: ExternalAiPolicy;
  defaultApplicationUse: string | null;
  options: string[] | null;
  validation: { format?: string } | null;
  /** Set when the question is asked once per entry (education, employment…). */
  repeatableGroup: string | null;
  sortOrder: number;
}

export interface ProfileChapter {
  id: number;
  /** Two-digit chapter code, "00" … "19". */
  code: string;
  title: string;
  sortOrder: number;
  fields: ProfileField[];
}

/**
 * Answers keyed by field code. A repeatable question holds an array indexed by
 * entry; every other question holds a single string.
 */
export type ProfileValues = Record<string, string | string[]>;

export interface ChapterProgress {
  code: string;
  title: string;
  total: number;
  answered: number;
  requiredTotal: number;
  requiredAnswered: number;
  complete: boolean;
}

export interface ProfileValuePatch {
  code: string;
  value: string;
  repeatIndex?: number;
}

export const profileSchemaApi = {
  getSchema: (): Promise<{ sections: ProfileChapter[] }> =>
    apiClient.get('/profile/schema').then(res => res.data.data),

  getValues: (userId?: number): Promise<{ values: ProfileValues }> =>
    apiClient.get(userId ? `/profile/${userId}/values` : '/profile/values').then(res => res.data.data),

  /**
   * Patches only the codes supplied — the builder autosaves a chapter at a
   * time, so this must never be treated as a full-profile replace.
   */
  saveValues: (values: ProfileValuePatch[]): Promise<{ saved: number; cleared: number }> =>
    apiClient.patch('/profile/values', { values }).then(res => res.data.data),

  getProgress: (userId?: number): Promise<{ progress: ChapterProgress[] }> =>
    apiClient.get(userId ? `/profile/${userId}/progress` : '/profile/progress').then(res => res.data.data),
};
