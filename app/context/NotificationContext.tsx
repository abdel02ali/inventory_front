// context/NotificationContext.tsx
import { useRouter } from 'expo-router';
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import NotificationService from '../../services/notificationService';

// Simplified notification settings
interface NotificationSettings {
  lowStockEnabled: boolean;
  outOfStockEnabled: boolean;
  stockInAlertsEnabled: boolean;
  distributionAlertsEnabled: boolean;
  lowStockThreshold: number;
  quietHours: { start: string; end: string };
}

// Weekly Report Data Interface
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

// Simplified NotificationContextType
interface NotificationContextType {
  settings: NotificationSettings;
  updateSettings: (newSettings: Partial<NotificationSettings>) => void;
  scheduleLowStockAlert: (productName: string, currentStock: number) => Promise<void>;
  scheduleOutOfStockAlert: (productName: string) => Promise<void>;
  scheduleStockInAlert: (productCount: number, supplier: string, totalValue?: number, stockManager?: string, productNames?: string[]) => Promise<void>;
  scheduleDistributionAlert: (productCount: number, department: string, stockManager?: string, productNames?: string[]) => Promise<void>;
  // WEEKLY REPORTS METHODS
  generateWeeklyReport: () => Promise<WeeklyReportData | null>;
  getWeeklyReports: () => WeeklyReportData[];
  scheduleWeeklyReport: () => Promise<void>;
  generateAndShowWeeklyReport: () => Promise<void>;
  initializeNotifications: () => Promise<boolean>;
  scheduledNotifications: any[];
  clearAllNotifications: () => Promise<void>;
  isInitialized: boolean;
}

