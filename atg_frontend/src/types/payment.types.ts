export interface Payment {
  id: number;
  userId: number;
  pkg: string;
  amount: number;
  paid: boolean;
  currency: string;
  method: string | null;
  status: string;
  ref: string | null;
  slipUrl?: string | null;
  operatorComment?: string | null;
  appsCount?: number;
  details?: string | null;
  createdAt: string;
}
