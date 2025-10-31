import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';

const { width: screenWidth } = Dimensions.get('window');

// Updated Types - made dateRange optional
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

// Real API Service
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

// Modern Chart Configuration with proper colors
const createChartConfig = (colors?: string[]) => ({
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(75, 85, 99, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#3B82F6'
  },
  barPercentage: 0.7,
  useShadowColorFromDataset: false,
  fillShadowGradient: '#3B82F6',
  fillShadowGradientOpacity: 1,
  propsForLabels: {
    fontSize: 10,
  },
  propsForVerticalLabels: {
    fontSize: 10,
  },
  // Bar colors configuration
  ...(colors && {
    barColors: colors
  })
});

// Utility function to safely truncate labels
const truncateLabel = (label: string, maxLength: number = 8): string => {
  if (!label) return '';
  return label.length > maxLength ? label.substring(0, maxLength) + '..' : label;
};

// Utility function to safely get chart data with colors
const getChartData = (labels: string[], data: number[], colors?: string[]) => {
  const chartData = {
    labels: labels.map(label => truncateLabel(label)),
    datasets: [{
      data: data
    }]
  };

  if (colors) {
    return {
      ...chartData,
      colors: colors.map(color => ({ opacity: 1 }))
    };
  }

  return chartData;
};

// Utility Components
const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
  color: string;
}> = ({ title, value, subtitle, icon, color }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <View style={styles.statHeader}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
    <Text style={styles.statTitle}>{title}</Text>
    <Text style={styles.statSubtitle}>{subtitle}</Text>
  </View>
);

const SectionHeader: React.FC<{
  title: string;
  icon: string;
}> = ({ title, icon }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionIcon}>{icon}</Text>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

// Main Component Sections
const PeriodSelector: React.FC<{
  period: string;
  onPeriodChange: (period: string) => void;
}> = ({ period, onPeriodChange }) => {
  const periods = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'year', label: 'Year' },
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
              period === item.value && styles.periodButtonActive,
            ]}
            onPress={() => onPeriodChange(item.value)}
          >
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

const OverviewSection: React.FC<{ 
  overview: ReportSummary['overview'];
  movementStats: ReportSummary['movementStatistics'];
}> = ({ overview, movementStats }) => {
  const stats = [
    {
      title: 'Total Products',
      value: overview.totalProducts,
      subtitle: `${overview.totalDepartments} depts`,
      icon: '📦',
      color: '#3B82F6'
    },
    {
      title: 'Movements',
      value: overview.totalMovements,
      subtitle: `${movementStats.averageMovementsPerDay.toFixed(1)}/day`,
      icon: '🔄',
      color: '#10B981'
    },
    {
      title: 'Total Usage',
      value: overview.totalUsage,
      subtitle: `${overview.averageDailyUsage.toFixed(1)}/day`,
      icon: '📊',
      color: '#8B5CF6'
    },
    {
      title: 'Stock Alerts',
      value: overview.lowStockItems + overview.outOfStockItems,
      subtitle: `${overview.outOfStockItems} out of stock`,
      icon: '⚠️',
      color: '#F59E0B'
    },
  ];

  return (
    <View style={styles.section}>
      <SectionHeader title="Overview" icon="📈" />
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsScrollContent}
      >
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </ScrollView>
    </View>
  );
};

