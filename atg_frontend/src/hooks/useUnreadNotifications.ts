import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { notificationApi } from '../api/notificationApi';

export function useUnreadNotifications(pollIntervalMs = 30000) {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const location = useLocation();

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationApi.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to fetch unread notification count:', err);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount, location.pathname]);

  useEffect(() => {
    if (!pollIntervalMs) return;
    const interval = setInterval(fetchUnreadCount, pollIntervalMs);
    return () => clearInterval(interval);
  }, [fetchUnreadCount, pollIntervalMs]);

  return { unreadCount, setUnreadCount, refetchUnreadCount: fetchUnreadCount };
}
