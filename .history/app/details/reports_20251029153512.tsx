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

// Utility Components
const ProgressBar: React.FC<{ percentage: number; color?: string }> = ({ 
  percentage, 
  color = '#007AFF' 
}) => (
  <View style={styles.progressBarContainer}>
    <View 
      style={[
        styles.progressBarFill, 
        { width: `${Math.min(percentage, 100)}%`, backgroundColor: color }
      ]} 
    />
  </View>
);

const TrendIndicator: React.FC<{ trend: string }> = ({ trend }) => {
  const getTrendConfig = () => {
    switch (trend) {
      case 'significant_increase':
      case 'increasing':
        return { icon: '📈', color: '#28a745', label: 'High Usage' };
      case 'significant_decrease':
      case 'decreasing':
        return { icon: '📉', color: '#dc3545', label: 'Low Usage' };
      default:
        return { icon: '➡️', color: '#6c757d', label: 'Stable' };
    }
  };

  const config = getTrendConfig();

  return (
    <View style={[styles.trendContainer, { backgroundColor: `${config.color}15` }]}>
      <Text style={[styles.trendText, { color: config.color }]}>
        {config.icon} {config.label}
      </Text>
    </View>
  );
};

// Empty State Components
const EmptyState: React.FC<{ 
  title: string; 
  message: string;
  icon?: string;
}> = ({ title, message, icon = '📊' }) => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyStateIcon}>{icon}</Text>
    <Text style={styles.emptyStateTitle}>{title}</Text>
    <Text style={styles.emptyStateMessage}>{message}</Text>
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

