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
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';

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

// Chart configuration
const chartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#007AFF'
  },
  // Add these required props for BarChart
  barPercentage: 0.6,
  useShadowColorFromDataset: false,
  fillShadowGradient: '#007AFF',
  fillShadowGradientOpacity: 1,
};

const pieChartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
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
      color: '#007AFF'
    },
    {
      title: 'Movements',
      value: overview.totalMovements,
      subtitle: `${movementStats.averageMovementsPerDay.toFixed(1)}/day`,
      icon: '🔄',
      color: '#28a745'
    },
    {
      title: 'Total Usage',
      value: overview.totalUsage,
      subtitle: `${overview.averageDailyUsage.toFixed(1)}/day`,
      icon: '📊',
      color: '#6f42c1'
    },
    {
      title: 'Stock Alerts',
      value: overview.lowStockItems + overview.outOfStockItems,
      subtitle: `${overview.outOfStockItems} out of stock`,
      icon: '⚠️',
      color: '#fd7e14'
    },
  ];

  return (
    <View style={styles.section}>
      <SectionHeader title="Overview" icon="📈" />
      <View style={styles.statsGrid}>
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </View>
    </View>
  );
};

const StockLevelsSection: React.FC<{ stockLevels: ReportSummary['stockLevels'] }> = ({ stockLevels }) => {
  const stockData = [
    {
      name: 'High Stock',
      population: stockLevels.stockStatus.high_stock,
      color: '#28a745',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
    {
      name: 'Medium Stock',
      population: stockLevels.stockStatus.medium_stock,
      color: '#17a2b8',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
    {
      name: 'Low Stock',
      population: stockLevels.stockStatus.low_stock,
      color: '#ffc107',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
    {
      name: 'Out of Stock',
      population: stockLevels.stockStatus.out_of_stock,
      color: '#dc3545',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
  ];

  return (
    <View style={styles.section}>
      <SectionHeader title="Stock Levels" icon="📊" />
      <View style={styles.chartContainer}>
        <PieChart
          data={stockData}
          width={screenWidth - 48}
          height={180}
          chartConfig={pieChartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
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
  const usageByDayData = {
    labels: usageAnalytics.usageByDay.slice(0, 7).map(day => {
      const date = new Date(day.date);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    }),
    datasets: [{
      data: usageAnalytics.usageByDay.slice(0, 7).map(day => day.usage)
    }]
  };

  // Prepare data for usage by category chart
  const usageByCategoryData = {
    labels: usageAnalytics.usageByCategory.slice(0, 5).map(cat => 
      cat.category.length > 8 ? cat.category.substring(0, 8) + '...' : cat.category
    ),
    datasets: [{
      data: usageAnalytics.usageByCategory.slice(0, 5).map(cat => cat.usage)
    }]
  };

  return (
    <View style={styles.section}>
      <SectionHeader title="Usage Analytics" icon="📈" />
      
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

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Daily Usage Trend</Text>
        <LineChart
          data={usageByDayData}
          width={screenWidth - 48}
          height={200}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
      </View>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Usage by Category</Text>
        <BarChart
          data={usageByCategoryData}
          width={screenWidth - 48}
          height={200}
          chartConfig={chartConfig}
          verticalLabelRotation={30}
          style={styles.chart}
          yAxisLabel=""
          yAxisSuffix=""
          showValuesOnTopOfBars={true}
        />
      </View>
    </View>
  );
};

const MovementStatisticsSection: React.FC<{ movementStats: ReportSummary['movementStatistics'] }> = ({
  movementStats,
}) => {
  const movementData = {
    labels: ['Stock In', 'Distribution', 'Transfer', 'Adjustment'],
    datasets: [{
      data: [
        movementStats.movementTypes.stock_in,
        movementStats.movementTypes.distribution,
        movementStats.movementTypes.transfer,
        movementStats.movementTypes.adjustment
      ]
    }]
  };

  return (
    <View style={styles.section}>
      <SectionHeader title="Movement Statistics" icon="🚚" />
      
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

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Movement Types</Text>
        <BarChart
          data={movementData}
          width={screenWidth - 48}
          height={200}
          chartConfig={chartConfig}
          style={styles.chart}
          yAxisLabel=""
          yAxisSuffix=""
          showValuesOnTopOfBars={true}
        />
      </View>
    </View>
  );
};

const DepartmentUsageSection: React.FC<{ departmentUsage: ReportSummary['departmentUsage'] }> = ({
  departmentUsage,
}) => {
  const getDepartmentName = (departmentString: string) => {
    if (departmentString.includes("'name':")) {
      const match = departmentString.match(/'name':\s*'([^']*)'/);
      return match ? match[1] : departmentString;
    }
    return departmentString;
  };

  const departmentData = departmentUsage.topDepartments.slice(0, 5).map(dept => ({
    name: getDepartmentName(dept.department),
    usage: dept.totalUsage,
    color: `#${Math.floor(Math.random()*16777215).toString(16)}`
  }));

  const pieData = departmentData.map((dept, index) => ({
    name: dept.name,
    population: dept.usage,
    color: dept.color,
    legendFontColor: '#7F7F7F',
    legendFontSize: 10,
  }));

  return (
    <View style={styles.section}>
      <SectionHeader title="Department Usage" icon="🏢" />
      
      <View style={styles.chartContainer}>
        <PieChart
          data={pieData}
          width={screenWidth - 48}
          height={180}
          chartConfig={pieChartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
        />
      </View>

      <View style={styles.departmentList}>
        {departmentData.map((dept, index) => (
          <View key={index} style={styles.departmentItem}>
            <View style={styles.departmentInfo}>
              <View style={[styles.colorDot, { backgroundColor: dept.color }]} />
              <Text style={styles.departmentName} numberOfLines={1}>
                {dept.name}
              </Text>
            </View>
            <Text style={styles.departmentUsage}>{dept.usage} units</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const TopProductsSection: React.FC<{ usageAnalytics: ReportSummary['usageAnalytics'] }> = ({
  usageAnalytics,
}) => {
  const topProducts = usageAnalytics.topUsedProducts.slice(0, 5);

  const productData = {
    labels: topProducts.map(product => 
      product.name.length > 10 ? product.name.substring(0, 10) + '...' : product.name
    ),
    datasets: [{
      data: topProducts.map(product => product.monthlyUsage)
    }]
  };

  return (
    <View style={styles.section}>
      <SectionHeader title="Top Products" icon="🏆" />
      
      <View style={styles.chartContainer}>
        <BarChart
          data={productData}
          width={screenWidth - 48}
          height={200}
          chartConfig={chartConfig}
          verticalLabelRotation={30}
          style={styles.chart}
          yAxisLabel=""
          yAxisSuffix=""
          showValuesOnTopOfBars={true}
        />
      </View>

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
        <ActivityIndicator size="large" color="#007AFF" />
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
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
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
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#007AFF',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  // Period Selector
  periodContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  periodText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  periodTextActive: {
    color: '#ffffff',
  },
  // Sections
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (screenWidth - 72) / 2,
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 20,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statBoxValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statBoxLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  // Charts
  chartContainer: {
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  chart: {
    borderRadius: 16,
    paddingRight: 0,
  },
  // Alerts
  alertsContainer: {
    gap: 12,
  },
  alertSection: {
    marginTop: 8,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  criticalAlert: {
    color: '#dc2626',
  },
  warningAlert: {
    color: '#d97706',
  },
  alertList: {
    flexDirection: 'row',
  },
  alertItem: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
    minWidth: 140,
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
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  alertItemCategory: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 2,
  },
  alertItemQuantity: {
    fontSize: 11,
    color: '#64748b',
  },
  // Department List
  departmentList: {
    gap: 8,
  },
  departmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
  },
  departmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  // Products List
  productsList: {
    gap: 8,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
  },
  productRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  productDetails: {
    fontSize: 12,
    color: '#64748b',
  },
  productStats: {
    alignItems: 'flex-end',
  },
  daysRemaining: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
  },
  footerSubtext: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
});

export default ReportsSummaryScreen;