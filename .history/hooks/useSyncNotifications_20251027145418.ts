// hooks/useSyncNotifications.ts
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { useNotifications } from '../app/context/NotificationContext';
import { Notification, notificationAPI } from '../services/notificationAPI';

export interface SyncedNotification extends Omit<Notification, 'createdAt' | 'readAt'> {
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

  // Register device for push notifications
  useEffect(() => {
    const registerForPushNotifications = async () => {
      try {
        // Request permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          console.log('🔕 Push notification permission denied');
          return;
        }

        // Get push token
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        setExpoPushToken(token);
        console.log('📱 Expo push token:', token);

        // Register with backend
        await notificationAPI.registerDevice(token);
        
      } catch (error) {
        console.error('❌ Error registering for push notifications:', error);
      }
    };

    registerForPushNotifications();
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

  // Create notification (will now send push to all devices via backend)
  const createNotification = async (notificationData: Omit<SyncedNotification, 'id' | 'read' | 'createdAt'>): Promise<SyncedNotification> => {
    try {
      // Send to backend - this will automatically send push to all devices
      const response = await notificationAPI.createNotification(notificationData);
      
      if (response.success && response.data) {
        // Add to local state
        setNotifications(prev => [response.data!, ...prev]);
        
        // Update unread count
        setUnreadCount(prev => prev + 1);
        
        console.log('✅ Notification created and pushed to all devices:', response.data.id);
        return response.data;
      }
      throw new Error('Failed to create notification');
    } catch (error) {
      console.error('Error creating synced notification:', error);
      
      // Fallback: Show local notification if backend fails
      await scheduleLocalNotification({
        title: notificationData.title,
        body: notificationData.body,
        data: notificationData.data
      });
      
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

  // Test push notification (for debugging)
  const testPushNotification = async () => {
    const result = await notificationAPI.sendTestPush();
    return result;
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
    testPushNotification,
    refetch: fetchNotifications,
    refreshUnreadCount: fetchUnreadCount
  };
};