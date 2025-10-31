import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface NotificationData {
  type: string;
  title: string;
  body: string;
  data?: any;
  userId?: string;
  deviceId?: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: any; // Required in Notification interface
  read: boolean;
  userId: string;
  deviceId?: string;
  createdAt: string;
  readAt?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface UnreadCountResponse {
  success: boolean;
  data: {
    count: number;
  };
}

export interface BaseResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export interface DeviceRegistrationResponse {
  success: boolean;
  message: string;
  deviceCount?: number;
}

export interface DevicesResponse {
  success: boolean;
  data: {
    deviceCount: number;
    devices: string[];
  };
}

// Create a more flexible response type for createNotification
export interface CreateNotificationResponse {
  success: boolean;
  data?: Notification;
  message?: string;
}

// API functions
export const notificationAPI = {
  // Create a notification
  async createNotification(notificationData: NotificationData): Promise<CreateNotificationResponse> {
    try {
      console.log('📤 Sending notification to backend:', notificationData);
      
      const response = await api.post('/api/notifications', {
        ...notificationData,
        deviceId: 'mobile-app' // You can make this dynamic if needed
      });
      
      console.log('✅ Notification created on backend:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error creating notification on backend:', error);
      
      // Fallback: Return mock success for now
      // Ensure data property exists and matches Notification interface
      const fallbackData: Notification = {
        id: `local_${Date.now()}`,
        type: notificationData.type,
        title: notificationData.title,
        body: notificationData.body,
        data: notificationData.data || {}, // Ensure data is always an object
        read: false,
        userId: notificationData.userId || 'system',
        deviceId: notificationData.deviceId || 'mobile-app',
        createdAt: new Date().toISOString()
      };
      
      return {
        success: true,
        data: fallbackData
      };
    }
  },

  // Get all notifications
  async getNotifications(page: number = 1, limit: number = 50): Promise<PaginatedResponse<Notification>> {
    try {
      const response = await api.get(`/api/notifications?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error fetching notifications:', error);
      
      // Fallback: Return empty array
      return {
        success: true,
        data: [],
        pagination: { page, limit, total: 0, pages: 0 }
      };
    }
  },

  // Get unread count
  async getUnreadCount(): Promise<UnreadCountResponse> {
    try {
      const response = await api.get('/api/notifications/unread-count');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error fetching unread count:', error);
      
      // Fallback: Return 0
      return {
        success: true,
        data: { count: 0 }
      };
    }
  },

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<BaseResponse> {
    try {
      const response = await api.patch(`/api/notifications/${notificationId}/read`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error marking notification as read:', error);
      
      // Fallback: Return success
      return { success: true };
    }
  },

  // Mark all as read
  async markAllAsRead(): Promise<BaseResponse & { data?: { modifiedCount: number } }> {
    try {
      const response = await api.patch('/api/notifications/mark-all-read');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error marking all as read:', error);
      return { success: true };
    }
  },

  // Register device for push notifications
  async registerDevice(token: string): Promise<DeviceRegistrationResponse> {
    try {
      console.log('📱 Registering device for push notifications:', token.substring(0, 20) + '...');
      
      const response = await api.post('/api/notifications/register-device', {
        token: token
      });
      
      console.log('✅ Device registered successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error registering device for push:', error);
      
      // Fallback: Return success to avoid breaking the app
      return { 
        success: true, 
        message: 'Device registration failed, using fallback' 
      };
    }
  },

  // Send test push notification
  async sendTestPush(title: string = 'Test Notification', body: string = 'This is a test push notification!'): Promise<BaseResponse> {
    try {
      console.log('🧪 Sending test push notification...');
      
      const response = await api.post('/api/notifications/test-push', {
        title,
        body
      });
      
      console.log('✅ Test push sent:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error sending test push:', error);
      
      return {
        success: false,
        message: 'Failed to send test push'
      };
    }
  },

  // Get registered devices (for debugging)
  async getRegisteredDevices(): Promise<DevicesResponse> {
    try {
      const response = await api.get('/api/notifications/devices');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error fetching registered devices:', error);
      
      return {
        success: true,
        data: { deviceCount: 0, devices: [] }
      };
    }
  }
};

// Optional: Add request/response interceptors for better debugging
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, config.data || '');
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.status} ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    console.error('❌ Response error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);

export default notificationAPI;