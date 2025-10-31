// services/notificationService.ts
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';

// Configure notification behavior with proper types
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
    // Add the missing properties for iOS
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationContent {
  title: string;
  body: string;
  data?: any;
}

export interface ScheduledNotification {
  id: string;
  content: NotificationContent;
  trigger: Notifications.NotificationTriggerInput;
}

// ADD MOVEMENT NOTIFICATION INTERFACE
export interface MovementNotificationData {
  type: 'stock_in' | 'distribution';
  productCount: number;
  productNames?: string[]; // ADD THIS LINE
  department?: string;
  supplier?: string;
  movementId?: string;
  totalValue?: number;
  stockManager: string;
  timestamp?: Date;
}
class NotificationService {
  private static instance: NotificationService;
  private isConfigured = false;
  private subscriptions: Notifications.Subscription[] = [];

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Request permissions and configure notifications
  async initialize(): Promise<boolean> {
    try {
      if (this.isConfigured) return true;

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert('Permission Required', 'Please enable notifications to receive important alerts about your inventory.');
        return false;
      }

      // Get push token (for remote notifications)
      if (Device.isDevice) {
        try {
          const token = (await Notifications.getExpoPushTokenAsync()).data;
          console.log('Push token:', token);
        } catch (error) {
          console.log('Error getting push token:', error);
        }
      } else {
        console.log('Must use physical device for push notifications');
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      this.isConfigured = true;
      return true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  // Schedule a local notification
  async scheduleNotification(notification: ScheduledNotification): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.content.title,
          body: notification.content.body,
          data: notification.content.data || {},
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: notification.trigger,
      });

