// services/notificationService.ts
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';
import { notificationAPI } from './notificationAPI'; // Add this import

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

// MOVEMENT NOTIFICATION INTERFACE
export interface MovementNotificationData {
  type: 'stock_in' | 'distribution';
  productCount: number;
  productNames?: string[];
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

  // NEW METHOD: Create backend notification (this sends to all devices)
  private async createBackendNotification(notificationData: {
    type: string;
    title: string;
    body: string;
    data?: any;
  }): Promise<void> {
    try {
      console.log('📤 Sending notification to backend...', {
        type: notificationData.type,
        title: notificationData.title,
        body: notificationData.body,
        data: notificationData.data
      });
      
      const result = await notificationAPI.createNotification({
        type: notificationData.type,
        title: notificationData.title,
        body: notificationData.body,
        data: notificationData.data || {},
      });
      
      if (result.success) {
        console.log('✅ Notification created in backend database');
      } else {
        console.error('❌ Failed to create notification in backend:', result);
      }
    } catch (error) {
      console.error('❌ Error creating backend notification:', error);
    }
  }

  // NEW METHOD: General purpose local notification scheduler
  async scheduleLocalNotification(notification: {
    title: string;
    body: string;
    data?: any;
    delay?: number;
  }): Promise<string> {
    try {
      const trigger = notification.delay && notification.delay > 0 
        ? { 
            seconds: notification.delay / 1000, // Convert ms to seconds
            type: 'time' as const
          }
        : null;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: {
            ...notification.data,
            type: notification.data?.type || 'custom',
            timestamp: new Date().toISOString(),
          },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: trigger as any,
      });

