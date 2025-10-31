import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// Types
interface ReportSummary {
  timestamp: string;
  period: string;
  overview: {
    totalProducts: number;
    totalMovements: number;
    totalUsage: number;
    lowStockItems: number;
    outOfStockItems: number;
  };
  stockLevels: {
    totalProducts: number;
    lowStockCount: number;
    outOfStockCount: number;
    stockStatus: {
      out_of_stock: number;
      low_stock: number;
      medium_stock: number;
      high_stock: number;
    };
    lowStockItems: Array<{
      id: string;
      name: string;
      quantity: number;
      unit: string;
    }>;
    outOfStockItems: Array<{
      id: string;
      name: string;
      quantity: number;
      unit: string;
    }>;
  };
  usageAnalytics: {
    totalUsage: number;
    averageDailyUsage: number;
    topUsedProducts: Array<{
      id: string;
      name: string;
      currentStock: number;
      monthlyUsage: number;
      unit: string;
    }>;
  };
  movementStatistics: {
    totalMovements: number;
    movementTypes: {
      stock_in: number;
      distribution: number;
    };
  };
  departmentUsage: {
    topDepartments: Array<{
      department: string;
      usage: number;
    }>;
  };
}

// Mock data for demonstration
const mockReportData: ReportSummary = {
  timestamp: new Date().toISOString(),
  period: 'month',
  overview: {
    totalProducts: 156,
    totalMovements: 342,
    totalUsage: 1245,
    lowStockItems: 12,
    outOfStockItems: 3,
  },
  stockLevels: {
    totalProducts: 156,
    lowStockCount: 12,
    outOfStockCount: 3,
    stockStatus: {
      out_of_stock: 3,
      low_stock: 12,
      medium_stock: 45,
      high_stock: 96,
    },
    lowStockItems: [
      { id: '1', name: 'Surgical Masks', quantity: 5, unit: 'pcs' },
      { id: '2', name: 'Disposable Gloves', quantity: 8, unit: 'pairs' },
      { id: '3', name: 'Antiseptic Solution', quantity: 3, unit: 'bottles' },
      { id: '4', name: 'Bandages', quantity: 7, unit: 'rolls' },
    ],
    outOfStockItems: [
      { id: '5', name: 'IV Catheters', quantity: 0, unit: 'pcs' },
      { id: '6', name: 'Syringes 10ml', quantity: 0, unit: 'pcs' },
    ],
  },
  usageAnalytics: {
    totalUsage: 1245,
    averageDailyUsage: 41.5,
    topUsedProducts: [
      { id: '1', name: 'Surgical Masks', currentStock: 5, monthlyUsage: 450, unit: 'pcs' },
      { id: '2', name: 'Disposable Gloves', currentStock: 8, monthlyUsage: 320, unit: 'pairs' },
      { id: '3', name: 'Alcohol Wipes', currentStock: 25, monthlyUsage: 280, unit: 'packs' },
      { id: '4', name: 'Bandages', currentStock: 7, monthlyUsage: 195, unit: 'rolls' },
    ],
  },
  movementStatistics: {
    totalMovements: 342,
    movementTypes: {
      stock_in: 45,
      distribution: 297,
    },
  },
  departmentUsage: {
    topDepartments: [
      { department: 'Emergency Room', usage: 450 },
      { department: 'Surgery Ward', usage: 320 },
      { department: 'ICU', usage: 280 },
      { department: 'OPD', usage: 195 },
    ],
  },
};

// Mock API service
const reportService = {
  async getSummary(period: string = 'month'): Promise<ReportSummary> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Return mock data with updated period
    return {
      ...mockReportData,
      period,
      timestamp: new Date().toISOString(),
    };
  },
};

// Period Selector Component
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

// Overview Cards Component
const OverviewCards: React.FC<{ overview: ReportSummary['overview'] }> = ({ overview }) => {
  const cards = [
    {
      label: 'Total Products',
      value: overview.totalProducts,
      icon: '📦',
      color: '#007AFF',
    },
    {
      label: 'Total Movements',
      value: overview.totalMovements,
      icon: '🚚',
      color: '#28a745',
    },
    {
      label: 'Low Stock',
      value: overview.lowStockItems,
      icon: '⚠️',
      color: '#ffc107',
    },
    {
      label: 'Out of Stock',
      value: overview.outOfStockItems,
      icon: '❌',
      color: '#dc3545',
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
          </View>
        </View>
      ))}
    </View>
  );
};

