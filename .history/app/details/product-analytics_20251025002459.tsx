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
const CARD_WIDTH = (screenWidth - 60) / 2; // Two cards per row with margins
const CARD_MARGIN = 8;

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
        {/* Summary Cards - 4 Cards in 2x2 Grid */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="stats-chart" size={20} color={isDarkMode ? "#6366f1" : "#6366f1"} />
            <Text style={styles.cardTitle}>Performance Summary</Text>
          </View>

          <View style={styles.summaryGrid}>
            {/* Months Analyzed Card */}
            <View style={styles.horizontalCard}>
              <View style={[styles.cardIconContainer, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                <Ionicons name="calendar" size={20} color="#6366f1" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardValue}>{analytics.summary.totalMonthsAnalyzed}</Text>
                <Text style={styles.cardLabel}>Months Analyzed</Text>
              </View>
            </View>

            {/* Average Monthly Usage Card */}
            <View style={styles.horizontalCard}>
              <View style={[styles.cardIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Ionicons name="trending-up" size={20} color="#10b981" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardValue}>{formatNumber(analytics.summary.averageMonthlyUsage)}</Text>
                <Text style={styles.cardLabel}>Avg Monthly</Text>
                <Text style={styles.cardUnit}>{unit}</Text>
              </View>
            </View>

            {/* Peak Usage Card */}
            <View style={styles.horizontalCard}>
              <View style={[styles.cardIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                <Ionicons name="trophy" size={20} color="#f59e0b" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardValue}>{analytics.summary.highestUsage.totalUsed}</Text>
                <Text style={styles.cardLabel}>Peak Usage</Text>
                <Text style={styles.cardSubtext}>{analytics.summary.highestUsage.period}</Text>
              </View>
            </View>

            {/* Months Remaining Card */}
            <View style={styles.horizontalCard}>
              <View style={[styles.cardIconContainer, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                <Ionicons name="time" size={20} color="#8b5cf6" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardValue}>{formatNumber(analytics.summary.estimatedMonthsRemaining)}</Text>
                <Text style={styles.cardLabel}>Months Left</Text>
                <Text style={styles.cardSubtext}>Based on usage</Text>
              </View>
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
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="cube" size={16} color="#6366f1" />
                </View>
                <View>
                  <Text style={styles.statLabel}>Total Used</Text>
                  <Text style={styles.statValue}>
                    {analytics.currentMonth.totalUsed} <Text style={styles.statUnit}>{unit}</Text>
                  </Text>
                </View>
              </View>
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="repeat" size={16} color="#8b5cf6" />
                </View>
                <View>
                  <Text style={styles.statLabel}>Usage Count</Text>
                  <Text style={styles.statValue}>{analytics.currentMonth.usageCount}</Text>
                </View>
              </View>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="speedometer" size={16} color="#f59e0b" />
                </View>
                <View>
                  <Text style={styles.statLabel}>Avg Daily</Text>
                  <Text style={styles.statValue}>
                    {formatNumber(analytics.currentMonth.averageDailyUsage)} <Text style={styles.statUnit}>{unit}</Text>
                  </Text>
                </View>
              </View>
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="calendar" size={16} color="#ef4444" />
                </View>
                <View>
                  <Text style={styles.statLabel}>Days Left</Text>
                  <Text style={styles.statValue}>
                    {analytics.currentMonth.estimatedDaysRemaining === Infinity ? 
                      '∞' : analytics.currentMonth.estimatedDaysRemaining}
                  </Text>
                </View>
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
  // Horizontal Cards Grid (2x2 layout)
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  horizontalCard: {
    width: CARD_WIDTH,
    backgroundColor: isDarkMode ? "#2a2a2a" : "#f8fafc",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? "#3a3a3a" : "#e2e8f0",
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 2,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 2,
  },
  cardUnit: {
    fontSize: 10,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontWeight: '500',
  },
  cardSubtext: {
    fontSize: 10,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontWeight: '500',
  },
  // Current Month Stats
  currentMonthStats: {
    gap: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: isDarkMode ? "#2a2a2a" : "#f8fafc",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? "#3a3a3a" : "#e2e8f0",
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: isDarkMode ? "#3a3a3a" : "#ffffff",
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statLabel: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginBottom: 2,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  statUnit: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontWeight: 'normal',
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
    backgroundColor: isDarkMode ? "#2a2a2a" : "#f8fafc",
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
    backgroundColor: isDarkMode ? "#2a2a2a" : "#f8fafc",
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