const OverviewCards: React.FC<{ 
  overview: ReportSummary['overview'];
  movementStats: ReportSummary['movementStatistics'];
}> = ({ overview, movementStats }) => {
  const cards = [
    {
      label: 'Total Products',
      value: overview.totalProducts,
      icon: '📦',
      color: '#007AFF',
      subtitle: `${overview.totalDepartments} departments`,
    },
    {
      label: 'Total Movements',
      value: overview.totalMovements,
      icon: '🚚',
      color: '#28a745',
      subtitle: `${movementStats.averageMovementsPerDay.toFixed(1)}/day`,
    },
    {
      label: 'Total Usage',
      value: overview.totalUsage,
      icon: '📊',
      color: '#6f42c1',
      subtitle: `${overview.averageDailyUsage.toFixed(1)}/day`,
    },
    {
      label: 'Stock Alerts',
      value: overview.lowStockItems + overview.outOfStockItems,
      icon: '⚠️',
      color: '#fd7e14',
      subtitle: `${overview.outOfStockItems} out of stock`,
    },
  ];

  return (
    <View style={styles.overviewContainer}>
      {cards.map((card, index) => (
        <View key={index} style={styles.card}>
          <View style={[styles.cardIcon, { backgroundColor: card.color }]}>
            <Text style={styles.cardIconText}>{card.icon}</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardValue}>{card.value}</Text>
            <Text style={styles.cardLabel}>{card.label}</Text>
            <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const StockLevelsCard: React.FC<{ stockLevels: ReportSummary['stockLevels'] }> = ({ stockLevels }) => {
  const statusItems = [
    {
      label: 'High Stock',
      count: stockLevels.stockStatus.high_stock,
      color: '#28a745',
      bgColor: '#d4edda',
    },
    {
      label: 'Medium Stock',
      count: stockLevels.stockStatus.medium_stock,
      color: '#17a2b8',
      bgColor: '#d1ecf1',
    },
    {
      label: 'Low Stock',
      count: stockLevels.stockStatus.low_stock,
      color: '#ffc107',
      bgColor: '#fff3cd',
    },
    {
      label: 'Out of Stock',
      count: stockLevels.stockStatus.out_of_stock,
      color: '#dc3545',
      bgColor: '#f8d7da',
    },
  ];

  return (
    <View style={styles.reportCard}>
      <Text style={styles.cardTitle}>📊 Stock Levels</Text>
      
      <View style={styles.statusContainer}>
        {statusItems.map((item, index) => (
          <View key={index} style={[styles.statusItem, { backgroundColor: item.bgColor }]}>
            <Text style={[styles.statusCount, { color: item.color }]}>
              {item.count}
            </Text>
            <Text style={styles.statusLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Stock Alerts */}
      {(stockLevels.lowStockItems.length > 0 || stockLevels.outOfStockItems.length > 0) && (
        <View style={styles.alertsContainer}>
          {stockLevels.outOfStockItems.length > 0 && (
            <View style={styles.alertSection}>
              <Text style={[styles.alertSectionTitle, styles.criticalAlert]}>❌ Out of Stock</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.alertList}>
                  {stockLevels.outOfStockItems.map((item) => (
                    <View key={item.id} style={[styles.alertItem, styles.criticalAlertItem]}>
                      <Text style={styles.alertItemName}>{item.name}</Text>
                      <Text style={styles.alertItemCategory}>{item.category}</Text>
                      <Text style={styles.alertItemQuantity}>Out of stock</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {stockLevels.lowStockItems.length > 0 && (
            <View style={styles.alertSection}>
              <Text style={[styles.alertSectionTitle, styles.warningAlert]}>⚠️ Low Stock</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.alertList}>
                  {stockLevels.lowStockItems.map((item) => (
                    <View key={item.id} style={[styles.alertItem, styles.warningAlertItem]}>
                      <Text style={styles.alertItemName}>{item.name}</Text>
                      <Text style={styles.alertItemCategory}>{item.category}</Text>
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

const UsageAnalyticsCard: React.FC<{ usageAnalytics: ReportSummary['usageAnalytics'] }> = ({
  usageAnalytics,
}) => {
  return (
    <View style={styles.reportCard}>
      <Text style={styles.cardTitle}>📈 Usage Analytics</Text>
      
      <View style={styles.usageStats}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Usage:</Text>
          <Text style={styles.statValue}>
            {usageAnalytics.totalUsage} units
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Avg Daily Usage:</Text>
          <Text style={styles.statValue}>
            {usageAnalytics.averageDailyUsage.toFixed(1)} units/day
          </Text>
        </View>
        {usageAnalytics.peakUsageDay && (
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Peak Usage Day:</Text>
            <Text style={styles.statValue}>
              {usageAnalytics.peakUsageDay.usage} units
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>Top Used Products</Text>
      <View style={styles.productsList}>
        {usageAnalytics.topUsedProducts.slice(0, 5).map((product, index) => (
          <View key={product.id} style={styles.productItem}>
            <View style={styles.productRank}>
              <Text style={styles.rankText}>#{index + 1}</Text>
            </View>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productUsage}>
                {product.monthlyUsage} {product.estimatedDaysRemaining !== null ? `• ${product.estimatedDaysRemaining}d left` : ''}
              </Text>
            </View>
            <View style={styles.stockInfo}>
              <Text style={styles.stockText}>
                Stock: {product.currentStock}
              </Text>
              <TrendIndicator trend={product.usageTrend} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const DepartmentUsageCard: React.FC<{ departmentUsage: ReportSummary['departmentUsage'] }> = ({
  departmentUsage,
}) => {
  // Extract department name from the string format
  const getDepartmentName = (departmentString: string) => {
    if (departmentString.includes("'name':")) {
      const match = departmentString.match(/'name':\s*'([^']*)'/);
      return match ? match[1] : departmentString;
    }
    return departmentString;
  };

  return (
    <View style={styles.reportCard}>
      <Text style={styles.cardTitle}>🏢 Department Usage</Text>
      
      <View style={styles.departmentsGrid}>
        {departmentUsage.topDepartments.slice(0, 3).map((dept, index) => (
          <View key={dept.department} style={styles.departmentCard}>
            <View style={styles.departmentHeader}>
              <Text style={styles.departmentName}>
                {getDepartmentName(dept.department)}
              </Text>
              <Text style={styles.departmentUsage}>{dept.totalUsage} units</Text>
            </View>
            
            <Text style={styles.departmentStats}>
              {dept.movementCount} movements • Avg: {dept.averagePerMovement.toFixed(1)}/movement
            </Text>

            <Text style={styles.topProductsTitle}>Top Products:</Text>
            {dept.topProducts.slice(0, 3).map((product) => (
              <View key={product.productId} style={styles.topProductItem}>
                <Text style={styles.productName} numberOfLines={1}>
                  {product.productName}
                </Text>
                <Text style={styles.productQuantity}>
                  {product.totalQuantity} {product.unit}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
};

const ProductPerformanceCard: React.FC<{ productPerformance: ReportSummary['productPerformance'] }> = ({
  productPerformance,
}) => {
  return (
    <View style={styles.reportCard}>
      <Text style={styles.cardTitle}>🎯 Product Performance</Text>

      {/* High Turnover Products */}
      {productPerformance.performanceMetrics.highTurnover.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>🔥 High Turnover Products</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.performanceList}>
              {productPerformance.performanceMetrics.highTurnover.slice(0, 5).map((product) => (
                <View key={product.id} style={styles.performanceItem}>
                  <Text style={styles.performanceName}>{product.name}</Text>
                  <Text style={styles.performanceCategory}>{product.category}</Text>
                  <Text style={styles.performanceStat}>
                    Turnover: {(product.turnoverRate * 100).toFixed(1)}%
                  </Text>
                  <Text style={styles.performanceStat}>
                    Stock: {product.currentStock} • Usage: {product.monthlyUsage}
                  </Text>
                  <TrendIndicator trend={product.usageTrend} />
                </View>
              ))}
            </View>
          </ScrollView>
        </>
      )}

      {/* Needs Reordering */}
      {productPerformance.performanceMetrics.needsReordering.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>⚠️ Needs Reordering</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.performanceList}>
              {productPerformance.performanceMetrics.needsReordering.slice(0, 5).map((product) => (
                <View key={product.id} style={[styles.performanceItem, styles.reorderItem]}>
                  <Text style={styles.performanceName}>{product.name}</Text>
                  <Text style={styles.performanceCategory}>{product.category}</Text>
                  <Text style={styles.performanceStat}>
                    Stock: {product.currentStock} • Est: {product.estimatedDaysRemaining || 0}d left
                  </Text>
                  <Text style={styles.performanceAlert}>
                    {product.stockStatus === 'out_of_stock' ? 'OUT OF STOCK' : 'LOW STOCK'}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </>
      )}
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
        <Text style={styles.loadingText}>Loading reports from server...</Text>
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
        <Text style={styles.title}>📊 Inventory Reports</Text>
        <PeriodSelector period={period} onPeriodChange={handlePeriodChange} />
      </View>

      {reportData ? (
        <>
          {/* Overview Cards */}
          <OverviewCards 
            overview={reportData.overview} 
            movementStats={reportData.movementStatistics} 
          />

          {/* Stock Levels */}
          <StockLevelsCard stockLevels={reportData.stockLevels} />

          {/* Usage Analytics */}
          <UsageAnalyticsCard usageAnalytics={reportData.usageAnalytics} />

          {/* Department Usage */}
          <DepartmentUsageCard departmentUsage={reportData.departmentUsage} />

          {/* Product Performance */}
          <ProductPerformanceCard productPerformance={reportData.productPerformance} />

          {/* Last Updated - FIXED: Safe access to dateRange */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Last updated: {new Date(reportData.timestamp).toLocaleString()}
            </Text>
            <Text style={styles.footerSubtext}>
              Period: {reportData.period}
              {reportData.dateRange && (
                ` • ${reportData.dateRange.startDate.split('T')[0]} to ${reportData.dateRange.endDate.split('T')[0]}`
              )}
            </Text>
          </View>
        </>
      ) : (
        <EmptyState 
          title="No Data Available"
          message="Unable to load report data from the server."
          icon="📡"
        />
      )}
    </ScrollView>
  );
};
// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6c757d',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
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
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
    marginRight: 16,
  },
  // Period Selector
  periodContainer: {
    flexDirection: 'row',
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    padding: 4,
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: '#007AFF',
  },
  periodText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6c757d',
  },
  periodTextActive: {
    color: '#ffffff',
  },
  // Overview Cards
  overviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  card: {
    width: (screenWidth - 48) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardIconText: {
    fontSize: 18,
  },
  cardContent: {
    flex: 1,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 2,
  },
  cardLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 10,
    color: '#adb5bd',
  },
  // Report Cards
  reportCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
    marginTop: 8,
  },
  // Stock Levels
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  statusCount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 10,
    color: '#6c757d',
    textAlign: 'center',
  },
  alertsContainer: {
    gap: 12,
  },
  alertSection: {
    marginTop: 8,
  },
  alertSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  criticalAlert: {
    color: '#dc3545',
  },
  warningAlert: {
    color: '#856404',
  },
  alertList: {
    flexDirection: 'row',
  },
  alertItem: {
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 6,
    marginRight: 8,
    minWidth: 140,
  },
  criticalAlertItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  warningAlertItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  alertItemName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 2,
  },
  alertItemCategory: {
    fontSize: 11,
    color: '#6c757d',
    marginBottom: 2,
  },
  alertItemQuantity: {
    fontSize: 11,
    color: '#6c757d',
  },
  // Usage Analytics
  usageStats: {
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#6c757d',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  productsList: {
    gap: 8,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
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
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 2,
  },
  productUsage: {
    fontSize: 12,
    color: '#6c757d',
  },
  stockInfo: {
    alignItems: 'flex-end',
  },
  stockText: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  // Department Usage
  departmentsGrid: {
    gap: 12,
  },
  departmentCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  departmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  departmentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  departmentUsage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  departmentStats: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 8,
  },
  topProductsTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6c757d',
    marginBottom: 6,
  },
  topProductItem: {
    marginBottom: 6,
  },
  productQuantity: {
    fontSize: 11,
    color: '#6c757d',
  },
  // Product Performance
  performanceList: {
    flexDirection: 'row',
    gap: 12,
  },
  performanceItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    minWidth: 160,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  reorderItem: {
    borderLeftColor: '#dc3545',
  },
  performanceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  performanceCategory: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  performanceStat: {
    fontSize: 11,
    color: '#495057',
    marginBottom: 2,
  },
  performanceAlert: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#dc3545',
    marginTop: 4,
  },
  // Progress Bar
  progressBarContainer: {
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  // Trend Indicator
  trendContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  trendText: {
    fontSize: 10,
    fontWeight: '500',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginVertical: 16,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  footerSubtext: {
    fontSize: 10,
    color: '#adb5bd',
    marginTop: 2,
  },
});

export default ReportsSummaryScreen;