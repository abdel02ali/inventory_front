import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';

const { width: screenWidth } = Dimensions.get('window');

// Types remain the same as before
interface ReportSummary {
  timestamp: string;
  period: string;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  overview: {
    totalProducts: number;
    totalMovements: number;
    totalUsage: number;
    lowStockItems: number;
    outOfStockItems: number;
    totalDepartments: number;
    averageDailyUsage: number;
  };
  stockLevels: {
    totalProducts: number;
    totalStockValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    stockStatus: {
      out_of_stock: number;
      low_stock: number;
      medium_stock: number;
      high_stock: number;
    };
    categoryBreakdown: Array<{
      category: string;
      count: number;
      totalQuantity: number;
      lowStockCount: number;
      averageQuantity: number;
    }>;
    lowStockItems: Array<{
      id: string;
      name: string;
      category: string;
      quantity: number;
      unit: string;
      status: string;
    }>;
    outOfStockItems: Array<{
      id: string;
      name: string;
      category: string;
      quantity: number;
      unit: string;
    }>;
  };
  usageAnalytics: {
    totalUsage: number;
    averageDailyUsage: number;
    peakUsageDay: {
      day: string;
      usage: number;
    };
    usageByDay: Array<{
      date: string;
      usage: number;
    }>;
    usageByCategory: Array<{
      category: string;
      usage: number;
    }>;
    topUsedProducts: Array<{
      id: string;
      name: string;
      category: string;
      currentStock: number;
      monthlyUsage: number;
      averageDailyUsage: number;
      estimatedDaysRemaining: number | null;
      usageTrend: string;
    }>;
  };
  movementStatistics: {
    totalMovements: number;
    movementTypes: {
      stock_in: number;
      distribution: number;
      transfer: number;
      adjustment: number;
      stock_out: number | null;
    };
    dailyMovements: Array<{
      date: string;
      count: number;
    }>;
    monthlyTrend: Array<{
      month: string;
      count: number;
    }>;
    busiestDay: {
      day: string;
      count: number;
    };
    averageMovementsPerDay: number;
  };
  departmentUsage: {
    totalDepartments: number;
    totalProductsDistributed: number;
    departmentUsage: Record<string, any>;
    topDepartments: Array<{
      department: string;
      totalUsage: number;
      movementCount: number;
      averagePerMovement: number;
      topProducts: Array<{
        productId: string;
        productName: string;
        totalQuantity: number;
        unit: string;
      }>;
    }>;
  };
  productPerformance: {
    totalProducts: number;
    performanceMetrics: {
      highTurnover: Array<{
        id: string;
        name: string;
        category: string;
        currentStock: number;
        monthlyUsage: number;
        turnoverRate: number;
        estimatedDaysRemaining: number | null;
        usageTrend: string;
        stockStatus: string;
      }>;
      lowTurnover: Array<{
        id: string;
        name: string;
        category: string;
        currentStock: number;
        monthlyUsage: number;
        turnoverRate: number;
        estimatedDaysRemaining: number | null;
        usageTrend: string;
        stockStatus: string;
      }>;
      needsReordering: Array<{
        id: string;
        name: string;
        category: string;
        currentStock: number;
        monthlyUsage: number;
        turnoverRate: number;
        estimatedDaysRemaining: number | null;
        usageTrend: string;
        stockStatus: string;
      }>;
      seasonalVariation: any[];
    };
    categoryPerformance: Record<string, {
      totalProducts: number;
      totalUsage: number;
      averageStock: number;
      lowStockCount: number;
    }>;
  };
}

// API Service remains the same
const reportService = {
  async getSummary(period: string = 'month'): Promise<ReportSummary> {
    try {
      const response = await fetch(`http://192.168.0.178:3001/api/reports/summary?period=${period}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch reports');
      }

      return result.data;
    } catch (error) {
      console.error('API Error:', error);
      throw new Error('Failed to connect to server. Please check your connection.');
    }
  },
};

// Vibrant Color Palette
const colors = {
  primary: '#6366F1',
  secondary: '#8B5CF6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  dark: '#1F2937',
  light: '#F8FAFC',
  gradientStart: '#667eea',
  gradientEnd: '#764ba2',
  chartColors: [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', 
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
  ]
};

// Interactive Chart Configuration
const createChartConfig = (colorsArray?: string[]) => ({
  backgroundColor: 'transparent',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 0,
  color: (opacity = 1, index = 0) => {
    if (colorsArray && colorsArray[index]) {
      const hex = colorsArray[index];
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return `rgba(99, 102, 241, ${opacity})`;
  },
  labelColor: (opacity = 1) => `rgba(75, 85, 99, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '6',
    strokeWidth: '2',
    stroke: '#ffffff',
  },
  barPercentage: 0.8,
  useShadowColorFromDataset: true,
  fillShadowGradient: colors.primary,
  fillShadowGradientOpacity: 0.3,
  propsForLabels: {
    fontSize: 11,
    fontWeight: '600',
  },
  propsForVerticalLabels: {
    fontSize: 11,
    fontWeight: '600',
  },
});

// Animated Stat Card Component
const AnimatedStatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
  color: string;
  delay: number;
}> = ({ title, value, subtitle, icon, color, delay }) => {
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.animatedStatCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          borderLeftColor: color,
          shadowColor: color,
        },
      ]}
    >
      <View style={styles.statCardHeader}>
        <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
          <Text style={[styles.statIcon, { color }]}>{icon}</Text>
        </View>
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
    </Animated.View>
  );
};

