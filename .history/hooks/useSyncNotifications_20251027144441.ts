// hooks/useSyncNotifications.ts
import * as Notifications from 'expo-notifications';
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
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  const { scheduleLocalNotification } = useNotifications();

  // Get Expo push token for this device
  useEffect(() => {
    const getPushToken = async () => {
      try {
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        setExpoPushToken(token);
        console.log('📱 Device push token:', token);
      } catch (error) {
        console.error('Error getting push token:', error);
      }
    };

    getPushToken();
  }, []);

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

  // Send push notification to all devices
  const sendPushNotification = async (notificationData: {
    title: string;
    body: string;
    data?: any;
  }) => {
    try {
      // This would call your backend API to send push notifications to all registered devices
      const response = await notificationAPI.sendPushNotification({
        title: notificationData.title,
        body: notificationData.body,
        data: notificationData.data,
        // Your backend should handle sending to all devices
      });

      if (response.success) {
        console.log('✅ Push notification sent to all devices');
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
      // Fallback to local notification
      await scheduleLocalNotification({
        title: notificationData.title,
        body: notificationData.body,
        data: notificationData.data
      });
    }
  };

  // Create notification (both backend and push to all devices)
  const createNotification = async (notificationData: Omit<SyncedNotification, 'id' | 'read' | 'createdAt'>) => {
    try {
      // Send to backend
      const response = await notificationAPI.createNotification(notificationData);
      
      if (response.success) {
        // Add to local state
        setNotifications(prev => [response.data, ...prev]);
        
        // Update unread count
        setUnreadCount(prev => prev + 1);
        
        // Send push notification to all devices instead of local only
        await sendPushNotification({
          title: notificationData.title,
          body: notificationData.body,
          data: notificationData.data
        });
        
        console.log('✅ Notification created and pushed to all devices:', response.data.id);
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
    expoPushToken,
    createNotification,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
    refreshUnreadCount: fetchUnreadCount
  };
};