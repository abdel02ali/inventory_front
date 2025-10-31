// context/NotificationContext.tsx
import { useRouter } from 'expo-router';
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

// Weekly Report Data Interface - MOVE THIS OUTSIDE THE CONTEXT TYPE
export interface WeeklyReportData {
  weekStart: string;
  weekEnd: string;
  totalMovements: number;
  stockInCount: number;
  distributionCount: number;
  totalProductsMoved: number;
  lowStockAlerts: number;
  outOfStockAlerts: number;
  topProducts: Array<{
    productName: string;
    movementCount: number;
    totalQuantity: number;
  }>;
  departmentsActivity: Array<{
    departmentName: string;
    distributionCount: number;
    totalProducts: number;
  }>;
  summary: string;
}

// Update NotificationContextType with weekly reports
interface NotificationContextType {
  settings: NotificationSettings;
  updateSettings: (newSettings: Partial<NotificationSettings>) => void;
  scheduleLowStockAlert: (productName: string, currentStock: number) => Promise<void>;
  scheduleOutOfStockAlert: (productName: string) => Promise<void>;
  scheduleUsageSpikeAlert: (productName: string, usageCount: number, averageUsage: number) => Promise<void>;
  // NEW MOVEMENT NOTIFICATION METHODS
  scheduleMovementAlert: (movementData: MovementNotificationData) => Promise<void>;
  scheduleStockInAlert: (productCount: number, supplier: string, totalValue?: number, stockManager?: string, productNames?: string[]) => Promise<void>;
  scheduleDistributionAlert: (productCount: number, department: string, stockManager?: string, productNames?: string[]) => Promise<void>;
  scheduleBulkMovementSummary: (movements: MovementNotificationData[]) => Promise<void>;
  // NEW METHOD FOR GENERAL LOCAL NOTIFICATIONS
  scheduleLocalNotification: (notification: {
    title: string;
    body: string;
    data?: any;
    delay?: number;
  }) => Promise<void>;
  // WEEKLY REPORTS METHODS
  generateWeeklyReport: () => Promise<WeeklyReportData | null>;
  getWeeklyReports: () => WeeklyReportData[];
  scheduleWeeklyReport: () => Promise<void>;
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
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReportData[]>([]);
  const notificationService = NotificationService.getInstance();
  const router = useRouter();

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
      // Schedule weekly report if enabled
      if (settings.weeklyReportEnabled) {
        await scheduleWeeklyReport();
      }
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

  // Generate mock weekly report data (you can replace this with actual API calls)
  const generateWeeklyReport = async (): Promise<WeeklyReportData | null> => {
    try {
      console.log('📊 Generating weekly report...');
      
      // Mock data - replace with actual data from your API
      const mockReport: WeeklyReportData = {
        weekStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        weekEnd: new Date().toISOString().split('T')[0],
        totalMovements: 15,
        stockInCount: 8,
        distributionCount: 7,
        totalProductsMoved: 245,
        lowStockAlerts: 3,
        outOfStockAlerts: 1,
        topProducts: [
          { productName: 'Whole Wheat Bread', movementCount: 5, totalQuantity: 120 },
          { productName: 'Milk', movementCount: 4, totalQuantity: 80 },
          { productName: 'Eggs', movementCount: 3, totalQuantity: 45 },
        ],
        departmentsActivity: [
          { departmentName: 'Kitchen', distributionCount: 4, totalProducts: 120 },
          { departmentName: 'Cafeteria', distributionCount: 3, totalProducts: 85 },
        ],
        summary: 'This week showed consistent inventory movement with 15 total transactions. Stock ins slightly outpaced distributions. Monitor low stock items for potential restocking.'
      };

      // Add to reports history
      setWeeklyReports(prev => [mockReport, ...prev.slice(0, 9)]); // Keep last 10 reports
      
      console.log('✅ Weekly report generated');
      return mockReport;
    } catch (error) {
      console.error('Error generating weekly report:', error);
      return null;
    }
  };

  // Get all weekly reports
  const getWeeklyReports = (): WeeklyReportData[] => {
    return weeklyReports;
  };

