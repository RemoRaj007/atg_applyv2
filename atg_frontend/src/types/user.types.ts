export interface User {
  id: number;
  email: string;
  role: 'admin' | 'operator' | 'candidate' | 'visitor' | 'company';
  name: string;
  pkg?: string;
  appsTotal?: number;
  appsUsed?: number;
  country?: string;
  city?: string;
  phone?: string;
  capacity?: number;
  companyId?: number;
  isLegendary?: boolean;
  company?: any;
  profilePhoto?: string;
  bio?: string;
  department?: string;
}