// Stock Levels Component
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

      {stockLevels.lowStockItems.length > 0 && (
        <View style={styles.alertSection}>
          <Text style={styles.alertTitle}>⚠️ Low Stock Items</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.alertList}>
              {stockLevels.lowStockItems.map((item) => (
                <View key={item.id} style={styles.alertItem}>
                  <Text style={styles.alertItemName}>{item.name}</Text>
                  <Text style={styles.alertItemQuantity}>
                    {item.quantity} {item.unit}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {stockLevels.outOfStockItems.length > 0 && (
        <View style={[styles.alertSection, styles.outOfStockSection]}>
          <Text style={[styles.alertTitle, styles.outOfStockTitle]}>
            ❌ Out of Stock
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.alertList}>
              {stockLevels.outOfStockItems.map((item) => (
                <View key={item.id} style={styles.alertItem}>
                  <Text style={styles.alertItemName}>{item.name}</Text>
                  <Text style={styles.alertItemQuantity}>Out of stock</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
};

// Usage Analytics Component
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
      </View>

      <Text style={styles.sectionTitle}>Top Used Products</Text>
      <View style={styles.productsList}>
        {usageAnalytics.topUsedProducts.map((product, index) => (
          <View key={product.id} style={styles.productItem}>
            <View style={styles.productRank}>
              <Text style={styles.rankText}>#{index + 1}</Text>
            </View>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productUsage}>
                {product.monthlyUsage} {product.unit} this month
              </Text>
            </View>
            <View style={styles.stockInfo}>
              <Text style={styles.stockText}>
                Stock: {product.currentStock}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// Movement Statistics Component
const MovementStatisticsCard: React.FC<{ movementStatistics: ReportSummary['movementStatistics'] }> = ({
  movementStatistics,
}) => {
  const movementTypes = [
    {
      type: 'stock_in',
      label: 'Stock In',
      icon: '⬇️',
      color: '#28a745',
      count: movementStatistics.movementTypes.stock_in,
    },
    {
      type: 'distribution',
      label: 'Distribution',
      icon: '⬆️',
      color: '#007AFF',
      count: movementStatistics.movementTypes.distribution,
    },
  ];

  return (
    <View style={styles.reportCard}>
      <Text style={styles.cardTitle}>🔄 Movement Statistics</Text>
      
      <View style={styles.totalMovements}>
        <Text style={styles.totalLabel}>Total Movements</Text>
        <Text style={styles.totalValue}>{movementStatistics.totalMovements}</Text>
      </View>

      <View style={styles.movementTypes}>
        {movementTypes.map((item) => (
          <View key={item.type} style={styles.movementType}>
            <View style={[styles.typeIcon, { backgroundColor: item.color }]}>
              <Text style={styles.typeIconText}>{item.icon}</Text>
            </View>
            <View style={styles.typeInfo}>
              <Text style={styles.typeLabel}>{item.label}</Text>
              <Text style={styles.typeCount}>{item.count} movements</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// Department Usage Component
const DepartmentUsageCard: React.FC<{ departmentUsage: ReportSummary['departmentUsage'] }> = ({
  departmentUsage,
}) => {
  return (
    <View style={styles.reportCard}>
      <Text style={styles.cardTitle}>🏢 Department Usage</Text>
      
      <View style={styles.departmentsList}>
        {departmentUsage.topDepartments.map((dept, index) => (
          <View key={dept.department} style={styles.departmentItem}>
            <View style={styles.departmentRank}>
              <Text style={styles.rankText}>#{index + 1}</Text>
            </View>
            <View style={styles.departmentInfo}>
              <Text style={styles.departmentName}>{dept.department}</Text>
              <Text style={styles.departmentUsage}>
                {dept.usage} units used
              </Text>
            </View>
            <View style={styles.usageBar}>
              <View
                style={[
                  styles.usageFill,
                  {
                    width: `${Math.min((dept.usage / (departmentUsage.topDepartments[0]?.usage || 1)) * 100, 100)}%`,
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </View>

      {departmentUsage.topDepartments.length === 0 && (
        <Text style={styles.noDataText}>No department usage data available</Text>
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
      Alert.alert('Error', errorMessage);
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
        <Text style={styles.errorText}>Error: {error}</Text>
        <Text style={styles.retryText} onPress={loadReportData}>
          Tap to retry
        </Text>
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
        <Text style={styles.title}>Reports Summary</Text>
        <PeriodSelector period={period} onPeriodChange={handlePeriodChange} />
      </View>

      {reportData && (
        <>
          {/* Overview Cards */}
          <OverviewCards overview={reportData.overview} />

          {/* Stock Levels */}
          <StockLevelsCard stockLevels={reportData.stockLevels} />

          {/* Usage Analytics */}
          <UsageAnalyticsCard usageAnalytics={reportData.usageAnalytics} />

          {/* Movement Statistics */}
          <MovementStatisticsCard movementStatistics={reportData.movementStatistics} />

          {/* Department Usage */}
          <DepartmentUsageCard departmentUsage={reportData.departmentUsage} />

          {/* Last Updated */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Last updated: {new Date(reportData.timestamp).toLocaleString()}
            </Text>
          </View>
        </>
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
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 8,
  },
  retryText: {
    fontSize: 14,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
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
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
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
    marginRight: 12,
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
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 12,
    color: '#6c757d',
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
  alertSection: {
    marginTop: 8,
  },
  outOfStockSection: {
    marginTop: 12,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  outOfStockTitle: {
    color: '#721c24',
  },
  alertList: {
    flexDirection: 'row',
  },
  alertItem: {
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 6,
    marginRight: 8,
    minWidth: 120,
  },
  alertItemName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2c3e50',
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
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
  },
  // Movement Statistics
  totalMovements: {
    alignItems: 'center',
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  movementTypes: {
    gap: 12,
  },
  movementType: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  typeIconText: {
    fontSize: 16,
  },
  typeInfo: {
    flex: 1,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 2,
  },
  typeCount: {
    fontSize: 12,
    color: '#6c757d',
  },
  // Department Usage
  departmentsList: {
    gap: 12,
  },
  departmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  departmentRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6c757d',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  departmentInfo: {
    flex: 1,
  },
  departmentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 2,
  },
  departmentUsage: {
    fontSize: 12,
    color: '#6c757d',
  },
  usageBar: {
    width: 60,
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
    overflow: 'hidden',
  },
  usageFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  noDataText: {
    textAlign: 'center',
    color: '#6c757d',
    fontStyle: 'italic',
    marginVertical: 16,
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
});

export default ReportsSummaryScreen;