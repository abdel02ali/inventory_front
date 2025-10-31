import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
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

class NotificationService {
  private static instance: NotificationService;
  private isConfigured = false;

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
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: 'your-project-id', // Add your Expo project ID
        });
        console.log('Push token:', token);
        
        // You can send this token to your backend for push notifications
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
      trigger: null, // Show immediately
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
      trigger: null, // Show immediately
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
      trigger: null,
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
        hour: 17, // 5 PM
        minute: 0,
        repeats: true,
      },
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
        hour: 9,
        minute: 0,
        repeats: true,
        weekday: 1, // Monday
      },
    });
  }

  // Cancel a specific notification
  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  // Cancel all notifications
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // Get all scheduled notifications
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  // Set up notification response handler
  setNotificationHandler(handler: (response: Notifications.NotificationResponse) => void) {
    Notifications.addNotificationResponseReceivedListener(handler);
  }

  // Set up notification received handler (when app is foreground)
  setNotificationReceivedHandler(handler: (notification: Notifications.Notification) => void) {
    Notifications.addNotificationReceivedListener(handler);
  }

  // Remove all listeners
  removeAllListeners() {
    Notifications.removeAllNotificationListeners();
  }
}

export default NotificationService;