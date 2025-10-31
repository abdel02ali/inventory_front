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
const CARD_WIDTH = screenWidth - 80; // Width for horizontal cards
const CARD_MARGIN = 12;

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
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Loading Analytics...</Text>
          </View>
        </View>
      </View>
    );
  }

  if (!analyticsData) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.errorContainer}>
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={64} color="#ef4444" />
            <Text style={styles.errorText}>Failed to load analytics data</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadAnalyticsData}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
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
        {/* Summary Cards - Horizontal Scroll */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            {/* Total Months Card */}
            <View style={styles.horizontalCard}>
              <View style={[styles.cardIconContainer, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                <Ionicons name="calendar" size={24} color="#6366f1" />
              </View>
              <Text style={styles.horizontalCardValue}>{analytics.summary.totalMonthsAnalyzed}</Text>
              <Text style={styles.horizontalCardLabel}>Months Analyzed</Text>
              <Text style={styles.horizontalCardSubtext}>Data period</Text>
            </View>

            {/* Average Usage Card */}
            <View style={styles.horizontalCard}>
              <View style={[styles.cardIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Ionicons name="trending-up" size={24} color="#10b981" />
              </View>
              <Text style={styles.horizontalCardValue}>
                {formatNumber(analytics.summary.averageMonthlyUsage)}
              </Text>
              <Text style={styles.horizontalCardLabel}>Avg Monthly</Text>
              <Text style={styles.horizontalCardSubtext}>{unit}</Text>
            </View>

            {/* Peak Usage Card */}
            <View style={styles.horizontalCard}>
              <View style={[styles.cardIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                <Ionicons name="trophy" size={24} color="#f59e0b" />
              </View>
              <Text style={styles.horizontalCardValue}>{analytics.summary.highestUsage.totalUsed}</Text>
              <Text style={styles.horizontalCardLabel}>Peak Usage</Text>
              <Text style={styles.horizontalCardSubtext}>{analytics.summary.highestUsage.period}</Text>
            </View>

            {/* Months Remaining Card */}
            <View style={styles.horizontalCard}>
              <View style={[styles.cardIconContainer, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                <Ionicons name="time" size={24} color="#8b5cf6" />
              </View>
              <Text style={styles.horizontalCardValue}>
                {formatNumber(analytics.summary.estimatedMonthsRemaining)}
              </Text>
              <Text style={styles.horizontalCardLabel}>Months Left</Text>
              <Text style={styles.horizontalCardSubtext}>Based on usage</Text>
            </View>
          </ScrollView>
        </View>

        {/* Current Month Stats - Horizontal */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Current Month</Text>
            <View style={styles.periodBadge}>
              <Text style={styles.periodBadgeText}>LIVE</Text>
            </View>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            {/* Total Used Card */}
            <View style={styles.horizontalCard}>
              <View style={[styles.cardIconContainer, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                <Ionicons name="cube" size={24} color="#6366f1" />
              </View>
              <Text style={styles.horizontalCardValue}>{analytics.currentMonth.totalUsed}</Text>
              <Text style={styles.horizontalCardLabel}>Total Used</Text>
              <Text style={styles.horizontalCardSubtext}>{unit}</Text>
            </View>

            {/* Usage Count Card */}
            <View style={styles.horizontalCard}>
              <View style={[styles.cardIconContainer, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                <Ionicons name="repeat" size={24} color="#8b5cf6" />
              </View>
              <Text style={styles.horizontalCardValue}>{analytics.currentMonth.usageCount}</Text>
              <Text style={styles.horizontalCardLabel}>Usage Count</Text>
              <Text style={styles.horizontalCardSubtext}>Transactions</Text>
            </View>

            {/* Average Daily Card */}
            <View style={styles.horizontalCard}>
              <View style={[styles.cardIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                <Ionicons name="speedometer" size={24} color="#f59e0b" />
              </View>
              <Text style={styles.horizontalCardValue}>
                {formatNumber(analytics.currentMonth.averageDailyUsage)}
              </Text>
              <Text style={styles.horizontalCardLabel}>Avg Daily</Text>
              <Text style={styles.horizontalCardSubtext}>{unit}</Text>
            </View>

            {/* Days Remaining Card */}
            <View style={styles.horizontalCard}>
              <View style={[styles.cardIconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <Ionicons name="calendar" size={24} color="#ef4444" />
              </View>
              <Text style={styles.horizontalCardValue}>
                {analytics.currentMonth.estimatedDaysRemaining === Infinity ? 
                  '∞' : analytics.currentMonth.estimatedDaysRemaining}
              </Text>
              <Text style={styles.horizontalCardLabel}>Days Left</Text>
              <Text style={styles.horizontalCardSubtext}>This month</Text>
            </View>
          </ScrollView>
        </View>

        {/* Monthly Comparisons - Horizontal */}
        {analytics.comparisons.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trend Analysis</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
              contentContainerStyle={styles.horizontalScrollContent}
            >
              {analytics.comparisons.map((comparison, index) => (
                <View key={index} style={styles.comparisonCard}>
                  <View style={styles.comparisonHeader}>
                    <Text style={styles.comparisonPeriod}>{comparison.comparedTo}</Text>
                    <View style={[
                      styles.trendIconContainer,
                      { backgroundColor: getTrendColor(comparison.trend) + '20' }
                    ]}>
                      <Ionicons 
                        name={getTrendIcon(comparison.trend)} 
                        size={16} 
                        color={getTrendColor(comparison.trend)} 
                      />
                    </View>
                  </View>
                  <Text style={styles.comparisonValue}>
                    {comparison.comparedMonthTotal} <Text style={styles.comparisonUnit}>{unit}</Text>
                  </Text>
                  <Text style={[
                    styles.comparisonChange,
                    { color: getTrendColor(comparison.trend) }
                  ]}>
                    {comparison.usageChange > 0 ? '+' : ''}{comparison.usageChange}%
                  </Text>
                  <Text style={styles.comparisonSubtext}>
                    vs current month
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Stock Projection - Horizontal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stock Forecast</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            {/* Current Stock Card */}
            <View style={[styles.horizontalCard, styles.projectionCard]}>
              <View style={[styles.cardIconContainer, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                <Ionicons name="cube" size={24} color="#6366f1" />
              </View>
              <Text style={styles.horizontalCardValue}>{currentStock}</Text>
              <Text style={styles.horizontalCardLabel}>Current Stock</Text>
              <Text style={styles.horizontalCardSubtext}>{unit}</Text>
            </View>

            {/* Monthly Usage Card */}
            <View style={[styles.horizontalCard, styles.projectionCard]}>
              <View style={[styles.cardIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                <Ionicons name="trending-up" size={24} color="#f59e0b" />
              </View>
              <Text style={styles.horizontalCardValue}>
                {formatNumber(analytics.summary.averageMonthlyUsage)}
              </Text>
              <Text style={styles.horizontalCardLabel}>Avg Monthly</Text>
              <Text style={styles.horizontalCardSubtext}>{unit}</Text>
            </View>

            {/* Months Remaining Card */}
            <View style={[styles.horizontalCard, styles.projectionCard]}>
              <View style={[styles.cardIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Ionicons name="calendar" size={24} color="#10b981" />
              </View>
              <Text style={[styles.horizontalCardValue, styles.projectionHighlight]}>
                {formatNumber(analytics.summary.estimatedMonthsRemaining)}
              </Text>
              <Text style={styles.horizontalCardLabel}>Months Left</Text>
              <Text style={styles.horizontalCardSubtext}>Estimated supply</Text>
            </View>
          </ScrollView>
        </View>

        {/* Usage History - Vertical List (stays vertical for better readability) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
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
                  <View style={[
                    styles.usageIconContainer,
                    index === 0 && styles.recentUsageIcon
                  ]}>
                    <Ionicons 
                      name="arrow-down" 
                      size={16} 
                      color={index === 0 ? "#ef4444" : "#94a3b8"} 
                    />
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
              <Text style={styles.emptyText}>No Activity This Month</Text>
              <Text style={styles.emptySubtext}>
                Usage records will appear here when this product is used
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? "#0f0f0f" : "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingCard: {
    backgroundColor: isDarkMode ? "#1a1a1a" : "#ffffff",
    padding: 40,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  loadingText: {
    fontSize: 16,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginTop: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorCard: {
    backgroundColor: isDarkMode ? "#1a1a1a" : "#ffffff",
    padding: 40,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  errorText: {
    fontSize: 16,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 4,
    paddingHorizontal: 20,
  },
  // Horizontal Scroll
  horizontalScroll: {
    marginHorizontal: 8,
  },
  horizontalScrollContent: {
    paddingHorizontal: 12,
    gap: 12,
  },
  // Horizontal Cards
  horizontalCard: {
    width: CARD_WIDTH,
    backgroundColor: isDarkMode ? "#1a1a1a" : "#ffffff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: isDarkMode ? "#2a2a2a" : "#f1f5f9",
  },
  projectionCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  horizontalCardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 4,
  },
  horizontalCardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 2,
  },
  horizontalCardSubtext: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontWeight: '500',
  },
  projectionHighlight: {
    color: '#10b981',
  },
  // Comparison Cards
  comparisonCard: {
    width: CARD_WIDTH * 0.8,
    backgroundColor: isDarkMode ? "#1a1a1a" : "#ffffff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: isDarkMode ? "#2a2a2a" : "#f1f5f9",
  },
  comparisonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  comparisonPeriod: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  trendIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comparisonValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 4,
  },
  comparisonUnit: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontWeight: 'normal',
  },
  comparisonChange: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  comparisonSubtext: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontWeight: '500',
  },
  // Badges
  periodBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  periodBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  historyCountBadge: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  historyCountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  // Usage History (Vertical)
  usageList: {
    gap: 12,
    paddingHorizontal: 20,
  },
  usageItem: {
    flexDirection: 'row',
    backgroundColor: isDarkMode ? "#1a1a1a" : "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? "#2a2a2a" : "#f1f5f9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  usageIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: isDarkMode ? "#2a2a2a" : "#f8fafc",
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? "#3a3a3a" : "#e2e8f0",
  },
  recentUsageIcon: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
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
  // Empty States
  emptyState: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: isDarkMode ? "#1a1a1a" : "#ffffff",
    marginHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: isDarkMode ? "#2a2a2a" : "#f1f5f9",
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