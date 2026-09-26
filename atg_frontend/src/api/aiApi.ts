import { apiClient } from './apiClient';

export type AiTone = 'professional' | 'warm' | 'concise';

export interface AiStatus {
  enabled: boolean;
  model: string;
  dailyLimit: number;
  usedToday: number;
  remainingToday: number;
}

export interface AiSharingPreview {
  shared: { code: string; label: string }[];
  limited: { code: string; label: string }[];
  neverShared: number;
}

export interface AiDraft {
  draft: string;
  placeholders: number;
  truncated: boolean;
  sharedFieldCount: number;
  withheld: { limited: number; never: number };
  remainingToday: number;
}

export interface AiFitExplanation {
  fitScore: number;
  explanation: { summary: string; strengths: string[]; gaps: string[]; actions: string[] };
  remainingToday: number;
}

interface CommonOptions {
  includeLimited: boolean;
  language: string;
}

/** Carries the HTTP status so the UI can tell "switched off" from "failed". */
export class AiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

const call = async <T>(request: Promise<{ data: { status: boolean; message?: string; data: T } }>, fallback: string): Promise<T> => {
  try {
    const { data } = await request;
    if (!data.status) throw new AiError(data.message || fallback);
    return data.data;
  } catch (err: any) {
    if (err instanceof AiError) throw err;
    throw new AiError(err?.response?.data?.message || fallback, err?.response?.status);
  }
};

// Every generating call sends consent: true. The server refuses without it, so
// the only way to reach the provider is through the consent step in the UI.
export const aiApi = {
  status: () => call<AiStatus>(apiClient.get('/ai/status'), 'Could not check AI availability'),

  preview: () => call<AiSharingPreview>(apiClient.get('/ai/preview'), 'Could not load what would be shared'),

  draft: (target: { targetType: 'job' | 'scholarship'; targetId: number }, opts: CommonOptions & { tone: AiTone }) =>
    call<AiDraft>(apiClient.post('/ai/application-draft', { ...target, ...opts, consent: true }, { timeout: 70_000 }), 'Could not generate a draft'),

  explainFit: (jobId: number, opts: CommonOptions) =>
    call<AiFitExplanation>(apiClient.post('/ai/fit-explanation', { jobId, ...opts, consent: true }, { timeout: 70_000 }), 'Could not explain the fit'),

  polish: (code: string, answer: string, opts: CommonOptions) =>
    call<{ answer: string; remainingToday: number }>(
      apiClient.post('/ai/answer-polish', { code, answer, ...opts, consent: true }, { timeout: 70_000 }),
      'Could not improve the answer'
    ),
};
