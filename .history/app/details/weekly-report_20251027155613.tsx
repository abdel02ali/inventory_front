// app/details/weekly-reports.tsx
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { useNotifications, WeeklyReportData } from '../context/NotificationContext';

export default function WeeklyReportsScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const router = useRouter();
  const { generateWeeklyReport, getWeeklyReports, scheduleWeeklyReport } = useNotifications();
  
  const [reports, setReports] = useState<WeeklyReportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const styles = getStyles(isDarkMode);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = () => {
    const weeklyReports = getWeeklyReports();
    setReports(weeklyReports);
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      const newReport = await generateWeeklyReport();
      if (newReport) {
        loadReports(); // Refresh the list
        Alert.alert('Success', 'Weekly report generated successfully!');
      } else {
        Alert.alert('Error', 'Failed to generate weekly report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Error', 'Failed to generate weekly report');
    } finally {
      setGenerating(false);
    }
  };

  const handleScheduleReport = async () => {
    try {
      await scheduleWeeklyReport();
      Alert.alert('Success', 'Weekly report notification scheduled!');
    } catch (error) {
      console.error('Error scheduling report:', error);
      Alert.alert('Error', 'Failed to schedule weekly report');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          headerShown: true,
          title: 'Weekly Reports',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
              <Ionicons name="arrow-back" size={24} color={isDarkMode ? "#fff" : "#000"} />
            </TouchableOpacity>
          ),
        }} 
      />

      <ScrollView style={styles.content}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>📊 Weekly Inventory Reports</Text>
          <Text style={styles.subtitle}>
            Comprehensive overview of your inventory activity and trends
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]}
            onPress={handleGenerateReport}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="analytics" size={20} color="#fff" />
                <Text style={styles.buttonText}>Generate New Report</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]}
            onPress={handleScheduleReport}
          >
            <Ionicons name="notifications" size={20} color="#6366f1" />
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>Schedule Notification</Text>
          </TouchableOpacity>
        </View>

        {/* Reports List */}
        <View style={styles.reportsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Reports</Text>
            <Text style={styles.reportCount}>{reports.length} report{reports.length !== 1 ? 's' : ''}</Text>
          </View>

          {reports.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color={isDarkMode ? "#475569" : "#cbd5e1"} />
              <Text style={styles.emptyStateTitle}>No Reports Yet</Text>
              <Text style={styles.emptyStateText}>
                Generate your first weekly report to see inventory analytics and trends.
              </Text>
            </View>
          ) : (
            reports.map((report, index) => (
              <View key={index} style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <View>
                    <Text style={styles.reportPeriod}>
                      {formatDate(report.weekStart)} - {formatDate(report.weekEnd)}
                    </Text>
                    <Text style={styles.reportSummary}>{report.summary}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                </View>

                <View style={styles.reportStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{report.totalMovements}</Text>
                    <Text style={styles.statLabel}>Total Movements</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{report.stockInCount}</Text>
                    <Text style={styles.statLabel}>Stock Ins</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{report.distributionCount}</Text>
                    <Text style={styles.statLabel}>Distributions</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{report.totalProductsMoved}</Text>
                    <Text style={styles.statLabel}>Products Moved</Text>
                  </View>
                </View>

                {/* Top Products */}
                <View style={styles.topProducts}>
                  <Text style={styles.topProductsTitle}>Top Products</Text>
                  {report.topProducts.slice(0, 3).map((product, productIndex) => (
                    <View key={productIndex} style={styles.productItem}>
                      <Text style={styles.productName}>{product.productName}</Text>
                      <Text style={styles.productStats}>
                        {product.movementCount} moves • {product.totalQuantity} units
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Information Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>About Weekly Reports</Text>
          <Text style={styles.infoText}>
            • Automatically generated every Monday at 9:00 AM{'\n'}
            • Track inventory movements and trends{'\n'}
            • Identify top products and departments{'\n'}
            • Monitor stock alerts and usage patterns
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? "#0f172a" : "#f8fafc",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  headerSection: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    lineHeight: 22,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#6366f1',
  },
  secondaryButton: {
    backgroundColor: isDarkMode ? "#334155" : "#f1f5f9",
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButtonText: {
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  reportsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  reportCount: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: isDarkMode ? "#334155" : "#e2e8f0",
    borderStyle: 'dashed',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    textAlign: 'center',
    lineHeight: 20,
  },
  reportCard: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.1 : 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  reportPeriod: {
    fontSize: 16,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 4,
  },
  reportSummary: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    lineHeight: 20,
  },
  reportStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#f1f5f9",
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  topProducts: {
    marginTop: 8,
  },
  topProductsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 8,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  productName: {
    fontSize: 14,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    flex: 1,
  },
  productStats: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  infoSection: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    lineHeight: 20,
  },
});