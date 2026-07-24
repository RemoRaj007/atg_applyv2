import type { User } from './user.types';

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface RegisterPayload {
  email: string;
  name: string;
  password: string;
  phone?: string;
  country?: string;
  city?: string;
  isCompany?: boolean;
  companyName?: string;
  companyWebsite?: string;
  companyDescription?: string;
}
