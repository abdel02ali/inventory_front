import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useNotifications } from '../context/NotificationContext';

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
        {/* Movement Alert Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Movement Alerts</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Movement Alerts</Text>
              <Text style={styles.settingDescription}>
                Get notified when stock movements are created
              </Text>
            </View>
            <Switch
              value={settings.movementAlertsEnabled}
              onValueChange={(value) => updateSettings({ movementAlertsEnabled: value })}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={settings.movementAlertsEnabled ? '#6366f1' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Stock In Alerts</Text>
              <Text style={styles.settingDescription}>
                Get notified when new stock is added
              </Text>
            </View>
            <Switch
              value={settings.stockInAlertsEnabled}
              onValueChange={(value) => updateSettings({ stockInAlertsEnabled: value })}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={settings.stockInAlertsEnabled ? '#6366f1' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Distribution Alerts</Text>
              <Text style={styles.settingDescription}>
                Get notified when products are distributed
              </Text>
            </View>
            <Switch
              value={settings.distributionAlertsEnabled}
              onValueChange={(value) => updateSettings({ distributionAlertsEnabled: value })}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={settings.distributionAlertsEnabled ? '#6366f1' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Bulk Movement Alerts</Text>
              <Text style={styles.settingDescription}>
                Get summary alerts for multiple movements
              </Text>
            </View>
            <Switch
              value={settings.bulkMovementAlertsEnabled}
              onValueChange={(value) => updateSettings({ bulkMovementAlertsEnabled: value })}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={settings.bulkMovementAlertsEnabled ? '#6366f1' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Stock Alert Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stock Alerts</Text>
          
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

        {/* Quiet Hours Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quiet Hours</Text>
          
          <View style={styles.thresholdItem}>
            <Text style={styles.thresholdLabel}>Start Time</Text>
            <View style={styles.thresholdValue}>
              <Text style={styles.thresholdText}>{settings.quietHours.start}</Text>
            </View>
          </View>

          <View style={styles.thresholdItem}>
            <Text style={styles.thresholdLabel}>End Time</Text>
            <View style={styles.thresholdValue}>
              <Text style={styles.thresholdText}>{settings.quietHours.end}</Text>
            </View>
          </View>
          
          <Text style={styles.quietHoursNote}>
            Notifications will be silenced during quiet hours
          </Text>
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
              <Text style={styles.emptySubtext}>
                Notifications will appear here when scheduled
              </Text>
            </View>
          ) : (
            <View>
              <Text style={styles.notificationCount}>
                {scheduledNotifications.length} scheduled notification{scheduledNotifications.length !== 1 ? 's' : ''}
              </Text>
              {scheduledNotifications.map((notification, index) => (
                <View key={index} style={styles.notificationItem}>
                  <Ionicons 
                    name={getNotificationIcon(notification.content.data?.type)} 
                    size={20} 
                    color={getNotificationColor(notification.content.data?.type)} 
                  />
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationTitle}>
                      {notification.content.title}
                    </Text>
                    <Text style={styles.notificationBody}>
                      {notification.content.body}
                    </Text>
                    {notification.content.data?.timestamp && (
                      <Text style={styles.notificationTime}>
                        Scheduled for: {formatNotificationTime(notification.content.data.timestamp)}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Test Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Notifications</Text>
          <Text style={styles.testDescription}>
            Test your notification settings to make sure they work correctly
          </Text>
          
          <TouchableOpacity 
            style={styles.testButton}
            onPress={() => {
              // You can add a test function here later
              Alert.alert(
                'Test Notifications',
                'Create a stock movement to test movement notifications, or wait for low stock alerts.'
              );
            }}
          >
            <Ionicons name="notifications" size={20} color="#ffffff" />
            <Text style={styles.testButtonText}>How to Test</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// Helper functions for notification display
const getNotificationIcon = (type?: string) => {
  switch (type) {
    case 'movement':
    case 'stock_in':
    case 'distribution':
      return 'swap-horizontal';
    case 'low_stock':
      return 'warning';
    case 'out_of_stock':
      return 'alert-circle';
    case 'usage_spike':
      return 'trending-up';
    case 'daily_summary':
      return 'document-text';
    case 'weekly_report':
      return 'bar-chart';
    default:
      return 'notifications';
  }
};

const getNotificationColor = (type?: string) => {
  switch (type) {
    case 'movement':
    case 'stock_in':
      return '#10b981'; // Green for stock in
    case 'distribution':
      return '#ef4444'; // Red for distribution
    case 'low_stock':
      return '#f59e0b'; // Amber for low stock
    case 'out_of_stock':
      return '#dc2626'; // Red for out of stock
    case 'usage_spike':
      return '#8b5cf6'; // Purple for usage spike
    case 'daily_summary':
    case 'weekly_report':
      return '#6366f1'; // Indigo for reports
    default:
      return '#6b7280'; // Gray for default
  }
};

const formatNotificationTime = (timestamp: string) => {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString();
  } catch (error) {
    return 'Unknown time';
  }
};

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
  quietHoursNote: {
    fontSize: 12,
    color: isDarkMode ? '#64748b' : '#94a3b8',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
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
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 10,
    color: isDarkMode ? '#64748b' : '#94a3b8',
    fontStyle: 'italic',
  },
  notificationCount: {
    fontSize: 14,
    color: isDarkMode ? '#94a3b8' : '#64748b',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 14,
    color: isDarkMode ? '#94a3b8' : '#64748b',
    marginTop: 8,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 12,
    color: isDarkMode ? '#64748b' : '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
  testDescription: {
    fontSize: 14,
    color: isDarkMode ? '#94a3b8' : '#64748b',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  testButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});