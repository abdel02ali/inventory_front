// components/NotificationTest.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useNotifications } from '../app/context/NotificationContext';

export const NotificationTest: React.FC = () => {
  const { 
    scheduleLowStockAlert, 
    scheduleOutOfStockAlert, 
    scheduleUsageSpikeAlert,
    initializeNotifications,
    isInitialized,
    scheduledNotifications,
    clearAllNotifications
  } = useNotifications();

  const testNotifications = async () => {
    if (!isInitialized) {
      const success = await initializeNotifications();
      if (!success) {
        Alert.alert('Error', 'Failed to initialize notifications. Please check app permissions.');
        return;
      }
    }

    // Test different notification types
    await scheduleLowStockAlert('Whole Wheat Bread', 3);
    await scheduleOutOfStockAlert('Milk');
    await scheduleUsageSpikeAlert('Eggs', 25, 10);
    
    Alert.alert('Success', 'Test notifications scheduled! They should appear shortly.');
  };

  const testSingleNotification = async (type: string) => {
    if (!isInitialized) {
      const success = await initializeNotifications();
      if (!success) {
        Alert.alert('Error', 'Please initialize notifications first');
        return;
      }
    }

    switch (type) {
      case 'low_stock':
        await scheduleLowStockAlert('Test Product', 5);
        Alert.alert('Success', 'Low stock notification sent!');
        break;
      case 'out_of_stock':
        await scheduleOutOfStockAlert('Test Product');
        Alert.alert('Success', 'Out of stock notification sent!');
        break;
      case 'usage_spike':
        await scheduleUsageSpikeAlert('Test Product', 50, 20);
        Alert.alert('Success', 'Usage spike notification sent!');
        break;
    }
  };

  return (
    <ScrollView style={{ padding: 16, backgroundColor: '#f8f9fa' }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' }}>
        🔔 Notification Tester
      </Text>

      {/* Status Indicator */}
      <View style={{ 
        backgroundColor: isInitialized ? '#d1fae5' : '#fee2e2', 
        padding: 12, 
        borderRadius: 8, 
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center'
      }}>
        <Ionicons 
          name={isInitialized ? "checkmark-circle" : "alert-circle"} 
          size={20} 
          color={isInitialized ? "#10b981" : "#ef4444"} 
        />
        <Text style={{ marginLeft: 8, color: isInitialized ? "#065f46" : "#7f1d1d" }}>
          {isInitialized ? 'Notifications are ready!' : 'Notifications not initialized'}
        </Text>
      </View>

      {/* Initialize Button */}
      {!isInitialized && (
        <TouchableOpacity 
          onPress={initializeNotifications}
          style={{ 
            backgroundColor: '#6366f1', 
            padding: 16, 
            borderRadius: 12, 
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Ionicons name="notifications" size={20} color="white" />
          <Text style={{ color: 'white', textAlign: 'center', marginLeft: 8, fontWeight: '600' }}>
            Initialize Notifications
          </Text>
        </TouchableOpacity>
      )}

      {/* Test All Button */}
      {isInitialized && (
        <TouchableOpacity 
          onPress={testNotifications}
          style={{ 
            backgroundColor: '#8b5cf6', 
            padding: 16, 
            borderRadius: 12, 
            marginBottom: 16 
          }}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '600', fontSize: 16 }}>
            🚀 Test All Notifications
          </Text>
          <Text style={{ color: 'white', textAlign: 'center', opacity: 0.8, marginTop: 4 }}>
            Send low stock, out of stock, and usage spike alerts
          </Text>
        </TouchableOpacity>
      )}

      {/* Individual Test Buttons */}
      {isInitialized && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12 }}>Individual Tests:</Text>
          
          <TouchableOpacity 
            onPress={() => testSingleNotification('low_stock')}
            style={{ 
              backgroundColor: '#f59e0b', 
              padding: 14, 
              borderRadius: 8, 
              marginBottom: 8,
              flexDirection: 'row',
              alignItems: 'center'
            }}
          >
            <Ionicons name="warning" size={20} color="white" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ color: 'white', fontWeight: '600' }}>Low Stock Alert</Text>
              <Text style={{ color: 'white', opacity: 0.8, fontSize: 12 }}>Product running low</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => testSingleNotification('out_of_stock')}
            style={{ 
              backgroundColor: '#ef4444', 
              padding: 14, 
              borderRadius: 8, 
              marginBottom: 8,
              flexDirection: 'row',
              alignItems: 'center'
            }}
          >
            <Ionicons name="close-circle" size={20} color="white" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ color: 'white', fontWeight: '600' }}>Out of Stock Alert</Text>
              <Text style={{ color: 'white', opacity: 0.8, fontSize: 12 }}>Product is out of stock</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => testSingleNotification('usage_spike')}
            style={{ 
              backgroundColor: '#10b981', 
              padding: 14, 
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center'
            }}
          >
            <Ionicons name="trending-up" size={20} color="white" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ color: 'white', fontWeight: '600' }}>Usage Spike Alert</Text>
              <Text style={{ color: 'white', opacity: 0.8, fontSize: 12 }}>Unusual usage detected</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Scheduled Notifications List */}
      {isInitialized && scheduledNotifications.length > 0 && (
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '600' }}>
              Scheduled Notifications ({scheduledNotifications.length})
            </Text>
            <TouchableOpacity 
              onPress={clearAllNotifications}
              style={{ backgroundColor: '#6b7280', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}
            >
              <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Clear All</Text>
            </TouchableOpacity>
          </View>

          {scheduledNotifications.map((notification, index) => (
            <View 
              key={index} 
              style={{ 
                backgroundColor: 'white', 
                padding: 12, 
                borderRadius: 8, 
                marginBottom: 8,
                borderLeftWidth: 4,
                borderLeftColor: '#6366f1'
              }}
            >
              <Text style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 4 }}>
                {notification.content.title}
              </Text>
              <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                {notification.content.body}
              </Text>
              <Text style={{ fontSize: 10, color: '#9ca3af' }}>
                ID: {notification.identifier}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Instructions */}
      <View style={{ backgroundColor: '#dbeafe', padding: 12, borderRadius: 8, marginTop: 16 }}>
        <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Testing Instructions:</Text>
        <Text style={{ fontSize: 12, color: '#1e40af', lineHeight: 16 }}>
          1. Click "Initialize Notifications" first{'\n'}
          2. Allow notification permissions when prompted{'\n'}
          3. Test individual notifications or use "Test All"{'\n'}
          4. Notifications should appear immediately{'\n'}
          5. Check your device's notification center
        </Text>
      </View>
    </ScrollView>
  );
};