      console.log('Notification scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  // Schedule low stock notification
  async scheduleLowStockNotification(productName: string, currentStock: number, threshold: number): Promise<string> {
    return this.scheduleNotification({
      id: `low_stock_${Date.now()}`,
      content: {
        title: '📦 Low Stock Alert',
        body: `${productName} is running low! Current stock: ${currentStock} (Threshold: ${threshold})`,
        data: { type: 'low_stock', productName, currentStock, threshold },
      },
      trigger: null as any, // Show immediately
    });
  }

  // Schedule out of stock notification
  async scheduleOutOfStockNotification(productName: string): Promise<string> {
    return this.scheduleNotification({
      id: `out_of_stock_${Date.now()}`,
      content: {
        title: '🚨 Out of Stock',
        body: `${productName} is out of stock! Please restock immediately.`,
        data: { type: 'out_of_stock', productName },
      },
      trigger: null as any, // Show immediately
    });
  }

  // Schedule usage spike notification
  async scheduleUsageSpikeNotification(productName: string, usageCount: number, averageUsage: number): Promise<string> {
    const increasePercentage = Math.round(((usageCount - averageUsage) / averageUsage) * 100);
    
    return this.scheduleNotification({
      id: `usage_spike_${Date.now()}`,
      content: {
        title: '📈 Usage Spike Detected',
        body: `${productName} usage increased by ${increasePercentage}% (${usageCount} vs avg ${averageUsage})`,
        data: { type: 'usage_spike', productName, usageCount, averageUsage, increasePercentage },
      },
      trigger: null as any,
    });
  }

  // Schedule daily summary notification
  async scheduleDailySummaryNotification(summaryData: any): Promise<string> {
    const { lowStockCount, outOfStockCount, totalUsage } = summaryData;
    
    return this.scheduleNotification({
      id: `daily_summary_${Date.now()}`,
      content: {
        title: '📊 Daily Inventory Summary',
        body: `Low stock: ${lowStockCount} | Out of stock: ${outOfStockCount} | Total usage: ${totalUsage}`,
        data: { type: 'daily_summary', ...summaryData },
      },
      trigger: {
        type: 'daily',
        hour: 17, // 5 PM
        minute: 0,
        repeats: true,
      } as Notifications.DailyTriggerInput,
    });
  }

  // Schedule weekly report notification
  async scheduleWeeklyReportNotification(): Promise<string> {
    return this.scheduleNotification({
      id: `weekly_report_${Date.now()}`,
      content: {
        title: '📈 Weekly Inventory Report',
        body: 'Your weekly inventory report is ready. Tap to view detailed analytics.',
        data: { type: 'weekly_report' },
      },
      trigger: {
        type: 'weekly',
        hour: 9,
        minute: 0,
        repeats: true,
        weekday: 1, // Monday
      } as Notifications.WeeklyTriggerInput,
    });
  }

  // NEW MOVEMENT NOTIFICATION METHODS

  // Schedule movement notification
  async scheduleMovementNotification(movementData: MovementNotificationData): Promise<string> {
    const { type, productCount, department, supplier, totalValue, stockManager } = movementData;

    let title = '';
    let body = '';

    if (type === 'stock_in') {
      title = '📥 Stock In Completed';
      body = `${productCount} product${productCount !== 1 ? 's' : ''} added from ${supplier}`;
      if (totalValue) {
        body += ` • Total: $${totalValue.toFixed(2)}`;
      }
    } else {
      title = '📤 Distribution Completed';
      body = `${productCount} product${productCount !== 1 ? 's' : ''} distributed to ${department}`;
      body += ` • By: ${stockManager}`;
    }

    return this.scheduleNotification({
      id: `movement_${type}_${Date.now()}`,
      content: {
        title,
        body,
        data: {
          type: 'movement',
          movementType: type,
          productCount,
          department,
          supplier,
          totalValue,
          stockManager,
          movementId: movementData.movementId,
          timestamp: movementData.timestamp || new Date().toISOString(),
        },
      },
      trigger: null as any, // Show immediately
    });
  }

  // Schedule stock in alert (convenience method)
  async scheduleStockInAlert(
    productCount: number, 
    supplier: string, 
    totalValue?: number, 
    stockManager: string = 'System'
  ): Promise<string> {
    return this.scheduleMovementNotification({
      type: 'stock_in',
      productCount,
      supplier,
      totalValue,
      stockManager,
    });
  }

  // Schedule distribution alert (convenience method)
  async scheduleDistributionAlert(
    productCount: number, 
    department: string, 
    stockManager: string = 'System'
  ): Promise<string> {
    return this.scheduleMovementNotification({
      type: 'distribution',
      productCount,
      department,
      stockManager,
    });
  }

  // Schedule bulk movement summary (for multiple movements)
  async scheduleBulkMovementSummary(
    movements: MovementNotificationData[]
  ): Promise<string> {
    const stockInCount = movements.filter(m => m.type === 'stock_in').length;
    const distributionCount = movements.filter(m => m.type === 'distribution').length;
    const totalProducts = movements.reduce((sum, m) => sum + m.productCount, 0);

    return this.scheduleNotification({
      id: `bulk_movement_${Date.now()}`,
      content: {
        title: '📊 Movement Summary',
        body: `${stockInCount} stock ins, ${distributionCount} distributions • ${totalProducts} total products moved`,
        data: {
          type: 'bulk_movement_summary',
          stockInCount,
          distributionCount,
          totalProducts,
          movements: movements.slice(0, 10), // Limit to first 10 movements
        },
      },
      trigger: null as any,
    });
  }

  // EXISTING UTILITY METHODS
  async getScheduledNotifications() {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.dismissAllNotificationsAsync();
  }

  // CORRECTED: Use the proper method names
  addNotificationReceivedListener(callback: (notification: Notifications.Notification) => void) {
    const subscription = Notifications.addNotificationReceivedListener(callback);
    this.subscriptions.push(subscription);
    return subscription;
  }

  // CORRECTED: Use addNotificationResponseReceivedListener
  addNotificationResponseListener(callback: (response: Notifications.NotificationResponse) => void) {
    const subscription = Notifications.addNotificationResponseReceivedListener(callback);
    this.subscriptions.push(subscription);
    return subscription;
  }

  // CORRECTED: Use remove() method on the subscription directly
  removeSubscription(subscription: Notifications.Subscription) {
    subscription.remove();
    this.subscriptions = this.subscriptions.filter(sub => sub !== subscription);
  }

  // Remove all listeners
  removeAllListeners() {
    this.subscriptions.forEach(subscription => {
      subscription.remove();
    });
    this.subscriptions = [];
  }
}

export default NotificationService;