  // Schedule weekly report notification
  const scheduleWeeklyReport = async (): Promise<void> => {
    if (!settings.weeklyReportEnabled || !isInitialized) return;

    try {
      await notificationService.scheduleWeeklyReportNotification();
      console.log('✅ Weekly report notification scheduled');
    } catch (error) {
      console.error('Error scheduling weekly report:', error);
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
        Alert.alert(
          'Low Stock Alert',
          `${data.productName} is running low! Current stock: ${data.currentStock}`,
          [
            { text: 'Dismiss', style: 'cancel' },
            { 
              text: 'View Product', 
              onPress: () => {
                // Navigate to product details
                if (data.productId) {
                  router.push({
                    pathname: "/details/product",
                    params: { id: data.productId }
                  });
                } else {
                  // Fallback to products screen if no product ID
                  router.push('/(tabs)/ProductsScreen');
                }
              } 
            }
          ]
        );
        break;
        
      case 'out_of_stock':
        Alert.alert(
          'Out of Stock Alert',
          `${data.productName} is out of stock and needs restocking.`,
          [
            { text: 'Dismiss', style: 'cancel' },
            { 
              text: 'Restock', 
              onPress: () => {
                // Navigate to stock movement screen for restocking
                router.push('/details/stock-movement');
              } 
            },
            { 
              text: 'View Product', 
              onPress: () => {
                if (data.productId) {
                  router.push({
                    pathname: "/details/product",
                    params: { id: data.productId }
                  });
                } else {
                  router.push('/(tabs)/ProductsScreen');
                }
              } 
            }
          ]
        );
        break;
        
      case 'usage_spike':
        Alert.alert(
          'Usage Spike Detected',
          `${data.productName} usage increased by ${data.increasePercentage}%`,
          [
            { text: 'Dismiss', style: 'cancel' },
            { 
              text: 'View Product', 
              onPress: () => {
                if (data.productId) {
                  router.push({
                    pathname: "/details/product",
                    params: { 
                      id: data.productId,
                      showAnalytics: 'true'
                    }
                  });
                } else {
                  router.push('/(tabs)/ProductsScreen');
                }
              } 
            }
          ]
        );
        break;
        
      // COMPLETED MOVEMENT NOTIFICATION HANDLING WITH EXISTING ROUTES
      case 'movement':
        if (data.movementType === 'stock_in') {
          let message = '';
          if (data.productNames && data.productNames.length > 0) {
            const displayedProducts = data.productNames.slice(0, 3);
            const remainingCount = data.productNames.length - displayedProducts.length;
            message = `Products: ${displayedProducts.join(', ')}`;
            if (remainingCount > 0) {
              message += ` and ${remainingCount} more`;
            }
            message += `\nFrom: ${data.supplier}`;
          } else {
            message = `${data.productCount} products added from ${data.supplier}`;
          }
          
          if (data.totalValue) {
            message += `\nTotal Value: $${data.totalValue.toFixed(2)}`;
          }
          
          Alert.alert(
            'Stock In Completed', 
            message,
            [
              { text: 'Dismiss', style: 'cancel' },
              { 
                text: 'View History', 
                onPress: () => {
                  // Navigate to history screen with stock in filter
                  router.push({
                    pathname: '/(tabs)/history',
                    params: { filterType: 'stock_in' }
                  });
                } 
              },
              {
                text: 'View Movement',
                onPress: () => {
                  if (data.movementId) {
                    router.push({
                      pathname: "/details/movementDetail",
                      params: { movementId: data.movementId }
                    });
                  } else {
                    router.push('/(tabs)/history');
                  }
                }
              }
            ]
          );
        } else {
          let message = '';
          if (data.productNames && data.productNames.length > 0) {
            const displayedProducts = data.productNames.slice(0, 3);
            const remainingCount = data.productNames.length - displayedProducts.length;
            message = `Products: ${displayedProducts.join(', ')}`;
            if (remainingCount > 0) {
              message += ` and ${remainingCount} more`;
            }
            message += `\nTo: ${data.department}`;
          } else {
            message = `${data.productCount} products distributed to ${data.department}`;
          }
          message += `\nBy: ${data.stockManager}`;
          
          Alert.alert(
            'Distribution Completed', 
            message,
            [
              { text: 'Dismiss', style: 'cancel' },
              { 
                text: 'View Details', 
                onPress: () => {
                  if (data.movementId) {
                    router.push({
                      pathname: "/details/movementDetail",
                      params: { movementId: data.movementId }
                    });
                  } else {
                    router.push('/(tabs)/history');
                  }
                } 
              },
              {
                text: 'View Products',
                onPress: () => {
                  // Navigate to products screen
                  router.push('/(tabs)/ProductsScreen');
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
            { text: 'Dismiss', style: 'cancel' },
            { 
              text: 'View History', 
              onPress: () => {
                router.push('/(tabs)/history');
              } 
            },
            {
              text: 'View Products',
              onPress: () => {
                router.push('/(tabs)/ProductsScreen');
              }
            }
          ]
        );
        break;
        
      case 'daily_summary':
        Alert.alert(
          'Daily Inventory Summary',
          `Low stock: ${data.lowStockCount} | Out of stock: ${data.outOfStockCount} | Total usage: ${data.totalUsage}`,
          [
            { text: 'Dismiss', style: 'cancel' },
            { 
              text: 'View Low Stock', 
              onPress: () => {
                router.push({
                  pathname: '/(tabs)/ProductsScreen',
                  params: { stockFilter: 'Low Stock' }
                });
              } 
            },
            {
              text: 'View All Products',
              onPress: () => {
                router.push('/(tabs)/ProductsScreen');
              }
            }
          ]
        );
        break;
        
      case 'weekly_report':
        Alert.alert(
          'Weekly Inventory Report',
          'Your weekly inventory report is ready with detailed analytics and insights.',
          [
            { text: 'Dismiss', style: 'cancel' },
            { 
              text: 'View Report', 
              onPress: () => {
                // Navigate to weekly reports screen
                router.push('/details/weekly-report');
              } 
            },
            {
              text: 'Generate New',
              onPress: async () => {
                await generateWeeklyReport();
                router.push('/details/weekly-report');
              }
            }
          ]
        );
        break;
        
      // Handle custom notifications from scheduleLocalNotification
      case 'custom':
      default:
        // Fallback for unknown notification types or custom notifications
        const title = data.title || 'Notification';
        const body = data.body || 'You have a new notification';
        
        Alert.alert(
          title,
          body,
          [
            { text: 'Dismiss', style: 'cancel' },
            { 
              text: 'View App', 
              onPress: () => {
                // Use custom route if provided, otherwise default to ProductsScreen
                if (data.route) {
                  router.push(data.route);
                } else {
                  router.push('/(tabs)/ProductsScreen');
                }
              } 
            }
          ]
        );
        break;
    }
  };

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    await loadScheduledNotifications();
    
    // Reschedule weekly report if setting changed
    if (newSettings.weeklyReportEnabled !== undefined) {
      if (newSettings.weeklyReportEnabled) {
        await scheduleWeeklyReport();
      }
    }
  };

  // NEW METHOD: General purpose local notification scheduler
  const scheduleLocalNotification = async (notification: {
    title: string;
    body: string;
    data?: any;
    delay?: number;
  }) => {
    if (!isInitialized) return;
    
    try {
      await notificationService.scheduleLocalNotification({
        title: notification.title,
        body: notification.body,
        data: {
          ...notification.data,
          type: notification.data?.type || 'custom',
          timestamp: new Date().toISOString(),
        },
        delay: notification.delay || 0, // Immediate by default
      });
      
      await loadScheduledNotifications();
      console.log('✅ Local notification scheduled:', notification.title);
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      throw error;
    }
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
    productNames?: string[]
  ) => {
    if (!settings.movementAlertsEnabled || !settings.stockInAlertsEnabled || !isInitialized) return;
    
    await notificationService.scheduleStockInAlert(
      productCount,
      supplier,
      totalValue,
      stockManager,
      productNames
    );
    await loadScheduledNotifications();
  };

  const scheduleDistributionAlert = async (
    productCount: number, 
    department: string, 
    stockManager: string = 'System',
    productNames?: string[]
  ) => {
    if (!settings.movementAlertsEnabled || !settings.distributionAlertsEnabled || !isInitialized) return;
    
    await notificationService.scheduleDistributionAlert(
      productCount,
      department,
      stockManager,
      productNames
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
        // NEW GENERAL NOTIFICATION METHOD
        scheduleLocalNotification,
        // WEEKLY REPORTS METHODS
        generateWeeklyReport,
        getWeeklyReports,
        scheduleWeeklyReport,
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

// REMOVED THE DUPLICATE EXPORT - WeeklyReportData is already exported at the top