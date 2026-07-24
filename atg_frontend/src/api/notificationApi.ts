import { apiClient } from './apiClient';
import type { Notification } from '../types/notification.types';

export const notificationApi = {
  list: async (): Promise<Notification[]> => {
    const { data } = await apiClient.get('/notifications');
    if (!data.status) throw new Error(data.message || 'Failed to load notifications');
    return data.data.notifications;
  },

  getUnreadCount: async (): Promise<number> => {
    const { data } = await apiClient.get('/notifications/unread-count');
    if (!data.status) return 0;
    return data.data.unreadCount ?? 0;
  },

  markRead: async (id: number): Promise<Notification> => {
    const { data } = await apiClient.patch(`/notifications/${id}/read`);
    if (!data.status) throw new Error(data.message || 'Failed to update notification');
    return data.data.notification;
  },

  markAllRead: async (): Promise<void> => {
    const { data } = await apiClient.patch('/notifications/read-all');
    if (!data.status) throw new Error(data.message || 'Failed to mark all as read');
  },
};

