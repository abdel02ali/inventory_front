// hooks/useSyncNotifications.ts
import { useEffect, useState } from 'react';
import { notificationAPI } from '../app/api';
import { useNotifications } from '../app/context/NotificationContext';

export interface SyncedNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: any;
  read: boolean;
  createdAt: string;
  readAt?: string;
}

export const useSyncNotifications = () => {
  const [notifications, setNotifications] = useState<SyncedNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  const { scheduleLocalNotification } = useNotifications();

  // Fetch notifications from backend
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationAPI.getNotifications();
      
      if (response.success) {
        setNotifications(response.data);
        setLastSync(new Date());
        console.log('🔄 Synced notifications from backend:', response.data.length);
      }
    } catch (error) {
      console.error('Error syncing notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const response = await notificationAPI.getUnreadCount();
      if (response.success) {
        setUnreadCount(response.data.count);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Create notification (both backend and local)
  const createNotification = async (notificationData: Omit<SyncedNotification, 'id' | 'read' | 'createdAt'>) => {
    try {
      // Send to backend
      const response = await notificationAPI.createNotification(notificationData);
      
      if (response.success) {
        // Add to local state
        setNotifications(prev => [response.data, ...prev]);
        
        // Update unread count
        setUnreadCount(prev => prev + 1);
        
        // Show local notification
        await scheduleLocalNotification({
          title: notificationData.title,
          body: notificationData.body,
          data: notificationData.data
        });
        
        console.log('✅ Notification created and synced:', response.data.id);
        return response.data;
      }
    } catch (error) {
      console.error('Error creating synced notification:', error);
      throw error;
    }
  };

  // Mark as read
  const markAsRead = async (notificationId: string) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, read: true, readAt: new Date().toISOString() } : notif
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true, readAt: new Date().toISOString() }))
      );
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Sync data periodically
  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();

    // Sync every 2 minutes when app is active
    const interval = setInterval(() => {
      fetchNotifications();
      fetchUnreadCount();
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    lastSync,
    createNotification,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
    refreshUnreadCount: fetchUnreadCount
  };
};