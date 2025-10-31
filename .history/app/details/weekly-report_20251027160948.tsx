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

// Component for displaying report statistics in a grid
const ReportStatsGrid: React.FC<{ report: WeeklyReportData }> = ({ report }) => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  const styles = getStyles(isDarkMode);
  
  return (
    <View style={styles.statsGrid}>
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>{report.totalMovements}</Text>
        <Text style={styles.statLabel}>Total Movements</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>{report.stockInCount}</Text>
        <Text style={styles.statLabel}>Stock Ins</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>{report.distributionCount}</Text>
        <Text style={styles.statLabel}>Distributions</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>{report.totalProductsMoved}</Text>
        <Text style={styles.statLabel}>Products Moved</Text>
      </View>
    </View>
  );
};

// Component for displaying alert status
const AlertStatus: React.FC<{ lowStock: number; outOfStock: number }> = ({ lowStock, outOfStock }) => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  const styles = getStyles(isDarkMode);
  
  return (
    <View style={styles.alertSection}>
      <Text style={styles.alertTitle}>📊 Alert Summary</Text>
      <View style={styles.alertStats}>
        <View style={[styles.alertItem, lowStock > 3 && styles.alertWarning]}>
          <Text style={styles.alertCount}>{lowStock}</Text>
          <Text style={styles.alertLabel}>Low Stock</Text>
          {lowStock > 3 && <Ionicons name="warning" size={16} color="#f59e0b" style={styles.alertIcon} />}
        </View>
        <View style={[styles.alertItem, outOfStock > 0 && styles.alertCritical]}>
          <Text style={styles.alertCount}>{outOfStock}</Text>
          <Text style={styles.alertLabel}>Out of Stock</Text>
          {outOfStock > 0 && <Ionicons name="alert-circle" size={16} color="#ef4444" style={styles.alertIcon} />}
        </View>
      </View>
    </View>
  );
};

