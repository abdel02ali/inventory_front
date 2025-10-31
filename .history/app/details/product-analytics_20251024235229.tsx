import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
} from "react-native";
import { getUsageHistoryAnalytics } from "../api";

const { width: screenWidth } = Dimensions.get('window');

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface UsageStats {
  period: string;
  month: number;
  year: number;
  totalUsed: number;
  averageDailyUsage: number;
  usageCount: number;
  daysInMonth: number;
  estimatedDaysRemaining: number;
  monthlyUsage: Array<{
    date: string;
    quantityUsed: number;
    movementId: string;
    notes: string;
    usedBy: string;
    departmentId: string;
  }>;
}

interface AnalyticsData {
  productId: string;
  productName: string;
  analytics: {
    currentMonth: UsageStats;
    previousMonths: UsageStats[];
    comparisons: Array<{
      comparedTo: string;
      usageChange: number;
      trend: string;
      currentMonthTotal: number;
      comparedMonthTotal: number;
      absoluteChange: number;
    }>;
    summary: {
      totalMonthsAnalyzed: number;
      averageMonthlyUsage: number;
      highestUsage: {
        period: string;
        totalUsed: number;
      };
      lowestUsage: {
        period: string;
        totalUsed: number;
      };
      overallTrend: string;
      currentStock: number;
      estimatedMonthsRemaining: number;
    };
  };
}

