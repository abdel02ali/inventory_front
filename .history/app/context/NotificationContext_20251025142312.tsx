import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import NotificationService from '../../services/notificationService';

interface NotificationSettings {
  lowStockEnabled: boolean;
  outOfStockEnabled: boolean;
  usageSpikeEnabled: boolean;
  dailySummaryEnabled: boolean;
  weeklyReportEnabled: boolean;
  lowStockThreshold: number;
  usageSpikeThreshold: number;
  quietHours: { start: string; end: string };
}

interface NotificationContextType {
  settings: NotificationSettings;
  updateSettings: (newSettings: Partial<NotificationSettings>) => void;
  scheduleLowStockAlert: (productName: string, currentStock: number) => Promise<void>;
  scheduleOutOfStockAlert: (productName: string) => Promise<void>;
  scheduleUsageSpikeAlert: (productName: string, usageCount: number, averageUsage: number) => Promise<void>;
  initializeNotifications: () => Promise<boolean>;
  scheduledNotifications: any[];
  clearAllNotifications: () => Promise<void>;
  isInitialized: boolean;
}

const defaultSettings: NotificationSettings = {
  lowStockEnabled: true,
  outOfStockEnabled: true,
  usageSpikeEnabled: true,
  dailySummaryEnabled: false,
  weeklyReportEnabled: true,
  lowStockThreshold: 10,
  usageSpikeThreshold: 50,
  quietHours: { start: '22:00', end: '08:00' },
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [scheduledNotifications, setScheduledNotifications] = useState<any[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const notificationService = NotificationService.getInstance();

  useEffect(() => {
    initializeNotifications();
    
    // Set up notification handlers
    const receivedSubscription = notificationService.addNotificationReceivedListener(handleNotificationReceived);
    const responseSubscription = notificationService.addNotificationResponseListener(handleNotificationResponse);

    return () => {
      notificationService.removeSubscription(receivedSubscription);
      notificationService.removeSubscription(responseSubscription);
    };
  }, []);

  const initializeNotifications = async (): Promise<boolean> => {
    const success = await notificationService.initialize();
    setIsInitialized(success);
    if (success) {
      await loadScheduledNotifications();
    }
    return success;
  };

  const loadScheduledNotifications = async () => {
    try {
      const notifications = await notificationService.getScheduledNotifications();
      setScheduledNotifications(notifications);
    } catch (error) {
      console.error('Error loading scheduled notifications:', error);
    }
  };

  const handleNotificationReceived = (notification: any) => {
    console.log('Notification received:', notification);
  };

  const handleNotificationResponse = (response: any) => {
    const { data } = response.notification.request.content;
    console.log('Notification tapped:', data);
    
    switch (data.type) {
      case 'low_stock':
        Alert.alert('Low Stock', `Navigate to ${data.productName}?`);
        break;
      case 'out_of_stock':
        Alert.alert('Out of Stock', `Navigate to ${data.productName}?`);
        break;
      case 'usage_spike':
        Alert.alert('Usage Spike', `Check analytics for ${data.productName}`);
        break;
      default:
        break;
    }
  };

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    await loadScheduledNotifications();
  };

  const scheduleLowStockAlert = async (productName: string, currentStock: number) => {
    if (!settings.lowStockEnabled || !isInitialized) return;
    
    if (currentStock <= settings.lowStockThreshold) {
      await notificationService.scheduleLowStockNotification(
        productName, 
        currentStock, 
        settings.lowStockThreshold
      );
      await loadScheduledNotifications();
    }
  };

  const scheduleOutOfStockAlert = async (productName: string) => {
    if (!settings.outOfStockEnabled || !isInitialized) return;
    
    await notificationService.scheduleOutOfStockNotification(productName);
    await loadScheduledNotifications();
  };

  const scheduleUsageSpikeAlert = async (productName: string, usageCount: number, averageUsage: number) => {
    if (!settings.usageSpikeEnabled || !isInitialized) return;
    
    const increasePercentage = ((usageCount - averageUsage) / averageUsage) * 100;
    if (increasePercentage >= settings.usageSpikeThreshold) {
      await notificationService.scheduleUsageSpikeNotification(
        productName, 
        usageCount, 
        averageUsage
      );
      await loadScheduledNotifications();
    }
  };

  const clearAllNotifications = async () => {
    await notificationService.cancelAllNotifications();
    setScheduledNotifications([]);
  };

  return (
    <NotificationContext.Provider
      value={{
        settings,
        updateSettings,
        scheduleLowStockAlert,
        scheduleOutOfStockAlert,
        scheduleUsageSpikeAlert,
        initializeNotifications,
        scheduledNotifications,
        clearAllNotifications,
        isInitialized,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};