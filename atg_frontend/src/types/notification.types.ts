export interface Notification {
  id: number;
  userId: number;
  type: string;
  title: string;
  body: string;
  unread: boolean;
  createdAt: string;
}
