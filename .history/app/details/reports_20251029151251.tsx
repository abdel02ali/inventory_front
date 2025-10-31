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
const API_BASE_URL = process.env.EXPO_BASE_URL; // Replace with your actual server URL

// Enhanced Types (same as before)
interface DepartmentStats {
  id: string;
  name: string;
  totalUsage: number;
  movementCount: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    totalQuantity: number;
    unit: string;
    percentage: number;
  }>;
  monthlyTrend: {
    currentMonth: number;
    previousMonth: number;
    trend: 'up' | 'down' | 'stable';
  };
}

interface ProductStats {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  totalUsage: number;
  monthlyUsage: number;
  departmentUsage: Array<{
    departmentId: string;
    departmentName: string;
    quantity: number;
    percentage: number;
  }>;
  usageTrend: 'increasing' | 'decreasing' | 'stable';
  turnoverRate: number;
  estimatedDaysRemaining: number;
}

interface ReportSummary {
  timestamp: string;
  period: string;
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
      category: string;
    }>;
    outOfStockItems: Array<{
      id: string;
      name: string;
      quantity: number;
      unit: string;
      category: string;
    }>;
  };
  departmentAnalytics: {
    departments: DepartmentStats[];
    totalDepartmentUsage: number;
    mostActiveDepartment: DepartmentStats | null;
    departmentWithHighestGrowth: DepartmentStats | null;
  };
  productAnalytics: {
    topUsedProducts: ProductStats[];
    fastestMovingProducts: ProductStats[];
    productsNeedingReorder: ProductStats[];
    categoryBreakdown: Array<{
      category: string;
      totalUsage: number;
      productCount: number;
      percentage: number;
    }>;
  };
  movementStatistics: {
    totalMovements: number;
    movementTypes: {
      stock_in: number;
      distribution: number;
    };
    dailyAverage: number;
    busiestDay: {
      date: string;
      movements: number;
    };
    monthlyTrend: Array<{
      month: string;
      movements: number;
      usage: number;
    }>;
  };
  usageAnalytics: {
    totalUsage: number;
    averageDailyUsage: number;
    peakUsage: {
      date: string;
      usage: number;
    };
    usageByDayOfWeek: Array<{
      day: string;
      usage: number;
      percentage: number;
    }>;
    usageTrend: 'up' | 'down' | 'stable';
    forecastedUsage: number;
  };
}

