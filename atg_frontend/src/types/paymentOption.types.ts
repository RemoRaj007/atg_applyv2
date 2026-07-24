export interface PaymentOption {
  id: number;
  name: string;
  price: number;
  currency: string;
  appsCount: number;
  features?: string | string[];
  description?: string;
  isPopular: boolean;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}
