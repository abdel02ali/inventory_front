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

  const {  isInitialized } = useNotifications(); // Added isInitialized

  // Single device registration effect
  useEffect(() => {
    const registerDeviceForPush = async () => {
      try {
        console.log('🔧 Starting device registration...');
        
        // Check permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          console.log('📝 Requesting notification permissions...');
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          console.log('🔕 Notification permission denied');
          return;
        }

        // Get push token
        console.log('📱 Getting Expo push token...');
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        setExpoPushToken(token);
        console.log('✅ Got push token:', token);

        // Register with backend
        console.log('📤 Registering device with backend...');
        const result = await notificationAPI.registerDevice(token);
        console.log('🎯 Backend registration result:', result);
        
      } catch (error) {
        console.error('❌ Device registration failed:', error);
      }
    };

    // Only register if we have notification context initialized
    if (isInitialized) {
      console.log('🚀 Notification context initialized, registering device...');
      registerDeviceForPush();
    } else {
      console.log('⏳ Waiting for notification context to initialize...');
    }
  }, [isInitialized]); // Only run when notifications are initialized

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
      console.log('📤 Creating notification:', notificationData);
      
      // Send to backend - this will automatically send push to all devices
      const response = await notificationAPI.createNotification(notificationData);
      
      if (response.success && response.data) {
        console.log('✅ Backend response:', response);
        
        // Add to local state
        setNotifications(prev => [response.data!, ...prev]);
        
        // Update unread count
        setUnreadCount(prev => prev + 1);
        
        console.log('✅ Notification created and should be pushed to all devices');
        return response.data;
      } else {
        console.error('❌ Backend returned failure:', response);
        throw new Error('Failed to create notification');
      }
    } catch (error) {
      console.error('❌ Error creating synced notification:', error);
      
      // Fallback: Show local notification if backend fails
      console.log('🔄 Falling back to local notification');

      
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
    console.log('🧪 Testing push notification...');
    const result = await notificationAPI.sendTestPush();
    console.log('🧪 Test push result:', result);
    return result;
  };

  // Manual device registration function
  const manuallyRegisterDevice = async (): Promise<boolean> => {
    try {
      console.log('📱 Manual device registration started...');
      
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        console.log('❌ Notification permission not granted');
        return false;
      }

      const token = (await Notifications.getExpoPushTokenAsync()).data;
      setExpoPushToken(token);
      console.log('📱 Manual registration - Token:', token);
      
      const result = await notificationAPI.registerDevice(token);
      console.log('✅ Manual registration result:', result);
      
      return result.success;
    } catch (error) {
      console.error('❌ Manual registration failed:', error);
      return false;
    }
  };

  // Get registered devices count
  const getRegisteredDevices = async () => {
    try {
      const result = await notificationAPI.getRegisteredDevices();
      console.log('📋 Registered devices:', result);
      return result;
    } catch (error) {
      console.error('Error getting devices:', error);
      return null;
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
    testPushNotification,
    manuallyRegisterDevice, // Added manual registration
    getRegisteredDevices, // Added device info
    refetch: fetchNotifications,
    refreshUnreadCount: fetchUnreadCount
  };
};