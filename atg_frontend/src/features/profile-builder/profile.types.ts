/** Sensitivity and AI policy travel with each field so the UI can label them. */
export type Sensitivity = 'CAREER' | 'PRIVATE' | 'SENSITIVE' | 'RESTRICTED';
export type ExternalAiPolicy = 'YES' | 'LIMITED' | 'NO';

export type InputType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'date'
  | 'boolean'
  | 'url'
  | 'number';

/** A repeatable group lets one schema field hold several entries. */
export type RepeatableGroup = 'education' | 'employment' | 'project' | 'reference';

export interface ProfileFieldValue {
  repeatIndex: number;
  value: string;
  source: string;
  verified: boolean;
  verifiedAt: string | null;
  updatedAt: string;
}

export interface ProfileField {
  id: number;
  code: string;
  label: string;
  helpText: string | null;
  inputType: InputType;
  required: boolean;
  sensitivity: Sensitivity;
  externalAiPolicy: ExternalAiPolicy;
  defaultApplicationUse: string | null;
  purpose: string | null;
  repeatableGroup: RepeatableGroup | null;
  sortOrder: number;
  options: string[] | null;
  validation: { format?: string } | null;
  /** True when the server withheld the values because the viewer may not see them. */
  gated?: boolean;
  values?: ProfileFieldValue[];
}

export interface ProfileChapter {
  code: string;
  title: string;
  description: string | null;
  fields: ProfileField[];
}

/**
 * Completion comes from the server, not the browser. Two different numbers for
 * the same profile — one on the candidate's screen and one on the operator's —
 * would be worse than none.
 */
export type ChapterStatus = 'not_started' | 'in_progress' | 'complete' | 'needs_review';

export interface ChapterCompletion {
  code: string;
  title: string;
  total: number;
  filled: number;
  requiredMissing: string[];
  status: ChapterStatus;
}

export interface ProfileResponse {
  chapters: ProfileChapter[];
  completion: ChapterCompletion[];
}

export interface FieldUpdate {
  code: string;
  repeatIndex?: number;
  value: string;
}

/** What the autosave indicator is showing at any moment. */
export type SaveState = 'idle' | 'saving' | 'saved' | 'error';