// Gradient Section Header
const GradientSectionHeader: React.FC<{
  title: string;
  icon: string;
  color?: string;
}> = ({ title, icon, color = colors.primary }) => (
  <View style={styles.sectionHeader}>
    <View style={[styles.sectionIconContainer, { backgroundColor: color + '20' }]}>
      <Text style={[styles.sectionIcon, { color }]}>{icon}</Text>
    </View>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionLine} />
  </View>
);

// Interactive Period Selector
const PeriodSelector: React.FC<{
  period: string;
  onPeriodChange: (period: string) => void;
}> = ({ period, onPeriodChange }) => {
  const periods = [
    { value: 'today', label: 'Today', icon: '🕐' },
    { value: 'week', label: 'Week', icon: '📅' },
    { value: 'month', label: 'Month', icon: '🗓️' },
    { value: 'year', label: 'Year', icon: '📊' },
  ];

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.periodScrollContainer}
    >
      <View style={styles.periodContainer}>
        {periods.map((item) => (
          <TouchableOpacity
            key={item.value}
            style={[
              styles.periodButton,
              period === item.value && [styles.periodButtonActive, { backgroundColor: colors.primary }],
            ]}
            onPress={() => onPeriodChange(item.value)}
          >
            <Text style={styles.periodIcon}>{item.icon}</Text>
            <Text
              style={[
                styles.periodText,
                period === item.value && styles.periodTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

// Enhanced Overview Section
const OverviewSection: React.FC<{ 
  overview: ReportSummary['overview'];
  movementStats: ReportSummary['movementStatistics'];
}> = ({ overview, movementStats }) => {
  const stats = [
    {
      title: 'Total Products',
      value: overview.totalProducts,
      subtitle: `${overview.totalDepartments} departments`,
      icon: '📦',
      color: colors.info,
      delay: 100
    },
    {
      title: 'Movements',
      value: overview.totalMovements,
      subtitle: `${movementStats.averageMovementsPerDay.toFixed(1)} per day`,
      icon: '🔄',
      color: colors.secondary,
      delay: 200
    },
    {
      title: 'Total Usage',
      value: overview.totalUsage,
      subtitle: `${overview.averageDailyUsage.toFixed(1)} daily avg`,
      icon: '📈',
      color: colors.success,
      delay: 300
    },
    {
      title: 'Stock Alerts',
      value: overview.lowStockItems + overview.outOfStockItems,
      subtitle: `${overview.outOfStockItems} critical`,
      icon: '⚠️',
      color: colors.danger,
      delay: 400
    },
  ];

  return (
    <View style={styles.section}>
      <GradientSectionHeader title="Business Overview" icon="🚀" />
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsScrollContent}
      >
        {stats.map((stat, index) => (
          <AnimatedStatCard key={index} {...stat} />
        ))}
      </ScrollView>
    </View>
  );
};

// Interactive Stock Levels Section
const StockLevelsSection: React.FC<{ stockLevels: ReportSummary['stockLevels'] }> = ({ stockLevels }) => {
  const stockStatusData = [
    { name: 'High Stock', count: stockLevels.stockStatus.high_stock, color: colors.success, icon: '✅' },
    { name: 'Medium Stock', count: stockLevels.stockStatus.medium_stock, color: colors.info, icon: '📊' },
    { name: 'Low Stock', count: stockLevels.stockStatus.low_stock, color: colors.warning, icon: '⚠️' },
    { name: 'Out of Stock', count: stockLevels.stockStatus.out_of_stock, color: colors.danger, icon: '❌' },
  ];

  const barChartData = {
    labels: stockStatusData.map(item => item.name.split(' ')[0]),
    datasets: [{
      data: stockStatusData.map(item => item.count)
    }]
  };

  const stockColors = stockStatusData.map(item => item.color);

  return (
    <View style={styles.section}>
      <GradientSectionHeader title="Stock Health" icon="📊" color={colors.info} />
      
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Stock Status Overview</Text>
          <View style={styles.chartLegend}>
            {stockStatusData.map((item, index) => (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>{item.name}</Text>
              </View>
            ))}
          </View>
        </View>
        <BarChart
          data={barChartData}
          width={screenWidth - 48}
          height={240}
          chartConfig={createChartConfig(stockColors)}
          style={styles.chart}
          yAxisLabel=""
          yAxisSuffix=""
          showValuesOnTopOfBars={true}
          verticalLabelRotation={0}
          fromZero={true}
        />
      </View>
      
      {/* Enhanced Alerts */}
      {(stockLevels.lowStockItems.length > 0 || stockLevels.outOfStockItems.length > 0) && (
        <View style={styles.alertsContainer}>
          {stockLevels.outOfStockItems.length > 0 && (
            <View style={styles.alertSection}>
              <View style={styles.alertHeader}>
                <Text style={[styles.alertTitle, styles.criticalAlert]}>🚨 Critical Stock Issues</Text>
                <View style={[styles.alertBadge, styles.criticalBadge]}>
                  <Text style={styles.alertBadgeText}>{stockLevels.outOfStockItems.length}</Text>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.alertList}>
                  {stockLevels.outOfStockItems.map((item) => (
                    <View key={item.id} style={[styles.alertItem, styles.criticalAlertItem]}>
                      <Text style={styles.alertItemIcon}>❌</Text>
                      <View style={styles.alertItemContent}>
                        <Text style={styles.alertItemName}>{item.name}</Text>
                        <Text style={styles.alertItemCategory}>{item.category}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {stockLevels.lowStockItems.length > 0 && (
            <View style={styles.alertSection}>
              <View style={styles.alertHeader}>
                <Text style={[styles.alertTitle, styles.warningAlert]}>⚠️ Low Stock Warnings</Text>
                <View style={[styles.alertBadge, styles.warningBadge]}>
                  <Text style={styles.alertBadgeText}>{stockLevels.lowStockItems.length}</Text>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.alertList}>
                  {stockLevels.lowStockItems.map((item) => (
                    <View key={item.id} style={[styles.alertItem, styles.warningAlertItem]}>
                      <Text style={styles.alertItemIcon}>⚠️</Text>
                      <View style={styles.alertItemContent}>
                        <Text style={styles.alertItemName}>{item.name}</Text>
                        <Text style={styles.alertItemQuantity}>
                          Only {item.quantity} {item.unit} remaining
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

// Enhanced Usage Analytics Section
const UsageAnalyticsSection: React.FC<{ usageAnalytics: ReportSummary['usageAnalytics'] }> = ({
  usageAnalytics,
}) => {
  const usageByDayLabels = usageAnalytics.usageByDay.slice(0, 7).map(day => {
    const date = new Date(day.date);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  });
  const usageByDayValues = usageAnalytics.usageByDay.slice(0, 7).map(day => day.usage);
  
  const usageByDayData = {
    labels: usageByDayLabels,
    datasets: [{
      data: usageByDayValues
    }]
  };

  const usageByCategoryLabels = usageAnalytics.usageByCategory.slice(0, 6).map(cat => cat.category);
  const usageByCategoryValues = usageAnalytics.usageByCategory.slice(0, 6).map(cat => cat.usage);
  
  const categoryColors = colors.chartColors.slice(0, 6);
  const usageByCategoryData = {
    labels: usageByCategoryLabels.map(label => label.length > 8 ? label.substring(0, 8) + '..' : label),
    datasets: [{
      data: usageByCategoryValues
    }]
  };

  return (
    <View style={styles.section}>
      <GradientSectionHeader title="Usage Analytics" icon="📈" color={colors.success} />
      
      <View style={styles.statsGrid}>
        <View style={[styles.statBox, { backgroundColor: colors.primary + '10' }]}>
          <Text style={[styles.statBoxValue, { color: colors.primary }]}>{usageAnalytics.totalUsage}</Text>
          <Text style={styles.statBoxLabel}>Total Usage</Text>
          <Text style={styles.statBoxTrend}>📊 Overall</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.success + '10' }]}>
          <Text style={[styles.statBoxValue, { color: colors.success }]}>{usageAnalytics.averageDailyUsage.toFixed(1)}</Text>
          <Text style={styles.statBoxLabel}>Avg Daily</Text>
          <Text style={styles.statBoxTrend}>📅 Per Day</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.warning + '10' }]}>
          <Text style={[styles.statBoxValue, { color: colors.warning }]}>{usageAnalytics.peakUsageDay?.usage || 0}</Text>
          <Text style={styles.statBoxLabel}>Peak Day</Text>
          <Text style={styles.statBoxTrend}>🔥 Highest</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>📈 Daily Usage Trend</Text>
            <LineChart
              data={usageByDayData}
              width={Math.max(screenWidth - 48, usageByDayLabels.length * 70)}
              height={240}
              chartConfig={createChartConfig([colors.primary])}
              bezier
              style={styles.chart}
              verticalLabelRotation={30}
              withInnerLines={true}
              withVerticalLines={true}
            />
          </View>

          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>🏷️ Usage by Category</Text>
            <BarChart
              data={usageByCategoryData}
              width={Math.max(screenWidth - 48, usageByCategoryLabels.length * 70)}
              height={240}
              chartConfig={createChartConfig(categoryColors)}
              verticalLabelRotation={30}
              style={styles.chart}
              yAxisLabel=""
              yAxisSuffix=""
              showValuesOnTopOfBars={true}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// Main Component with enhanced design
const ReportsSummaryScreen: React.FC = () => {
  const [reportData, setReportData] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>('');
  const [period, setPeriod] = useState<string>('month');

  useEffect(() => {
    loadReportData();
  }, [period]);

  const loadReportData = async () => {
    try {
      setError('');
      const data = await reportService.getSummary(period);
      setReportData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load reports';
      setError(errorMessage);
      console.error('Load report error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadReportData();
  };

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    setLoading(true);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>📊 Loading Analytics...</Text>
        <Text style={styles.loadingSubtext}>Crunching the numbers for you</Text>
      </View>
    );
  }

  if (error && !reportData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>📡</Text>
        <Text style={styles.errorText}>Connection Lost</Text>
        <Text style={styles.errorDescription}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadReportData}>
          <Text style={styles.retryButtonText}>🔄 Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Analytics Dashboard</Text>
            <Text style={styles.subtitle}>Real-time insights & performance metrics</Text>
          </View>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>LIVE</Text>
          </View>
        </View>
        <PeriodSelector period={period} onPeriodChange={handlePeriodChange} />
      </View>

      {reportData ? (
        <>
          <OverviewSection 
            overview={reportData.overview} 
            movementStats={reportData.movementStatistics} 
          />

          <StockLevelsSection stockLevels={reportData.stockLevels} />

          <UsageAnalyticsSection usageAnalytics={reportData.usageAnalytics} />

          {/* Enhanced Footer */}
          <View style={styles.footer}>
            <View style={styles.footerContent}>
              <Text style={styles.footerText}>
                🕒 Last updated: {new Date(reportData.timestamp).toLocaleString()}
              </Text>
              <Text style={styles.footerSubtext}>
                📅 Period: {reportData.period.charAt(0).toUpperCase() + reportData.period.slice(1)}
              </Text>
            </View>
          </View>
        </>
      ) : (
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>📊</Text>
          <Text style={styles.errorText}>No Data Available</Text>
          <Text style={styles.errorDescription}>
            Unable to load analytics data at the moment.
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

// Modern, Interactive Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: colors.dark,
    fontWeight: '600',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 32,
  },
  errorText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    marginBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  headerBadge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.success + '40',
  },
  headerBadgeText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Period Selector
  periodScrollContainer: {
    marginHorizontal: -4,
  },
  periodContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  periodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    marginHorizontal: 4,
    backgroundColor: '#f8fafc',
  },
  periodButtonActive: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  periodIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  periodTextActive: {
    color: '#ffffff',
  },
  // Sections
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionIcon: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.dark,
    flex: 1,
  },
  sectionLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#f1f5f9',
    marginLeft: 12,
  },
  // Animated Stat Cards
  statsScrollContent: {
    paddingRight: 8,
  },
  animatedStatCard: {
    width: 180,
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 20,
    marginRight: 16,
    borderLeftWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.dark,
  },
  statTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 18,
  },
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statBoxValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statBoxLabel: {
    fontSize: 14,
    color: colors.dark,
    fontWeight: '600',
    marginBottom: 4,
  },
  statBoxTrend: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  // Charts
  chartContainer: {
    marginBottom: 24,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.dark,
  },
  chartLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  chart: {
    borderRadius: 20,
    paddingRight: 0,
    marginLeft: -10,
  },
  // Enhanced Alerts
  alertsContainer: {
    gap: 20,
  },
  alertSection: {
    marginTop: 8,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 0,
  },
  criticalAlert: {
    color: colors.danger,
  },
  warningAlert: {
    color: colors.warning,
  },
  alertBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  criticalBadge: {
    backgroundColor: colors.danger + '20',
  },
  warningBadge: {
    backgroundColor: colors.warning + '20',
  },
  alertBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.danger,
  },
  alertList: {
    flexDirection: 'row',
    gap: 12,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 16,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  criticalAlertItem: {
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },
  warningAlertItem: {
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  alertItemIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  alertItemContent: {
    flex: 1,
  },
  alertItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: 2,
  },
  alertItemCategory: {
    fontSize: 12,
    color: '#64748b',
  },
  alertItemQuantity: {
    fontSize: 12,
    color: '#64748b',
  },
  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  footerContent: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  centered: {
    alignItems: 'center',
    padding: 32,
  },
});

export default ReportsSummaryScreen;