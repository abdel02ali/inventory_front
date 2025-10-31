// components/NotificationDebug.tsx
import React from 'react';
import { Alert, Button, Text, View } from 'react-native';
import { useSyncNotifications } from '../hooks/useSyncNotifications';

export const NotificationDebug: React.FC = () => {
  const { 
    expoPushToken, 
    testPushNotification, 
    manuallyRegisterDevice,
    getRegisteredDevices 
  } = useSyncNotifications();

  const handleManualRegister = async () => {
    const success = await manuallyRegisterDevice();
    if (success) {
      Alert.alert('Success', 'Device registered successfully!');
    } else {
      Alert.alert('Error', 'Failed to register device');
    }
  };

  const handleTestPush = async () => {
    const result = await testPushNotification();
    Alert.alert('Test Push', result.success ? 'Sent successfully!' : 'Failed to send');
  };

  const handleCheckDevices = async () => {
    const devices = await getRegisteredDevices();
    Alert.alert(
      'Registered Devices', 
      devices ? `${devices.data.deviceCount} devices registered` : 'Failed to get devices'
    );
  };

  return (
    <View style={{ padding: 20, gap: 10 }}>
      <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Push Notification Debug</Text>
      <Text>Token: {expoPushToken || 'No token'}</Text>
      
      <Button title="📱 Manually Register Device" onPress={handleManualRegister} />
      <Button title="🧪 Test Push Notification" onPress={handleTestPush} />
      <Button title="📋 Check Registered Devices" onPress={handleCheckDevices} />
    </View>
  );
};