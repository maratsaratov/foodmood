import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from './useAuth';

export function useNotifications() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get('/notifications/');
      setUnreadCount(data.unread_count);
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [fetchUnread]);

  return { unreadCount, refetch: fetchUnread };
}