      console.log('✅ Local notification scheduled:', notificationId, notification.title);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      throw error;
    }
  }

  // Schedule a local notification (existing method - kept for backward compatibility)
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

  // Schedule low stock notification - UPDATED WITH BACKEND
  async scheduleLowStockNotification(productName: string, currentStock: number, threshold: number): Promise<string> {
    const notificationData = {
      type: 'low_stock',
      title: '📦 Low Stock Alert',
      body: `${productName} is running low! Current stock: ${currentStock} (Threshold: ${threshold})`,
      data: { productName, currentStock, threshold },
    };

    // Create backend notification (sends to all devices)
    await this.createBackendNotification(notificationData);

    // Also create local notification
    return this.scheduleNotification({
      id: `low_stock_${Date.now()}`,
      content: notificationData,
      trigger: null as any, // Show immediately
    });
  }

  // Schedule out of stock notification - UPDATED WITH BACKEND
  async scheduleOutOfStockNotification(productName: string): Promise<string> {
    const notificationData = {
      type: 'out_of_stock',
      title: '🚨 Out of Stock',
      body: `${productName} is out of stock! Please restock immediately.`,
      data: { productName },
    };

    // Create backend notification (sends to all devices)
    await this.createBackendNotification(notificationData);

    // Also create local notification
    return this.scheduleNotification({
      id: `out_of_stock_${Date.now()}`,
      content: notificationData,
      trigger: null as any, // Show immediately
    });
  }

  // Schedule usage spike notification - UPDATED WITH BACKEND
  async scheduleUsageSpikeNotification(productName: string, usageCount: number, averageUsage: number): Promise<string> {
    const increasePercentage = Math.round(((usageCount - averageUsage) / averageUsage) * 100);
    
    const notificationData = {
      type: 'usage_spike',
      title: '📈 Usage Spike Detected',
      body: `${productName} usage increased by ${increasePercentage}% (${usageCount} vs avg ${averageUsage})`,
      data: { productName, usageCount, averageUsage, increasePercentage },
    };

    // Create backend notification (sends to all devices)
    await this.createBackendNotification(notificationData);

    // Also create local notification
    return this.scheduleNotification({
      id: `usage_spike_${Date.now()}`,
      content: notificationData,
      trigger: null as any,
    });
  }

  // Schedule daily summary notification - UPDATED WITH BACKEND
  async scheduleDailySummaryNotification(summaryData: any): Promise<string> {
    const { lowStockCount, outOfStockCount, totalUsage } = summaryData;
    
    const notificationData = {
      type: 'daily_summary',
      title: '📊 Daily Inventory Summary',
      body: `Low stock: ${lowStockCount} | Out of stock: ${outOfStockCount} | Total usage: ${totalUsage}`,
      data: { ...summaryData },
    };

    // Create backend notification (sends to all devices)
    await this.createBackendNotification(notificationData);

    // Also create local notification
    return this.scheduleNotification({
      id: `daily_summary_${Date.now()}`,
      content: notificationData,
      trigger: {
        type: 'daily',
        hour: 17, // 5 PM
        minute: 0,
        repeats: true,
      } as Notifications.DailyTriggerInput,
    });
  }

  // Schedule weekly report notification - UPDATED WITH BACKEND
  async scheduleWeeklyReportNotification(): Promise<string> {
    const notificationData = {
      type: 'weekly_report',
      title: '📈 Weekly Inventory Report',
      body: 'Your weekly inventory report is ready. Tap to view detailed analytics.',
      data: {},
    };

    // Create backend notification (sends to all devices)
    await this.createBackendNotification(notificationData);

    // Also create local notification
    return this.scheduleNotification({
      id: `weekly_report_${Date.now()}`,
      content: notificationData,
      trigger: {
        type: 'weekly',
        hour: 9,
        minute: 0,
        repeats: true,
        weekday: 1, // Monday
      } as Notifications.WeeklyTriggerInput,
    });
  }

  // NEW MOVEMENT NOTIFICATION METHODS - UPDATED WITH BACKEND

  // Schedule movement notification - UPDATED WITH BACKEND
  async scheduleMovementNotification(movementData: MovementNotificationData): Promise<string> {
    const { type, productCount, productNames, department, supplier, totalValue, stockManager } = movementData;

    let title = '';
    let body = '';

    if (type === 'stock_in') {
      title = '📥 Stock In Completed';
      
      if (productNames && productNames.length > 0) {
        // Show product names if available
        const displayedProducts = productNames.slice(0, 3); // Show max 3 products
        const remainingCount = productNames.length - displayedProducts.length;
        
        body = `Added: ${displayedProducts.join(', ')}`;
        if (remainingCount > 0) {
          body += ` and ${remainingCount} more`;
        }
        
        if (supplier) {
          body += ` from ${supplier}`;
        }
      } else {
        // Fallback to count if no names
        body = `${productCount} product${productCount !== 1 ? 's' : ''} added`;
        if (supplier) {
          body += ` from ${supplier}`;
        }
      }
      
      if (totalValue) {
        body += ` • Total: $${totalValue.toFixed(2)}`;
      }
    } else {
      title = '📤 Distribution Completed';
      
      if (productNames && productNames.length > 0) {
        // Show product names if available
        const displayedProducts = productNames.slice(0, 3); // Show max 3 products
        const remainingCount = productNames.length - displayedProducts.length;
        
        body = `Distributed: ${displayedProducts.join(', ')}`;
        if (remainingCount > 0) {
          body += ` and ${remainingCount} more`;
        }
      } else {
        // Fallback to count if no names
        body = `${productCount} product${productCount !== 1 ? 's' : ''} distributed`;
      }
      
      if (department) {
        body += ` to ${department}`;
      }
      body += ` • By: ${stockManager}`;
    }

    const backendData = {
      type: 'movement',
      title,
      body,
      data: {
        movementType: type,
        productCount,
        productNames,
        department,
        supplier,
        totalValue,
        stockManager,
        movementId: movementData.movementId,
        timestamp: movementData.timestamp || new Date().toISOString(),
      },
    };

    console.log('📤 Creating movement notification in backend:', backendData);

    // Create backend notification (this will send push to all devices)
    await this.createBackendNotification(backendData);

    // Also create local notification
    return this.scheduleNotification({
      id: `movement_${type}_${Date.now()}`,
      content: {
        title,
        body,
        data: backendData.data,
      },
      trigger: null as any, // Show immediately
    });
  }

  // Schedule stock in alert (convenience method) - UPDATED
  async scheduleStockInAlert(
    productCount: number, 
    supplier: string, 
    totalValue?: number, 
    stockManager: string = 'System',
    productNames?: string[]
  ): Promise<string> {
    console.log('🎯 scheduleStockInAlert called with backend integration', {
      productCount,
      supplier,
      totalValue,
      stockManager,
      productNames
    });

    return this.scheduleMovementNotification({
      type: 'stock_in',
      productCount,
      productNames,
      supplier,
      totalValue,
      stockManager,
    });
  }

  // Schedule distribution alert (convenience method) - UPDATED
  async scheduleDistributionAlert(
    productCount: number, 
    department: string, 
    stockManager: string = 'System',
    productNames?: string[]
  ): Promise<string> {
    console.log('🎯 scheduleDistributionAlert called with backend integration', {
      productCount,
      department,
      stockManager,
      productNames
    });

    return this.scheduleMovementNotification({
      type: 'distribution',
      productCount,
      productNames,
      department,
      stockManager,
    });
  }

  // Schedule bulk movement summary (for multiple movements) - UPDATED WITH BACKEND
  async scheduleBulkMovementSummary(
    movements: MovementNotificationData[]
  ): Promise<string> {
    const stockInCount = movements.filter(m => m.type === 'stock_in').length;
    const distributionCount = movements.filter(m => m.type === 'distribution').length;
    const totalProducts = movements.reduce((sum, m) => sum + m.productCount, 0);

    const notificationData = {
      type: 'bulk_movement_summary',
      title: '📊 Movement Summary',
      body: `${stockInCount} stock ins, ${distributionCount} distributions • ${totalProducts} total products moved`,
      data: {
        stockInCount,
        distributionCount,
        totalProducts,
        movements: movements.slice(0, 10), // Limit to first 10 movements
      },
    };

    // Create backend notification (sends to all devices)
    await this.createBackendNotification(notificationData);

    // Also create local notification
    return this.scheduleNotification({
      id: `bulk_movement_${Date.now()}`,
      content: notificationData,
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