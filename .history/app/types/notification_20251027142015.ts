// types/notification.ts
export interface AppNotification {
  id: string;
  type: 'movement' | 'low_stock' | 'out_of_stock' | 'usage_spike' | 'system';
  title: string;
  body: string;
  data: any;
  timestamp: Date;
  read: boolean;
  userId?: string; // If you have user accounts
  deviceId?: string; // For device-specific notifications
  persistent: boolean; // Whether to show on all devices
}