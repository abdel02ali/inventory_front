import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useNotifications } from '../contexts/NotificationContext';

export default function NotificationSettingsScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const router = useRouter();
  const { settings, updateSettings, scheduledNotifications, clearAllNotifications } = useNotifications();

  const styles = getStyles(isDarkMode);

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all scheduled notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: clearAllNotifications
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Notification Settings',
          headerShown: true,
        }} 
      />
      
      <ScrollView style={styles.content}>
        {/* Alert Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alert Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Low Stock Alerts</Text>
              <Text style={styles.settingDescription}>
                Get notified when products are running low
              </Text>
            </View>
            <Switch
              value={settings.lowStockEnabled}
              onValueChange={(value) => updateSettings({ lowStockEnabled: value })}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={settings.lowStockEnabled ? '#6366f1' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Out of Stock Alerts</Text>
              <Text style={styles.settingDescription}>
                Get notified when products are out of stock
              </Text>
            </View>
            <Switch
              value={settings.outOfStockEnabled}
              onValueChange={(value) => updateSettings({ outOfStockEnabled: value })}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={settings.outOfStockEnabled ? '#6366f1' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Usage Spike Alerts</Text>
              <Text style={styles.settingDescription}>
                Get notified when product usage increases significantly
              </Text>
            </View>
            <Switch
              value={settings.usageSpikeEnabled}
              onValueChange={(value) => updateSettings({ usageSpikeEnabled: value })}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={settings.usageSpikeEnabled ? '#6366f1' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Report Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Daily Summary</Text>
              <Text style={styles.settingDescription}>
                Receive daily inventory summary at 5 PM
              </Text>
            </View>
            <Switch
              value={settings.dailySummaryEnabled}
              onValueChange={(value) => updateSettings({ dailySummaryEnabled: value })}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={settings.dailySummaryEnabled ? '#6366f1' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Weekly Reports</Text>
              <Text style={styles.settingDescription}>
                Receive weekly inventory report every Monday
              </Text>
            </View>
            <Switch
              value={settings.weeklyReportEnabled}
              onValueChange={(value) => updateSettings({ weeklyReportEnabled: value })}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={settings.weeklyReportEnabled ? '#6366f1' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Threshold Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alert Thresholds</Text>
          
          <View style={styles.thresholdItem}>
            <Text style={styles.thresholdLabel}>Low Stock Threshold</Text>
            <View style={styles.thresholdValue}>
              <Text style={styles.thresholdText}>{settings.lowStockThreshold}</Text>
              <Text style={styles.thresholdUnit}>units</Text>
            </View>
          </View>

          <View style={styles.thresholdItem}>
            <Text style={styles.thresholdLabel}>Usage Spike Threshold</Text>
            <View style={styles.thresholdValue}>
              <Text style={styles.thresholdText}>{settings.usageSpikeThreshold}%</Text>
              <Text style={styles.thresholdUnit}>increase</Text>
            </View>
          </View>
        </View>

        {/* Scheduled Notifications */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Scheduled Notifications</Text>
            <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
          </View>
          
          {scheduledNotifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off" size={48} color={isDarkMode ? '#475569' : '#cbd5e1'} />
              <Text style={styles.emptyText}>No scheduled notifications</Text>
            </View>
          ) : (
            scheduledNotifications.map((notification, index) => (
              <View key={index} style={styles.notificationItem}>
                <Ionicons name="notifications" size={20} color="#6366f1" />
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTitle}>
                    {notification.content.title}
                  </Text>
                  <Text style={styles.notificationBody}>
                    {notification.content.body}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? '#0f0f0f' : '#f8fafc',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDarkMode ? '#f1f5f9' : '#1e293b',
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#2a2a2a' : '#f1f5f9',
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? '#f1f5f9' : '#1e293b',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: isDarkMode ? '#94a3b8' : '#64748b',
    lineHeight: 18,
  },
  thresholdItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#2a2a2a' : '#f1f5f9',
  },
  thresholdLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? '#f1f5f9' : '#1e293b',
  },
  thresholdValue: {
    alignItems: 'flex-end',
  },
  thresholdText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  thresholdUnit: {
    fontSize: 12,
    color: isDarkMode ? '#94a3b8' : '#64748b',
  },
  clearButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clearButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: isDarkMode ? '#2a2a2a' : '#f8fafc',
    borderRadius: 8,
    marginBottom: 8,
  },
  notificationContent: {
    flex: 1,
    marginLeft: 12,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? '#f1f5f9' : '#1e293b',
    marginBottom: 2,
  },
  notificationBody: {
    fontSize: 12,
    color: isDarkMode ? '#94a3b8' : '#64748b',
    lineHeight: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 14,
    color: isDarkMode ? '#94a3b8' : '#64748b',
    marginTop: 8,
  },
});