// Component for displaying top products
const TopProductsList: React.FC<{ products: WeeklyReportData['topProducts'] }> = ({ products }) => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  const styles = getStyles(isDarkMode);
  
  return (
    <View style={styles.topProductsSection}>
      <Text style={styles.sectionSubtitle}>🏆 Top Performing Products</Text>
      {products.slice(0, 5).map((product, index) => (
        <View key={index} style={styles.productRow}>
          <View style={styles.productRank}>
            <Text style={styles.rankNumber}>{index + 1}</Text>
          </View>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{product.productName}</Text>
            <Text style={styles.productDetails}>
              {product.movementCount} moves • {product.totalQuantity} units
            </Text>
          </View>
          <View style={styles.productBadge}>
            <Text style={styles.badgeText}>
              {product.movementCount >= 7 ? 'High' : product.movementCount >= 5 ? 'Medium' : 'Low'}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};

// Component for displaying department activity
const DepartmentActivity: React.FC<{ departments: WeeklyReportData['departmentsActivity'] }> = ({ departments }) => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  const styles = getStyles(isDarkMode);
  
  // Calculate total for percentages
  const totalDistributions = departments.reduce((sum, dept) => sum + dept.distributionCount, 0);
  
  return (
    <View style={styles.departmentsSection}>
      <Text style={styles.sectionSubtitle}>🏢 Department Activity</Text>
      {departments.map((dept, index) => {
        const percentage = totalDistributions > 0 ? Math.round((dept.distributionCount / totalDistributions) * 100) : 0;
        
        return (
          <View key={index} style={styles.departmentRow}>
            <View style={styles.departmentInfo}>
              <Text style={styles.departmentName}>{dept.departmentName}</Text>
              <Text style={styles.departmentStats}>
                {dept.distributionCount} distributions • {dept.totalProducts} products
              </Text>
            </View>
            <View style={styles.percentageBar}>
              <View 
                style={[
                  styles.percentageFill,
                  { width: `${percentage}%` },
                  percentage > 50 ? styles.highActivity : percentage > 25 ? styles.mediumActivity : styles.lowActivity
                ]} 
              />
              <Text style={styles.percentageText}>{percentage}%</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

// Component for individual report card
const ReportCard: React.FC<{ report: WeeklyReportData; index: number }> = ({ report, index }) => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const router = useRouter();
  
  const styles = getStyles(isDarkMode);
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleViewDetails = () => {
    // You can navigate to a detailed report view here
    Alert.alert(
      'Report Details',
      'This would show a detailed view of the weekly report with charts and analytics.',
      [
        { text: 'OK', style: 'default' }
      ]
    );
  };

  return (
    <View style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <View style={styles.reportTitleSection}>
          <Text style={styles.reportPeriod}>
            {formatDate(report.weekStart)} - {formatDate(report.weekEnd)}
          </Text>
          <View style={styles.reportBadge}>
            <Ionicons name="calendar" size={14} color="#6366f1" />
            <Text style={styles.reportBadgeText}>Weekly Report</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleViewDetails}>
          <Ionicons name="ellipsis-horizontal" size={20} color={isDarkMode ? "#94a3b8" : "#64748b"} />
        </TouchableOpacity>
      </View>

      {/* Statistics Grid */}
      <ReportStatsGrid report={report} />

      {/* Alert Status */}
      <AlertStatus lowStock={report.lowStockAlerts} outOfStock={report.outOfStockAlerts} />

      {/* Top Products */}
      <TopProductsList products={report.topProducts} />

      {/* Department Activity */}
      <DepartmentActivity departments={report.departmentsActivity} />

      {/* Summary */}
      <View style={styles.summarySection}>
        <Text style={styles.summaryTitle}>📋 Executive Summary</Text>
        <Text style={styles.summaryText}>{report.summary}</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.reportActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="download" size={16} color="#6366f1" />
          <Text style={styles.actionButtonText}>Export PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share-social" size={16} color="#6366f1" />
          <Text style={styles.actionButtonText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="stats-chart" size={16} color="#6366f1" />
          <Text style={styles.actionButtonText}>Analytics</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

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
    console.log('🔍 WeeklyReportsScreen mounted');
    loadReports();
  }, []);

  const loadReports = () => {
    console.log('📥 Loading reports from context...');
    const weeklyReports = getWeeklyReports();
    console.log('📋 Reports received:', weeklyReports);
    console.log('📊 Number of reports:', weeklyReports.length);
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
      Alert.alert('Success', 'Weekly report notification scheduled! You will receive a report every Monday at 9:00 AM.');
    } catch (error) {
      console.error('Error scheduling report:', error);
      Alert.alert('Error', 'Failed to schedule weekly report');
    }
  };

  const handleQuickActions = (action: string) => {
    switch (action) {
      case 'trends':
        Alert.alert('Trend Analysis', 'This would show trend analysis across multiple reports.');
        break;
      case 'comparison':
        Alert.alert('Comparison View', 'This would allow comparing different weekly reports.');
        break;
      case 'insights':
        Alert.alert('AI Insights', 'This would provide AI-powered insights and recommendations.');
        break;
    }
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>📊 Weekly Inventory Reports</Text>
          <Text style={styles.subtitle}>
            Comprehensive overview of your inventory activity, trends, and performance metrics
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => handleQuickActions('trends')}
          >
            <Ionicons name="trending-up" size={20} color="#8b5cf6" />
            <Text style={styles.quickActionText}>Trends</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => handleQuickActions('comparison')}
          >
            <Ionicons name="git-compare" size={20} color="#06b6d4" />
            <Text style={styles.quickActionText}>Compare</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => handleQuickActions('insights')}
          >
            <Ionicons name="sparkles" size={20} color="#f59e0b" />
            <Text style={styles.quickActionText}>Insights</Text>
          </TouchableOpacity>
        </View>

        {/* Main Action Buttons */}
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
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>Schedule Auto-Report</Text>
          </TouchableOpacity>
        </View>

        {/* Reports List */}
        <View style={styles.reportsSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Recent Reports</Text>
              <Text style={styles.sectionDescription}>
                {reports.length > 0 
                  ? `Last generated: ${new Date().toLocaleDateString()}`
                  : 'No reports generated yet'
                }
              </Text>
            </View>
            <Text style={styles.reportCount}>{reports.length} report{reports.length !== 1 ? 's' : ''}</Text>
          </View>

          {reports.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color={isDarkMode ? "#475569" : "#cbd5e1"} />
              <Text style={styles.emptyStateTitle}>No Reports Generated</Text>
              <Text style={styles.emptyStateText}>
                Generate your first weekly report to see comprehensive inventory analytics, trends, and performance insights.
              </Text>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={handleGenerateReport}
                disabled={generating}
              >
                {generating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="rocket" size={16} color="#fff" />
                    <Text style={styles.emptyStateButtonText}>Generate First Report</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            reports.map((report, index) => (
              <ReportCard key={index} report={report} index={index} />
            ))
          )}
        </View>

        {/* Information Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>📈 About Weekly Reports</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="time" size={20} color="#10b981" />
              <Text style={styles.infoItemTitle}>Automatic Generation</Text>
              <Text style={styles.infoItemText}>Reports generated every Monday at 9:00 AM</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="trending-up" size={20} color="#8b5cf6" />
              <Text style={styles.infoItemTitle}>Trend Analysis</Text>
              <Text style={styles.infoItemText}>Track inventory patterns and performance</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="alert-circle" size={20} color="#f59e0b" />
              <Text style={styles.infoItemTitle}>Alert Monitoring</Text>
              <Text style={styles.infoItemText}>Monitor stock levels and identify risks</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="business" size={20} color="#06b6d4" />
              <Text style={styles.infoItemTitle}>Department Insights</Text>
              <Text style={styles.infoItemText}>Understand department-level activity</Text>
            </View>
          </View>
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
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDarkMode ? 0.1 : 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginTop: 4,
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
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  sectionDescription: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginTop: 2,
  },
  reportCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
    backgroundColor: isDarkMode ? "#3730a3" : "#e0e7ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
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
    marginBottom: 20,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  reportCard: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDarkMode ? 0.1 : 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  reportTitleSection: {
    flex: 1,
  },
  reportPeriod: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 8,
  },
  reportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? "#3730a3" : "#e0e7ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    gap: 4,
  },
  reportBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    textAlign: 'center',
  },
  alertSection: {
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 12,
  },
  alertStats: {
    flexDirection: 'row',
    gap: 16,
  },
  alertItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? "#475569" : "#ffffff",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? "#64748b" : "#e2e8f0",
  },
  alertWarning: {
    borderColor: '#f59e0b',
    backgroundColor: isDarkMode ? "#451a03" : "#fef3c7",
  },
  alertCritical: {
    borderColor: '#ef4444',
    backgroundColor: isDarkMode ? "#450a0a" : "#fecaca",
  },
  alertCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginRight: 8,
  },
  alertLabel: {
    fontSize: 14,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    flex: 1,
  },
  alertIcon: {
    marginLeft: 4,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 12,
  },
  topProductsSection: {
    marginBottom: 20,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#f1f5f9",
  },
  productRank: {
    width: 24,
    height: 24,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 2,
  },
  productDetails: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  productBadge: {
    backgroundColor: isDarkMode ? "#374151" : "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: isDarkMode ? "#d1d5db" : "#4b5563",
  },
  departmentsSection: {
    marginBottom: 20,
  },
  departmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#f1f5f9",
  },
  departmentInfo: {
    flex: 1,
  },
  departmentName: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 2,
  },
  departmentStats: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  percentageBar: {
    width: 60,
    height: 20,
    backgroundColor: isDarkMode ? "#374151" : "#f3f4f6",
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  percentageFill: {
    height: '100%',
    borderRadius: 10,
  },
  highActivity: {
    backgroundColor: '#10b981',
  },
  mediumActivity: {
    backgroundColor: '#f59e0b',
  },
  lowActivity: {
    backgroundColor: '#6b7280',
  },
  percentageText: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    lineHeight: 20,
  },
  summarySection: {
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    lineHeight: 20,
  },
  reportActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDarkMode ? "#374151" : "#f3f4f6",
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
  },
  infoSection: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 16,
  },
  infoGrid: {
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 4,
  },
  infoItemText: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    lineHeight: 16,
  },
});