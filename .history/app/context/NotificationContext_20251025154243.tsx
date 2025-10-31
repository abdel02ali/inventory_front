// context/NotificationContext.tsx
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import NotificationService, { MovementNotificationData } from '../../services/notificationService';

// Add movement notification settings to your existing interface
interface NotificationSettings {
  lowStockEnabled: boolean;
  outOfStockEnabled: boolean;
  usageSpikeEnabled: boolean;
  dailySummaryEnabled: boolean;
  weeklyReportEnabled: boolean;
  lowStockThreshold: number;
  usageSpikeThreshold: number;
  quietHours: { start: string; end: string };
  // NEW MOVEMENT NOTIFICATION SETTINGS
  movementAlertsEnabled: boolean;
  stockInAlertsEnabled: boolean;
  distributionAlertsEnabled: boolean;
  bulkMovementAlertsEnabled: boolean;
}

// Update NotificationContextType with movement methods
interface NotificationContextType {
  settings: NotificationSettings;
  updateSettings: (newSettings: Partial<NotificationSettings>) => void;
  scheduleLowStockAlert: (productName: string, currentStock: number) => Promise<void>;
  scheduleOutOfStockAlert: (productName: string) => Promise<void>;
  scheduleUsageSpikeAlert: (productName: string, usageCount: number, averageUsage: number) => Promise<void>;
  // UPDATE THESE METHOD SIGNATURES
  scheduleMovementAlert: (movementData: MovementNotificationData) => Promise<void>;
  scheduleStockInAlert: (productCount: number, supplier: string, totalValue?: number, stockManager?: string, productNames?: string[]) => Promise<void>;
  scheduleDistributionAlert: (productCount: number, department: string, stockManager?: string, productNames?: string[]) => Promise<void>;
  scheduleBulkMovementSummary: (movements: MovementNotificationData[]) => Promise<void>;
  initializeNotifications: () => Promise<boolean>;
  scheduledNotifications: any[];
  clearAllNotifications: () => Promise<void>;
  isInitialized: boolean;
}


// Update default settings with movement preferences
const defaultSettings: NotificationSettings = {
  lowStockEnabled: true,
  outOfStockEnabled: true,
  usageSpikeEnabled: true,
  dailySummaryEnabled: false,
  weeklyReportEnabled: true,
  lowStockThreshold: 10,
  usageSpikeThreshold: 50,
  quietHours: { start: '22:00', end: '08:00' },
  // NEW MOVEMENT SETTINGS
  movementAlertsEnabled: true,
  stockInAlertsEnabled: true,
  distributionAlertsEnabled: true,
  bulkMovementAlertsEnabled: false,
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
      // NEW MOVEMENT NOTIFICATION HANDLING
      case 'movement':
        if (data.movementType === 'stock_in') {
          Alert.alert(
            'Stock In Completed', 
            `${data.productCount} products added from ${data.supplier}`,
            [
              { text: 'OK', style: 'default' },
              { 
                text: 'View History', 
                onPress: () => {
                  // Navigate to history screen
                  // router.push('/history');
                } 
              }
            ]
          );
        } else {
          Alert.alert(
            'Distribution Completed', 
            `${data.productCount} products distributed to ${data.department}`,
            [
              { text: 'OK', style: 'default' },
              { 
                text: 'View Details', 
                onPress: () => {
                  // Navigate to movement details
                  // if (data.movementId) {
                  //   router.push(`/movement/${data.movementId}`);
                  // }
                } 
              }
            ]
          );
        }
        break;
      case 'bulk_movement_summary':
        Alert.alert(
          'Movement Summary',
          `${data.stockInCount} stock ins, ${data.distributionCount} distributions\n${data.totalProducts} total products moved`,
          [
            { text: 'OK', style: 'default' },
            { 
              text: 'View All', 
              onPress: () => {
                // Navigate to history screen
                // router.push('/history');
              } 
            }
          ]
        );
        break;
      default:
        break;
    }
  };

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    await loadScheduledNotifications();
  };

  // EXISTING STOCK ALERTS (keep as is)
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

  // NEW MOVEMENT NOTIFICATION METHODS
  const scheduleMovementAlert = async (movementData: MovementNotificationData) => {
    if (!settings.movementAlertsEnabled || !isInitialized) return;
    
    // Check specific movement type settings
    if (movementData.type === 'stock_in' && !settings.stockInAlertsEnabled) return;
    if (movementData.type === 'distribution' && !settings.distributionAlertsEnabled) return;
    
    await notificationService.scheduleMovementNotification(movementData);
    await loadScheduledNotifications();
  };

  const scheduleStockInAlert = async (
  productCount: number, 
  supplier: string, 
  totalValue?: number, 
  stockManager: string = 'System',
  productNames?: string[] // ADD THIS PARAMETER
) => {
  if (!settings.movementAlertsEnabled || !settings.stockInAlertsEnabled || !isInitialized) return;
  
  await notificationService.scheduleStockInAlert(
    productCount,
    supplier,
    totalValue,
    stockManager,
    productNames // PASS PRODUCT NAMES
  );
  await loadScheduledNotifications();
};


const scheduleDistributionAlert = async (
  productCount: number, 
  department: string, 
  stockManager: string = 'System',
  productNames?: string[] // ADD THIS PARAMETER
) => {
  if (!settings.movementAlertsEnabled || !settings.distributionAlertsEnabled || !isInitialized) return;
  
  await notificationService.scheduleDistributionAlert(
    productCount,
    department,
    stockManager,
    productNames // PASS PRODUCT NAMES
  );
  await loadScheduledNotifications();
};

  const scheduleBulkMovementSummary = async (movements: MovementNotificationData[]) => {
    if (!settings.movementAlertsEnabled || !settings.bulkMovementAlertsEnabled || !isInitialized) return;
    
    if (movements.length > 0) {
      await notificationService.scheduleBulkMovementSummary(movements);
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
        // NEW METHODS
        scheduleMovementAlert,
        scheduleStockInAlert,
        scheduleDistributionAlert,
        scheduleBulkMovementSummary,
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