const StockLevelsSection: React.FC<{ stockLevels: ReportSummary['stockLevels'] }> = ({ stockLevels }) => {
  const stockStatusData = [
    {
      name: 'High',
      count: stockLevels.stockStatus.high_stock,
      color: '#10B981',
    },
    {
      name: 'Medium',
      count: stockLevels.stockStatus.medium_stock,
      color: '#3B82F6',
    },
    {
      name: 'Low',
      count: stockLevels.stockStatus.low_stock,
      color: '#F59E0B',
    },
    {
      name: 'Out',
      count: stockLevels.stockStatus.out_of_stock,
      color: '#EF4444',
    },
  ];

  const barChartData = {
    labels: stockStatusData.map(item => item.name),
    datasets: [{
      data: stockStatusData.map(item => item.count)
    }],
    colors: stockStatusData.map(item => item.color)
  };

  return (
    <View style={styles.section}>
      <SectionHeader title="Stock Levels" icon="📊" />
      
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Stock Status Distribution</Text>
        <BarChart
          data={barChartData}
          width={screenWidth - 48}
          height={220}
          chartConfig={createChartConfig()}
          style={styles.chart}
          yAxisLabel=""
          yAxisSuffix=""
          showValuesOnTopOfBars={true}
          verticalLabelRotation={0}
          fromZero={true}
        />
      </View>
      
      {/* Stock Alerts */}
      {(stockLevels.lowStockItems.length > 0 || stockLevels.outOfStockItems.length > 0) && (
        <View style={styles.alertsContainer}>
          {stockLevels.outOfStockItems.length > 0 && (
            <View style={styles.alertSection}>
              <Text style={[styles.alertTitle, styles.criticalAlert]}>❌ Out of Stock</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.alertList}>
                  {stockLevels.outOfStockItems.map((item) => (
                    <View key={item.id} style={[styles.alertItem, styles.criticalAlertItem]}>
                      <Text style={styles.alertItemName}>{item.name}</Text>
                      <Text style={styles.alertItemCategory}>{item.category}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {stockLevels.lowStockItems.length > 0 && (
            <View style={styles.alertSection}>
              <Text style={[styles.alertTitle, styles.warningAlert]}>⚠️ Low Stock</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.alertList}>
                  {stockLevels.lowStockItems.map((item) => (
                    <View key={item.id} style={[styles.alertItem, styles.warningAlertItem]}>
                      <Text style={styles.alertItemName}>{item.name}</Text>
                      <Text style={styles.alertItemQuantity}>
                        {item.quantity} {item.unit} left
                      </Text>
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

const UsageAnalyticsSection: React.FC<{ usageAnalytics: ReportSummary['usageAnalytics'] }> = ({
  usageAnalytics,
}) => {
  // Prepare data for usage by day chart
  const usageByDayLabels = usageAnalytics.usageByDay.slice(0, 7).map(day => {
    const date = new Date(day.date);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  });
  const usageByDayValues = usageAnalytics.usageByDay.slice(0, 7).map(day => day.usage);
  
  const usageByDayData = getChartData(usageByDayLabels, usageByDayValues);

  // Prepare data for usage by category chart
  const usageByCategoryLabels = usageAnalytics.usageByCategory.slice(0, 6).map(cat => cat.category);
  const usageByCategoryValues = usageAnalytics.usageByCategory.slice(0, 6).map(cat => cat.usage);
  
  const categoryColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
  const usageByCategoryData = {
    labels: usageByCategoryLabels.map(label => truncateLabel(label)),
    datasets: [{
      data: usageByCategoryValues
    }],
    colors: categoryColors.slice(0, usageByCategoryLabels.length)
  };

  return (
    <View style={styles.section}>
      <SectionHeader title="Usage Analytics" icon="📈" />
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScrollContent}>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statBoxValue}>{usageAnalytics.totalUsage}</Text>
            <Text style={styles.statBoxLabel}>Total Usage</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statBoxValue}>{usageAnalytics.averageDailyUsage.toFixed(1)}</Text>
            <Text style={styles.statBoxLabel}>Avg Daily</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statBoxValue}>{usageAnalytics.peakUsageDay?.usage || 0}</Text>
            <Text style={styles.statBoxLabel}>Peak Day</Text>
          </View>
        </View>
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Daily Usage Trend</Text>
            <LineChart
              data={usageByDayData}
              width={Math.max(screenWidth - 48, usageByDayLabels.length * 60)}
              height={220}
              chartConfig={createChartConfig()}
              bezier
              style={styles.chart}
              verticalLabelRotation={30}
            />
          </View>

          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Usage by Category</Text>
            <BarChart
              data={usageByCategoryData}
              width={Math.max(screenWidth - 48, usageByCategoryLabels.length * 60)}
              height={220}
              chartConfig={createChartConfig()}
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

const MovementStatisticsSection: React.FC<{ movementStats: ReportSummary['movementStatistics'] }> = ({
  movementStats,
}) => {
  const movementLabels = ['Stock In', 'Distribution', 'Transfer', 'Adjustment'];
  const movementValues = [
    movementStats.movementTypes.stock_in,
    movementStats.movementTypes.distribution,
    movementStats.movementTypes.transfer,
    movementStats.movementTypes.adjustment
  ];

  const movementColors = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6'];
  const movementData = {
    labels: movementLabels,
    datasets: [{
      data: movementValues
    }],
    colors: movementColors
  };

  return (
    <View style={styles.section}>
      <SectionHeader title="Movement Statistics" icon="🚚" />
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScrollContent}>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statBoxValue}>{movementStats.totalMovements}</Text>
            <Text style={styles.statBoxLabel}>Total</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statBoxValue}>{movementStats.averageMovementsPerDay.toFixed(1)}</Text>
            <Text style={styles.statBoxLabel}>Per Day</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statBoxValue}>{movementStats.busiestDay?.count || 0}</Text>
            <Text style={styles.statBoxLabel}>Busiest Day</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Movement Types</Text>
        <BarChart
          data={movementData}
          width={screenWidth - 48}
          height={220}
          chartConfig={createChartConfig()}
          style={styles.chart}
          yAxisLabel=""
          yAxisSuffix=""
          showValuesOnTopOfBars={true}
          verticalLabelRotation={0}
        />
      </View>
    </View>
  );
};

const DepartmentUsageSection: React.FC<{ departmentUsage: ReportSummary['departmentUsage'] }> = ({
  departmentUsage,
}) => {
  const getDepartmentName = (departmentString: string): string => {
    if (!departmentString) return 'Unknown';
    if (departmentString.includes("'name':")) {
      const match = departmentString.match(/'name':\s*'([^']*)'/);
      return match ? match[1] : departmentString;
    }
    return departmentString;
  };

  const departmentData = departmentUsage.topDepartments.slice(0, 6).map(dept => ({
    name: getDepartmentName(dept.department),
    usage: dept.totalUsage,
    color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`
  }));

  const departmentLabels = departmentData.map(dept => dept.name);
  const departmentValues = departmentData.map(dept => dept.usage);
  const departmentColors = departmentData.map(dept => dept.color);

  const barChartData = {
    labels: departmentLabels.map(label => truncateLabel(label, 10)),
    datasets: [{
      data: departmentValues
    }],
    colors: departmentColors
  };

  return (
    <View style={styles.section}>
      <SectionHeader title="Department Usage" icon="🏢" />
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Usage by Department</Text>
            <BarChart
              data={barChartData}
              width={Math.max(screenWidth - 48, departmentData.length * 80)}
              height={220}
              chartConfig={createChartConfig()}
              style={styles.chart}
              yAxisLabel=""
              yAxisSuffix=""
              showValuesOnTopOfBars={true}
              verticalLabelRotation={30}
            />
          </View>
        </View>
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.departmentList}>
          {departmentData.map((dept, index) => (
            <View key={index} style={styles.departmentItem}>
              <View style={styles.departmentInfo}>
                <View style={[styles.colorDot, { backgroundColor: dept.color }]} />
                <Text style={styles.departmentName} numberOfLines={2}>
                  {dept.name}
                </Text>
              </View>
              <Text style={styles.departmentUsage}>{dept.usage} units</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const TopProductsSection: React.FC<{ usageAnalytics: ReportSummary['usageAnalytics'] }> = ({
  usageAnalytics,
}) => {
  const topProducts = usageAnalytics.topUsedProducts.slice(0, 8);

  const productLabels = topProducts.map(product => product.name);
  const productValues = topProducts.map(product => product.monthlyUsage);
  
  const productColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
  const productData = {
    labels: productLabels.map(label => truncateLabel(label, 12)),
    datasets: [{
      data: productValues
    }],
    colors: productColors.slice(0, productLabels.length)
  };

  return (
    <View style={styles.section}>
      <SectionHeader title="Top Products" icon="🏆" />
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Monthly Usage</Text>
            <BarChart
              data={productData}
              width={Math.max(screenWidth - 48, topProducts.length * 60)}
              height={220}
              chartConfig={createChartConfig()}
              verticalLabelRotation={45}
              style={styles.chart}
              yAxisLabel=""
              yAxisSuffix=""
              showValuesOnTopOfBars={true}
            />
          </View>
        </View>
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.productsList}>
          {topProducts.map((product, index) => (
            <View key={product.id} style={styles.productItem}>
              <View style={styles.productRank}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productDetails}>
                  {product.monthlyUsage} units • {product.currentStock} in stock
                </Text>
              </View>
              <View style={styles.productStats}>
                <Text style={styles.daysRemaining}>
                  {product.estimatedDaysRemaining !== null ? `${product.estimatedDaysRemaining}d` : '∞'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

// Main Component
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
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    );
  }

  if (error && !reportData) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>Connection Error</Text>
        <Text style={styles.errorDescription}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadReportData}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Analytics Dashboard</Text>
          <Text style={styles.subtitle}>Inventory Reports & Insights</Text>
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

          <MovementStatisticsSection movementStats={reportData.movementStatistics} />

          <DepartmentUsageSection departmentUsage={reportData.departmentUsage} />

          <TopProductsSection usageAnalytics={reportData.usageAnalytics} />

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Last updated: {new Date(reportData.timestamp).toLocaleString()}
            </Text>
            <Text style={styles.footerSubtext}>
              Period: {reportData.period}
            </Text>
          </View>
        </>
      ) : (
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>📊</Text>
          <Text style={styles.errorText}>No Data Available</Text>
          <Text style={styles.errorDescription}>
            Unable to load report data from the server.
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

// Modern Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    marginBottom: 24,
  },
  headerTextContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  // Period Selector
  periodScrollContainer: {
    marginHorizontal: -4,
  },
  periodContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  periodButtonActive: {
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
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
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  // Stats Grid
  statsScrollContent: {
    paddingRight: 8,
  },
  statCard: {
    width: 160,
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 16,
    marginRight: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    fontSize: 24,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  statTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    backgroundColor: '#f1f5f9',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statBoxValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 8,
  },
  statBoxLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  // Charts
  chartContainer: {
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
  },
  chart: {
    borderRadius: 16,
    paddingRight: 0,
    marginLeft: -10,
  },
  // Alerts
  alertsContainer: {
    gap: 16,
  },
  alertSection: {
    marginTop: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  criticalAlert: {
    color: '#dc2626',
  },
  warningAlert: {
    color: '#d97706',
  },
  alertList: {
    flexDirection: 'row',
    gap: 12,
  },
  alertItem: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  criticalAlertItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  warningAlertItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#d97706',
  },
  alertItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  alertItemCategory: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  alertItemQuantity: {
    fontSize: 12,
    color: '#64748b',
  },
  // Department List
  departmentList: {
    flexDirection: 'row',
    gap: 12,
  },
  departmentItem: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  departmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  departmentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
    flex: 1,
  },
  departmentUsage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3B82F6',
    textAlign: 'center',
  },
  // Products List
  productsList: {
    flexDirection: 'row',
    gap: 12,
  },
  productItem: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  productRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  rankText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  productInfo: {
    flex: 1,
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  productDetails: {
    fontSize: 14,
    color: '#64748b',
  },
  productStats: {
    alignItems: 'flex-end',
  },
  daysRemaining: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
  },
  footerText: {
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default ReportsSummaryScreen;