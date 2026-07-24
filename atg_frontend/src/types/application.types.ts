import type { JobFormValue } from '../api/jobFormApi';

export interface Application {
  id: number;
  userId: number;
  jobId?: number | null;
  scholarshipId?: number | null;
  staffId: number | null;
  fitScore: number | null;
  reason: string | null;
  status: string;
  successRate?: number | null;
  candidateApproval: boolean;
  qcApproval: boolean;
  proof: string | null;
  proofRef: string | null;
  internalNotes: string | null;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
  job?: {
    id: number;
    company: string;
    title: string;
    location: string | null;
    source?: string | null;
    deadline?: string | null;
    jobUrl?: string | null;
    experience?: string | null;
    locationType?: string | null;
    fitReason?: string | null;
  } | null;
  scholarship?: {
    id: number;
    title: string;
    provider: string;
    amount: number | null;
    deadline?: string | null;
    description?: string | null;
  } | null;
  user: {
    id: number;
    name: string;
    email: string;
  };
  staff: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
  } | null;
  formValues?: JobFormValue[];
  operatorDocNotes?: string | null;
  candidateComment?: string | null;
  candidateFeedback?: string | null;
  candidateFeedbackRating?: number | null;
  jobLinkRequest?: string | null;   // candidate-submitted external job URL
  operatorFitNote?: string | null;  // operator written fit assessment for link requests
  comments?: any[];
  comment?: string;
}