// Real API Service
const reportService = {
  async getSummary(period: string = 'month'): Promise<ReportSummary> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/summary?period=${period}`, {
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

      return this.transformApiData(result.data);
    } catch (error) {
      console.error('API Error:', error);
      throw new Error('Failed to connect to server. Please check your connection.');
    }
  },

  // Transform your API response to match our frontend structure
  transformApiData(apiData: any): ReportSummary {
    // This function transforms your backend data structure to match our frontend types
    // Adjust this based on your actual API response structure
    
    return {
      timestamp: apiData.timestamp || new Date().toISOString(),
      period: apiData.period || 'month',
      overview: {
        totalProducts: apiData.overview?.totalProducts || 0,
        totalMovements: apiData.overview?.totalMovements || 0,
        totalUsage: apiData.overview?.totalUsage || 0,
        lowStockItems: apiData.overview?.lowStockItems || 0,
        outOfStockItems: apiData.overview?.outOfStockItems || 0,
        totalDepartments: apiData.overview?.totalDepartments || 0,
        averageDailyUsage: apiData.overview?.averageDailyUsage || 0,
      },
      stockLevels: {
        totalProducts: apiData.stockLevels?.totalProducts || 0,
        lowStockCount: apiData.stockLevels?.lowStockCount || 0,
        outOfStockCount: apiData.stockLevels?.outOfStockCount || 0,
        stockStatus: {
          out_of_stock: apiData.stockLevels?.stockStatus?.out_of_stock || 0,
          low_stock: apiData.stockLevels?.stockStatus?.low_stock || 0,
          medium_stock: apiData.stockLevels?.stockStatus?.medium_stock || 0,
          high_stock: apiData.stockLevels?.stockStatus?.high_stock || 0,
        },
        lowStockItems: apiData.stockLevels?.lowStockItems || [],
        outOfStockItems: apiData.stockLevels?.outOfStockItems || [],
      },
      departmentAnalytics: {
        departments: apiData.departmentAnalytics?.departments || [],
        totalDepartmentUsage: apiData.departmentAnalytics?.totalDepartmentUsage || 0,
        mostActiveDepartment: apiData.departmentAnalytics?.mostActiveDepartment || null,
        departmentWithHighestGrowth: apiData.departmentAnalytics?.departmentWithHighestGrowth || null,
      },
      productAnalytics: {
        topUsedProducts: apiData.productAnalytics?.topUsedProducts || [],
        fastestMovingProducts: apiData.productAnalytics?.fastestMovingProducts || [],
        productsNeedingReorder: apiData.productAnalytics?.productsNeedingReorder || [],
        categoryBreakdown: apiData.productAnalytics?.categoryBreakdown || [],
      },
      movementStatistics: {
        totalMovements: apiData.movementStatistics?.totalMovements || 0,
        movementTypes: {
          stock_in: apiData.movementStatistics?.movementTypes?.stock_in || 0,
          distribution: apiData.movementStatistics?.movementTypes?.distribution || 0,
        },
        dailyAverage: apiData.movementStatistics?.dailyAverage || 0,
        busiestDay: apiData.movementStatistics?.busiestDay || { date: '', movements: 0 },
        monthlyTrend: apiData.movementStatistics?.monthlyTrend || [],
      },
      usageAnalytics: {
        totalUsage: apiData.usageAnalytics?.totalUsage || 0,
        averageDailyUsage: apiData.usageAnalytics?.averageDailyUsage || 0,
        peakUsage: apiData.usageAnalytics?.peakUsage || { date: '', usage: 0 },
        usageByDayOfWeek: apiData.usageAnalytics?.usageByDayOfWeek || [],
        usageTrend: apiData.usageAnalytics?.usageTrend || 'stable',
        forecastedUsage: apiData.usageAnalytics?.forecastedUsage || 0,
      },
    };
  },

  // Optional: If you need to create the backend endpoint
  async generateSampleData(): Promise<any> {
    // This is just to show what data structure your backend should return
    return {
      overview: {
        totalProducts: 156,
        totalMovements: 342,
        totalUsage: 1245,
        lowStockItems: 12,
        outOfStockItems: 3,
        totalDepartments: 8,
        averageDailyUsage: 41.5,
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
          { id: '1', name: 'Surgical Masks', quantity: 5, unit: 'pcs', category: 'PPE' },
        ],
        outOfStockItems: [
          { id: '5', name: 'IV Catheters', quantity: 0, unit: 'pcs', category: 'Medical Supplies' },
        ],
      },
      departmentAnalytics: {
        departments: [
          {
            id: 'ER',
            name: 'Emergency Room',
            totalUsage: 450,
            movementCount: 89,
            topProducts: [
              { productId: '1', productName: 'Surgical Masks', totalQuantity: 150, unit: 'pcs', percentage: 33 },
            ],
            monthlyTrend: {
              currentMonth: 450,
              previousMonth: 420,
              trend: 'up',
            },
          },
        ],
        totalDepartmentUsage: 1050,
        mostActiveDepartment: {
          id: 'ER',
          name: 'Emergency Room',
          totalUsage: 450,
          movementCount: 89,
          topProducts: [
            { productId: '1', productName: 'Surgical Masks', totalQuantity: 150, unit: 'pcs', percentage: 33 },
          ],
          monthlyTrend: {
            currentMonth: 450,
            previousMonth: 420,
            trend: 'up',
          },
        },
        departmentWithHighestGrowth: {
          id: 'ER',
          name: 'Emergency Room',
          totalUsage: 450,
          movementCount: 89,
          topProducts: [
            { productId: '1', productName: 'Surgical Masks', totalQuantity: 150, unit: 'pcs', percentage: 33 },
          ],
          monthlyTrend: {
            currentMonth: 450,
            previousMonth: 420,
            trend: 'up',
          },
        },
      },
      productAnalytics: {
        topUsedProducts: [
          {
            id: '1',
            name: 'Surgical Masks',
            category: 'PPE',
            currentStock: 5,
            totalUsage: 450,
            monthlyUsage: 270,
            departmentUsage: [
              { departmentId: 'ER', departmentName: 'Emergency Room', quantity: 150, percentage: 33 },
            ],
            usageTrend: 'increasing',
            turnoverRate: 0.85,
            estimatedDaysRemaining: 6,
          },
        ],
        fastestMovingProducts: [],
        productsNeedingReorder: [],
        categoryBreakdown: [
          { category: 'PPE', totalUsage: 680, productCount: 25, percentage: 55 },
        ],
      },
      movementStatistics: {
        totalMovements: 342,
        movementTypes: {
          stock_in: 45,
          distribution: 297,
        },
        dailyAverage: 11.4,
        busiestDay: {
          date: '2024-01-15',
          movements: 28,
        },
        monthlyTrend: [
          { month: 'Jan', movements: 342, usage: 1245 },
        ],
      },
      usageAnalytics: {
        totalUsage: 1245,
        averageDailyUsage: 41.5,
        peakUsage: {
          date: '2024-01-15',
          usage: 89,
        },
        usageByDayOfWeek: [
          { day: 'Monday', usage: 210, percentage: 18 },
        ],
        usageTrend: 'up',
        forecastedUsage: 1300,
      },
    };
  },
};

// Utility Components (same as before)
const ProgressBar: React.FC<{ percentage: number; color?: string }> = ({ 
  percentage, 
  color = '#007AFF' 
}) => (
  <View style={styles.progressBarContainer}>
    <View 
      style={[
        styles.progressBarFill, 
        { width: `${percentage}%`, backgroundColor: color }
      ]} 
    />
  </View>
);

const TrendIndicator: React.FC<{ trend: 'up' | 'down' | 'stable' | 'increasing' | 'decreasing' }> = ({ trend }) => {
  const getTrendConfig = () => {
    switch (trend) {
      case 'up':
      case 'increasing':
        return { icon: '📈', color: '#28a745', label: 'Increasing' };
      case 'down':
      case 'decreasing':
        return { icon: '📉', color: '#dc3545', label: 'Decreasing' };
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

const LoadingSkeleton: React.FC = () => (
  <View style={styles.reportCard}>
    <View style={styles.skeletonTitle} />
    <View style={styles.skeletonText} />
    <View style={styles.skeletonText} />
    <View style={styles.skeletonText} />
  </View>
);

// Main Component Sections (same as before, but with empty state checks)
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
  movementStats: ReportSummary['movementStatistics'] 
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
      subtitle: `${movementStats.dailyAverage.toFixed(1)}/day`,
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

const DepartmentAnalytics: React.FC<{ analytics: ReportSummary['departmentAnalytics'] }> = ({ 
  analytics 
}) => {
  if (!analytics.departments || analytics.departments.length === 0) {
    return (
      <View style={styles.reportCard}>
        <Text style={styles.cardTitle}>🏢 Department Analytics</Text>
        <EmptyState 
          title="No Department Data"
          message="Department usage data will appear here once distributions are recorded."
          icon="🏢"
        />
      </View>
    );
  }

  return (
    <View style={styles.reportCard}>
      <Text style={styles.cardTitle}>🏢 Department Analytics</Text>
      
      {/* Most Active Department */}
      {analytics.mostActiveDepartment && (
        <View style={styles.highlightSection}>
          <Text style={styles.highlightTitle}>🏆 Most Active Department</Text>
          <View style={styles.departmentHighlight}>
            <Text style={styles.departmentNameLarge}>
              {analytics.mostActiveDepartment.name}
            </Text>
            <Text style={styles.departmentStats}>
              {analytics.mostActiveDepartment.totalUsage} units • {analytics.mostActiveDepartment.movementCount} movements
            </Text>
            <TrendIndicator trend={analytics.mostActiveDepartment.monthlyTrend.trend} />
          </View>
        </View>
      )}

      {/* Department Breakdown */}
      <Text style={styles.sectionTitle}>Department Breakdown</Text>
      <View style={styles.departmentsGrid}>
        {analytics.departments.map((dept) => (
          <View key={dept.id} style={styles.departmentCard}>
            <View style={styles.departmentHeader}>
              <Text style={styles.departmentName}>{dept.name}</Text>
              <Text style={styles.departmentUsage}>{dept.totalUsage} units</Text>
            </View>
            
            <TrendIndicator trend={dept.monthlyTrend.trend} />
            
            <Text style={styles.topProductsTitle}>Top Products:</Text>
            {dept.topProducts.slice(0, 2).map((product, index) => (
              <View key={product.productId} style={styles.topProductItem}>
                <Text style={styles.productName} numberOfLines={1}>
                  {product.productName}
                </Text>
                <Text style={styles.productQuantity}>
                  {product.totalQuantity} {product.unit}
                </Text>
                <ProgressBar percentage={product.percentage} />
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
};

const ProductAnalytics: React.FC<{ analytics: ReportSummary['productAnalytics'] }> = ({ 
  analytics 
}) => {
  if (!analytics.topUsedProducts || analytics.topUsedProducts.length === 0) {
    return (
      <View style={styles.reportCard}>
        <Text style={styles.cardTitle}>📦 Product Analytics</Text>
        <EmptyState 
          title="No Product Data"
          message="Product usage analytics will appear here once products are used."
          icon="📦"
        />
      </View>
    );
  }

  return (
    <View style={styles.reportCard}>
      <Text style={styles.cardTitle}>📦 Product Analytics</Text>

      {/* Category Breakdown */}
      {analytics.categoryBreakdown && analytics.categoryBreakdown.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Usage by Category</Text>
          <View style={styles.categoriesList}>
            {analytics.categoryBreakdown.map((category) => (
              <View key={category.category} style={styles.categoryItem}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryName}>{category.category}</Text>
                  <Text style={styles.categoryPercentage}>{category.percentage}%</Text>
                </View>
                <Text style={styles.categoryStats}>
                  {category.totalUsage} units • {category.productCount} products
                </Text>
                <ProgressBar percentage={category.percentage} color="#6f42c1" />
              </View>
            ))}
          </View>
        </>
      )}

      {/* Top Used Products */}
      <Text style={styles.sectionTitle}>Top Used Products</Text>
      <View style={styles.productsGrid}>
        {analytics.topUsedProducts.map((product) => (
          <View key={product.id} style={styles.productCard}>
            <View style={styles.productHeader}>
              <Text style={styles.productName} numberOfLines={2}>
                {product.name}
              </Text>
              <Text style={styles.productCategory}>{product.category}</Text>
            </View>
            
            <View style={styles.productStats}>
              <Text style={styles.productStat}>
                📊 {product.monthlyUsage} this month
              </Text>
              <Text style={styles.productStat}>
                📦 Stock: {product.currentStock}
              </Text>
              <Text style={styles.productStat}>
                ⏳ Est: {product.estimatedDaysRemaining}d left
              </Text>
            </View>

            <TrendIndicator trend={product.usageTrend} />

            {/* Top Departments for this product */}
            <Text style={styles.topDeptTitle}>Top Departments:</Text>
            {product.departmentUsage.slice(0, 2).map((dept) => (
              <View key={dept.departmentId} style={styles.deptUsageItem}>
                <Text style={styles.deptName}>{dept.departmentName}</Text>
                <Text style={styles.deptQuantity}>
                  {dept.quantity} ({dept.percentage}%)
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
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
        <Text style={styles.loadingSubtext}>Fetching real-time data</Text>
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
        <Text style={styles.serverHint}>
          Make sure your server is running at: {API_BASE_URL}
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
        <Text style={styles.title}>📊 Live Reports</Text>
        <PeriodSelector period={period} onPeriodChange={handlePeriodChange} />
      </View>

      {reportData ? (
        <>
          {/* Overview Cards */}
          <OverviewCards 
            overview={reportData.overview} 
            movementStats={reportData.movementStatistics} 
          />

          {/* Department Analytics */}
          <DepartmentAnalytics analytics={reportData.departmentAnalytics} />

          {/* Product Analytics */}
          <ProductAnalytics analytics={reportData.productAnalytics} />

          {/* Stock Levels */}
          <StockLevelsCard stockLevels={reportData.stockLevels} />

          {/* Last Updated */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Last updated: {new Date(reportData.timestamp).toLocaleString()}
            </Text>
            <Text style={styles.footerSubtext}>
              Data fetched from server • {period} view
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

// Fixed Styles
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
  // Department Analytics
  highlightSection: {
    backgroundColor: '#e7f1ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  highlightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0056b3',
    marginBottom: 8,
  },
  departmentHighlight: {
    alignItems: 'center',
  },
  departmentNameLarge: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  departmentStats: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
  },
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
  topProductsTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6c757d',
    marginTop: 8,
    marginBottom: 6,
  },
  topProductItem: {
    marginBottom: 6,
  },
  productName: {
    fontSize: 12,
    color: '#2c3e50',
    marginBottom: 2,
  },
  productQuantity: {
    fontSize: 11,
    color: '#6c757d',
    marginBottom: 4,
  },
  // Product Analytics
  categoriesList: {
    gap: 8,
    marginBottom: 16,
  },
  categoryItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
  },
  categoryPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6f42c1',
  },
  categoryStats: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 8,
  },
  productsGrid: {
    gap: 12,
  },
  productCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  productHeader: {
    marginBottom: 8,
  },


  productCategory: {
    fontSize: 12,
    color: '#6c757d',
    backgroundColor: '#e9ecef',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  productStats: {
    marginBottom: 8,
  },
  productStat: {
    fontSize: 12,
    color: '#495057',
    marginBottom: 2,
  },
  topDeptTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6c757d',
    marginTop: 8,
    marginBottom: 6,
  },
  deptUsageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  deptName: {
    fontSize: 11,
    color: '#2c3e50',
    flex: 1,
  },
  deptQuantity: {
    fontSize: 11,
    color: '#6c757d',
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
  skeletonTitle: {
    height: 20,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    marginBottom: 16,
    width: '60%',
  },
  skeletonText: {
    height: 16,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    marginBottom: 8,
    width: '100%',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorDescription: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  serverHint: {
    fontSize: 12,
    color: '#adb5bd',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
  },
  footerSubtext: {
    fontSize: 10,
    color: '#adb5bd',
    marginTop: 2,
  },
});

export default ReportsSummaryScreen;