export default function ProductAnalyticsScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const router = useRouter();
  const params = useLocalSearchParams();

  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'3m' | '6m' | '1y'>('3m');

  const productId = Array.isArray(params.productId) ? params.productId[0] : params.productId;
  const productName = Array.isArray(params.productName) ? params.productName[0] : params.productName;
  const unit = Array.isArray(params.unit) ? params.unit[0] : params.unit;
  const currentStock = Number(Array.isArray(params.currentStock) ? params.currentStock[0] : params.currentStock);

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedTimeframe]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const previousMonths = selectedTimeframe === '3m' ? 3 : selectedTimeframe === '6m' ? 6 : 12;
      
      const response = await getUsageHistoryAnalytics(productId!, previousMonths);
      
      if (response.success) {
        setAnalyticsData(response.data);
      } else {
        Alert.alert("Error", "Failed to load analytics data");
      }
    } catch (error) {
      console.error("Error loading analytics:", error);
      Alert.alert("Error", "Failed to load analytics data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAnalyticsData();
  };

  const getTrendIcon = (trend: string): IoniconsName => {
    switch (trend) {
      case 'significant_increase':
        return 'trending-up';
      case 'increase':
        return 'arrow-up';
      case 'decrease':
        return 'arrow-down';
      case 'significant_decrease':
        return 'trending-down';
      default:
        return 'remove';
    }
  };

  const getTrendColor = (trend: string): string => {
    switch (trend) {
      case 'significant_increase':
      case 'increase':
        return '#10b981';
      case 'significant_decrease':
      case 'decrease':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const formatNumber = (num: number): string => {
    return Number(num.toFixed(2)).toString();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const styles = getStyles(isDarkMode);

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading Analytics...</Text>
        </View>
      </View>
    );
  }

  if (!analyticsData) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorText}>Failed to load analytics data</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadAnalyticsData}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const { analytics } = analyticsData;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBackground} />
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Usage Analytics</Text>
            <Text style={styles.headerSubtitle}>{productName}</Text>
          </View>
          <View style={styles.timeframeSelector}>
            <TouchableOpacity 
              style={[
                styles.timeframeButton,
                selectedTimeframe === '3m' && styles.timeframeButtonActive
              ]}
              onPress={() => setSelectedTimeframe('3m')}
            >
              <Text style={[
                styles.timeframeButtonText,
                selectedTimeframe === '3m' && styles.timeframeButtonTextActive
              ]}>3M</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.timeframeButton,
                selectedTimeframe === '6m' && styles.timeframeButtonActive
              ]}
              onPress={() => setSelectedTimeframe('6m')}
            >
              <Text style={[
                styles.timeframeButtonText,
                selectedTimeframe === '6m' && styles.timeframeButtonTextActive
              ]}>6M</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.timeframeButton,
                selectedTimeframe === '1y' && styles.timeframeButtonActive
              ]}
              onPress={() => setSelectedTimeframe('1y')}
            >
              <Text style={[
                styles.timeframeButtonText,
                selectedTimeframe === '1y' && styles.timeframeButtonTextActive
              ]}>1Y</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#6366f1"]}
            tintColor="#6366f1"
          />
        }
      >
        {/* Summary Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="stats-chart" size={20} color={isDarkMode ? "#6366f1" : "#6366f1"} />
            <Text style={styles.cardTitle}>Summary</Text>
          </View>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <View style={styles.summaryIconContainer}>
                <Ionicons name="calendar" size={20} color="#6366f1" />
              </View>
              <Text style={styles.summaryValue}>{analytics.summary.totalMonthsAnalyzed}</Text>
              <Text style={styles.summaryLabel}>Months Analyzed</Text>
            </View>

            <View style={styles.summaryItem}>
              <View style={styles.summaryIconContainer}>
                <Ionicons name="trending-up" size={20} color="#10b981" />
              </View>
              <Text style={styles.summaryValue}>{formatNumber(analytics.summary.averageMonthlyUsage)}</Text>
              <Text style={styles.summaryLabel}>Avg Monthly Usage</Text>
            </View>

            <View style={styles.summaryItem}>
              <View style={styles.summaryIconContainer}>
                <Ionicons name="trophy" size={20} color="#f59e0b" />
              </View>
              <Text style={styles.summaryValue}>{analytics.summary.highestUsage.totalUsed}</Text>
              <Text style={styles.summaryLabel}>Peak Usage</Text>
            </View>

            <View style={styles.summaryItem}>
              <View style={styles.summaryIconContainer}>
                <Ionicons name="time" size={20} color="#8b5cf6" />
              </View>
              <Text style={styles.summaryValue}>{formatNumber(analytics.summary.estimatedMonthsRemaining)}</Text>
              <Text style={styles.summaryLabel}>Months Remaining</Text>
            </View>
          </View>
        </View>

        {/* Current Month Usage */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="today" size={20} color={isDarkMode ? "#6366f1" : "#6366f1"} />
            <Text style={styles.cardTitle}>Current Month - {analytics.currentMonth.period}</Text>
          </View>

          <View style={styles.currentMonthStats}>
            <View style={styles.statRow}>
              <View style={styles.statInfo}>
                <Text style={styles.statLabel}>Total Used</Text>
                <Text style={styles.statValue}>
                  {analytics.currentMonth.totalUsed} {unit}
                </Text>
              </View>
              <View style={styles.statInfo}>
                <Text style={styles.statLabel}>Usage Count</Text>
                <Text style={styles.statValue}>{analytics.currentMonth.usageCount}</Text>
              </View>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statInfo}>
                <Text style={styles.statLabel}>Avg Daily Usage</Text>
                <Text style={styles.statValue}>
                  {formatNumber(analytics.currentMonth.averageDailyUsage)} {unit}
                </Text>
              </View>
              <View style={styles.statInfo}>
                <Text style={styles.statLabel}>Days Remaining</Text>
                <Text style={styles.statValue}>
                  {analytics.currentMonth.estimatedDaysRemaining === Infinity ? 
                    '∞' : analytics.currentMonth.estimatedDaysRemaining}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Monthly Comparisons */}
        {analytics.comparisons.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="swap-vertical" size={20} color={isDarkMode ? "#6366f1" : "#6366f1"} />
              <Text style={styles.cardTitle}>Monthly Comparisons</Text>
            </View>

            <View style={styles.comparisonsList}>
              {analytics.comparisons.map((comparison, index) => (
                <View key={index} style={styles.comparisonItem}>
                  <View style={styles.comparisonInfo}>
                    <Text style={styles.comparisonPeriod}>{comparison.comparedTo}</Text>
                    <Text style={styles.comparisonUsage}>
                      {comparison.comparedMonthTotal} {unit}
                    </Text>
                  </View>
                  <View style={styles.comparisonTrend}>
                    <Ionicons 
                      name={getTrendIcon(comparison.trend)} 
                      size={20} 
                      color={getTrendColor(comparison.trend)} 
                    />
                    <Text style={[
                      styles.comparisonChange,
                      { color: getTrendColor(comparison.trend) }
                    ]}>
                      {comparison.usageChange > 0 ? '+' : ''}{comparison.usageChange}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Usage History */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="list" size={20} color={isDarkMode ? "#6366f1" : "#6366f1"} />
            <Text style={styles.cardTitle}>Recent Usage</Text>
            <View style={styles.historyCountBadge}>
              <Text style={styles.historyCountText}>
                {analytics.currentMonth.monthlyUsage.length}
              </Text>
            </View>
          </View>

          {analytics.currentMonth.monthlyUsage.length > 0 ? (
            <View style={styles.usageList}>
              {analytics.currentMonth.monthlyUsage.slice(0, 5).map((usage, index) => (
                <View key={index} style={styles.usageItem}>
                  <View style={styles.usageIconContainer}>
                    <Ionicons name="arrow-down" size={16} color="#ef4444" />
                  </View>
                  
                  <View style={styles.usageContent}>
                    <View style={styles.usageHeader}>
                      <View style={styles.usageInfo}>
                        <Text style={styles.usageDate}>
                          {formatDate(usage.date)}
                        </Text>
                        {usage.departmentId && (
                          <Text style={styles.usageDepartment}>
                            {usage.departmentId}
                          </Text>
                        )}
                      </View>
                      <View style={styles.usageQuantityContainer}>
                        <Text style={styles.usageQuantity}>
                          {usage.quantityUsed}
                        </Text>
                        <Text style={styles.usageUnit}>{unit}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.usageDetails}>
                      {usage.movementId && (
                        <View style={styles.usageDetailRow}>
                          <Ionicons name="barcode" size={12} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                          <Text style={styles.usageMovementId}>
                            {usage.movementId}
                          </Text>
                        </View>
                      )}
                      {usage.usedBy && (
                        <View style={styles.usageDetailRow}>
                          <Ionicons name="person" size={12} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                          <Text style={styles.usageUser}>
                            {usage.usedBy}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={48} color={isDarkMode ? "#475569" : "#cbd5e1"} />
              <Text style={styles.emptyText}>No Usage This Month</Text>
              <Text style={styles.emptySubtext}>
                Usage records will appear here when this product is used
              </Text>
            </View>
          )}
        </View>

        {/* Stock Projection */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="analytics" size={20} color={isDarkMode ? "#6366f1" : "#6366f1"} />
            <Text style={styles.cardTitle}>Stock Projection</Text>
          </View>

          <View style={styles.projectionContent}>
            <View style={styles.projectionItem}>
              <Text style={styles.projectionLabel}>Current Stock</Text>
              <Text style={styles.projectionValue}>
                {currentStock} {unit}
              </Text>
            </View>

            <View style={styles.projectionItem}>
              <Text style={styles.projectionLabel}>Avg Monthly Usage</Text>
              <Text style={styles.projectionValue}>
                {formatNumber(analytics.summary.averageMonthlyUsage)} {unit}
              </Text>
            </View>

            <View style={styles.projectionItem}>
              <Text style={styles.projectionLabel}>Estimated Months Remaining</Text>
              <Text style={[
                styles.projectionValue,
                styles.projectionHighlight
              ]}>
                {formatNumber(analytics.summary.estimatedMonthsRemaining)}
              </Text>
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
    backgroundColor: isDarkMode ? "#121212" : "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Header
  header: {
    height: 160,
    position: 'relative',
    overflow: 'hidden',
  },
  headerBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#6366f1',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  timeframeSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 4,
  },
  timeframeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  timeframeButtonActive: {
    backgroundColor: '#ffffff',
  },
  timeframeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  timeframeButtonTextActive: {
    color: '#6366f1',
  },
  // Content
  content: {
    flex: 1,
    marginTop: -20,
  },
  // Card
  card: {
    backgroundColor: isDarkMode ? "#1e1e1e" : "#ffffff",
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginLeft: 8,
  },
  historyCountBadge: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 'auto',
  },
  historyCountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  // Summary Grid
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    width: (screenWidth - 80) / 2 - 6,
    alignItems: 'center',
    padding: 16,
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    borderRadius: 16,
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    textAlign: 'center',
  },
  // Current Month Stats
  currentMonthStats: {
    gap: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statInfo: {
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  // Comparisons
  comparisonsList: {
    gap: 12,
  },
  comparisonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    borderRadius: 12,
  },
  comparisonInfo: {
    flex: 1,
  },
  comparisonPeriod: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 2,
  },
  comparisonUsage: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  comparisonTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  comparisonChange: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Usage History
  usageList: {
    gap: 12,
  },
  usageItem: {
    flexDirection: 'row',
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: isDarkMode ? "#475569" : "#e2e8f0",
  },
  usageIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  usageContent: {
    flex: 1,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  usageInfo: {
    flex: 1,
  },
  usageDate: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 2,
  },
  usageDepartment: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontWeight: '500',
  },
  usageQuantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  usageQuantity: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  usageUnit: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontWeight: '500',
  },
  usageDetails: {
    gap: 6,
  },
  usageDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  usageMovementId: {
    fontSize: 11,
    color: isDarkMode ? "#cbd5e1" : "#475569",
    fontFamily: 'monospace',
  },
  usageUser: {
    fontSize: 11,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  // Projection
  projectionContent: {
    gap: 12,
  },
  projectionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  projectionLabel: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  projectionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  projectionHighlight: {
    color: '#10b981',
    fontWeight: 'bold',
  },
  // Empty States
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginTop: 12,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: isDarkMode ? "#64748b" : "#94a3b8",
    textAlign: 'center',
    lineHeight: 20,
  },
});