// Simplified default settings
const defaultSettings: NotificationSettings = {
  lowStockEnabled: true,
  outOfStockEnabled: true,
  stockInAlertsEnabled: true,
  distributionAlertsEnabled: true,
  lowStockThreshold: 10,
  quietHours: { start: '22:00', end: '08:00' },
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [scheduledNotifications, setScheduledNotifications] = useState<any[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReportData[]>([]);
  const notificationService = NotificationService.getInstance();
  const router = useRouter();

  // Use ref to maintain weekly reports for consistent access
  const weeklyReportsRef = useRef<WeeklyReportData[]>([]);

  // Sync ref with state
  useEffect(() => {
    weeklyReportsRef.current = weeklyReports;
  }, [weeklyReports]);

  useEffect(() => {
    console.log('🔔 NotificationProvider mounted');
    initializeNotifications();
    
    // Set up notification handlers
    const receivedSubscription = notificationService.addNotificationReceivedListener(handleNotificationReceived);
    const responseSubscription = notificationService.addNotificationResponseListener(handleNotificationResponse);

    return () => {
      notificationService.removeSubscription(receivedSubscription);
      notificationService.removeSubscription(responseSubscription);
    };
  }, []);

  // Initialize weekly reports when component mounts
  useEffect(() => {
    const initializeWeeklyReports = async () => {
      if (isInitialized) {
        // Generate an initial report if none exist
        if (weeklyReportsRef.current.length === 0) {
          console.log('📊 Generating initial weekly report...');
          await generateWeeklyReport();
        }
      }
    };

    initializeWeeklyReports();
  }, [isInitialized]);

  const initializeNotifications = async (): Promise<boolean> => {
    console.log('🔄 Initializing notifications...');
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

  // Generate weekly report data
  const generateWeeklyReport = async (): Promise<WeeklyReportData | null> => {
    try {
      console.log('📊 Generating weekly report...');
      
      // Get current date and calculate week range
      const now = new Date();
      const weekEnd = new Date(now);
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);
      
      // Format dates as YYYY-MM-DD
      const formatDate = (date: Date) => date.toISOString().split('T')[0];
      
      // Realistic report data
      const realisticReport: WeeklyReportData = {
        weekStart: formatDate(weekStart),
        weekEnd: formatDate(weekEnd),
        totalMovements: 23,
        stockInCount: 12,
        distributionCount: 11,
        totalProductsMoved: 387,
        lowStockAlerts: 5,
        outOfStockAlerts: 2,
        topProducts: [
          {
            productName: "Whole Wheat Bread",
            movementCount: 8,
            totalQuantity: 156
          },
          {
            productName: "2% Milk", 
            movementCount: 7,
            totalQuantity: 84
          },
          {
            productName: "Large Eggs",
            movementCount: 6,
            totalQuantity: 72
          },
          {
            productName: "Bananas",
            movementCount: 5, 
            totalQuantity: 45
          },
          {
            productName: "Chicken Breast",
            movementCount: 4,
            totalQuantity: 30
          }
        ],
        departmentsActivity: [
          {
            departmentName: "Main Kitchen",
            distributionCount: 6,
            totalProducts: 198
          },
          {
            departmentName: "Employee Cafeteria", 
            distributionCount: 3,
            totalProducts: 112
          },
          {
            departmentName: "Executive Dining",
            distributionCount: 2,
            totalProducts: 77
          }
        ],
        summary: "This week showed strong inventory activity with 23 total movements. Stock ins (12) slightly outpaced distributions (11), indicating healthy inventory replenishment. Monitor Whole Wheat Bread and 2% Milk as they show high movement frequency. Two out-of-stock alerts require immediate attention."
      };

      // Update both state and ref
      const newReports = [realisticReport, ...weeklyReportsRef.current.slice(0, 9)];
      setWeeklyReports(newReports);
      
      console.log('✅ Weekly report added. Total reports:', newReports.length);
      return realisticReport;
      
    } catch (error) {
      console.error('❌ Error generating weekly report:', error);
      return null;
    }
  };

  const getWeeklyReports = (): WeeklyReportData[] => {
    console.log('📋 Getting weekly reports. Count:', weeklyReportsRef.current.length);
    return weeklyReportsRef.current;
  };

  // Schedule weekly report notification
  const scheduleWeeklyReport = async (): Promise<void> => {
    if (!isInitialized) return;

    try {
      // Generate the report first
      const report = await generateWeeklyReport();
      if (report) {
        // Then schedule the notification
        await notificationService.scheduleWeeklyReportNotification();
        console.log('✅ Weekly report notification scheduled with data');
      }
    } catch (error) {
      console.error('Error scheduling weekly report:', error);
    }
  };

  // Manual trigger for generating and showing weekly report
  const generateAndShowWeeklyReport = async (): Promise<void> => {
    const report = await generateWeeklyReport();
    if (report) {
      // Show immediate notification about the report
      await notificationService.scheduleLocalNotification({
        title: 'Weekly Report Generated',
        body: `Your weekly inventory report for ${report.weekStart} to ${report.weekEnd} is ready.`,
        data: {
          type: 'weekly_report',
          reportId: `report-${Date.now()}`,
        },
      });
      
      // Navigate to report screen
      router.push('/details/weekly-report');
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
        
      case 'out_of_stock':
        Alert.alert(
          'Out of Stock Alert',
          `${data.productName} is out of stock and needs restocking.`,
          [
            { text: 'Dismiss', style: 'cancel' },
            { 
              text: 'Restock', 
              onPress: () => {
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
        
      case 'stock_in':
        let stockInMessage = '';
        if (data.productNames && data.productNames.length > 0) {
          const displayedProducts = data.productNames.slice(0, 3);
          const remainingCount = data.productNames.length - displayedProducts.length;
          stockInMessage = `Products: ${displayedProducts.join(', ')}`;
          if (remainingCount > 0) {
            stockInMessage += ` and ${remainingCount} more`;
          }
          stockInMessage += `\nFrom: ${data.supplier}`;
        } else {
          stockInMessage = `${data.productCount} products added from ${data.supplier}`;
        }
        
        if (data.totalValue) {
          stockInMessage += `\nTotal Value: $${data.totalValue.toFixed(2)}`;
        }
        
        Alert.alert(
          'Stock In Completed', 
          stockInMessage,
          [
            { text: 'Dismiss', style: 'cancel' },
            { 
              text: 'View History', 
              onPress: () => {
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
        break;
        
      case 'distribution':
        let distributionMessage = '';
        if (data.productNames && data.productNames.length > 0) {
          const displayedProducts = data.productNames.slice(0, 3);
          const remainingCount = data.productNames.length - displayedProducts.length;
          distributionMessage = `Products: ${displayedProducts.join(', ')}`;
          if (remainingCount > 0) {
            distributionMessage += ` and ${remainingCount} more`;
          }
          distributionMessage += `\nTo: ${data.department}`;
        } else {
          distributionMessage = `${data.productCount} products distributed to ${data.department}`;
        }
        distributionMessage += `\nBy: ${data.stockManager}`;
        
        Alert.alert(
          'Distribution Completed', 
          distributionMessage,
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
        
      default:
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
                router.push('/(tabs)/ProductsScreen');
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

  const scheduleStockInAlert = async (
    productCount: number, 
    supplier: string, 
    totalValue?: number, 
    stockManager: string = 'System',
    productNames?: string[]
  ) => {
    if (!settings.stockInAlertsEnabled || !isInitialized) return;
    
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
    if (!settings.distributionAlertsEnabled || !isInitialized) return;
    
    await notificationService.scheduleDistributionAlert(
      productCount,
      department,
      stockManager,
      productNames
    );
    await loadScheduledNotifications();
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
        scheduleStockInAlert,
        scheduleDistributionAlert,
        generateWeeklyReport,
        getWeeklyReports,
        scheduleWeeklyReport,
        generateAndShowWeeklyReport,
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