// components/NotificationTester.tsx
import React from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useNotifications } from '../app/context/NotificationContext';

export const NotificationTester: React.FC = () => {
  const { 
    scheduleLowStockAlert, 
    scheduleOutOfStockAlert, 
    scheduleUsageSpikeAlert,
    initializeNotifications,
    isInitialized,
    scheduledNotifications,
    clearAllNotifications
  } = useNotifications();

  const testLowStock = async () => {
    await scheduleLowStockAlert('Test Product', 5);
    Alert.alert('Success', 'Low stock notification scheduled!');
  };

  const testOutOfStock = async () => {
    await scheduleOutOfStockAlert('Test Product');
    Alert.alert('Success', 'Out of stock notification scheduled!');
  };

  const testUsageSpike = async () => {
    await scheduleUsageSpikeAlert('Test Product', 50, 20);
    Alert.alert('Success', 'Usage spike notification scheduled!');
  };

  const testInitialize = async () => {
    const success = await initializeNotifications();
    Alert.alert('Initialization', success ? 'Success!' : 'Failed - check permissions');
  };

  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
        Notification Tester
      </Text>

      <Text style={{ marginBottom: 16, color: isInitialized ? 'green' : 'red' }}>
        Status: {isInitialized ? 'Initialized ✅' : 'Not Initialized ❌'}
      </Text>
      
      <TouchableOpacity 
        onPress={testInitialize}
        style={{ backgroundColor: '#6366f1', padding: 12, borderRadius: 8, marginBottom: 8 }}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>Initialize Notifications</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        onPress={testLowStock}
        style={{ backgroundColor: '#f59e0b', padding: 12, borderRadius: 8, marginBottom: 8 }}
        disabled={!isInitialized}
      >
        <Text style={{ color: 'white', textAlign: 'center', opacity: isInitialized ? 1 : 0.5 }}>
          Test Low Stock
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        onPress={testOutOfStock}
        style={{ backgroundColor: '#ef4444', padding: 12, borderRadius: 8, marginBottom: 8 }}
        disabled={!isInitialized}
      >
        <Text style={{ color: 'white', textAlign: 'center', opacity: isInitialized ? 1 : 0.5 }}>
          Test Out of Stock
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        onPress={testUsageSpike}
        style={{ backgroundColor: '#10b981', padding: 12, borderRadius: 8, marginBottom: 16 }}
        disabled={!isInitialized}
      >
        <Text style={{ color: 'white', textAlign: 'center', opacity: isInitialized ? 1 : 0.5 }}>
          Test Usage Spike
        </Text>
      </TouchableOpacity>

      <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
        Scheduled Notifications: {scheduledNotifications.length}
      </Text>

      {scheduledNotifications.map((notification, index) => (
        <View key={index} style={{ backgroundColor: '#f8f9fa', padding: 8, borderRadius: 4, marginBottom: 4 }}>
          <Text style={{ fontWeight: 'bold' }}>{notification.content.title}</Text>
          <Text style={{ fontSize: 12 }}>{notification.content.body}</Text>
        </View>
      ))}

      {scheduledNotifications.length > 0 && (
        <TouchableOpacity 
          onPress={clearAllNotifications}
          style={{ backgroundColor: '#6c757d', padding: 12, borderRadius: 8, marginTop: 8 }}
        >
          <Text style={{ color: 'white', textAlign: 'center' }}>Clear All Notifications</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};