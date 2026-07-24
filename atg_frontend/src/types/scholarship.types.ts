export interface Scholarship {
  id: number;
  title: string;
  provider: string;
  amount: number | null;
  deadline: string | null;
  description: string | null;
}
