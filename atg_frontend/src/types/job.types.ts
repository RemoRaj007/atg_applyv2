export interface FitBreakdownItem {
  score: number;
  max: number;
  label: string;
}

export interface FitBreakdown {
  jobRole: FitBreakdownItem;
  skills: FitBreakdownItem;
  location: FitBreakdownItem;
  experience: FitBreakdownItem;
  education: FitBreakdownItem;
  employmentType: FitBreakdownItem;
}

export interface Job {
  id: number;
  company: string;
  companyId?: number;
  title: string;
  location: string | null;
  source: string | null;
  status?: 'pending_payment' | 'pending' | 'approved' | 'rejected';
  deadline?: string;
  experience?: string;
  locationType?: string;
  fitReason?: string;
  jobUrl?: string;
  description?: string;
  jobRoleId?: number;
  jobRole?: { id: number; name: string };
  skills?: { id: number; skillId: number; weight?: number; skill?: { id: number; name: string; category?: string } }[];
  fitScore?: number;
  successRate?: number;
  breakdown?: FitBreakdown | null;
  createdAt?: string;
  updatedAt?: string;
}

