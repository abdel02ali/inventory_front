import DepartmentModal from '@/components/departmentModal';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme
} from "react-native";
import { getDashboardStats, getLowStockProducts, getOutOfStockProducts } from "../../services/dashboard";
import { departmentService } from '../../services/departmentService';
import { Department } from "../types/department";

interface StatItem {
  label: string;
  value: number | string;
  color: string;
  icon: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
}

interface DashboardProduct {
  id: string;
  name: string;
  currentStock: number;
  alertLevel: string;
  unit?: string;
}

interface DashboardStats {
  totalProducts: number;
  outOfStock: number;
  lowStock: number;
  totalDepartments: number;
  totalMovements: number;
  recentActivity: number;
  totalValue?: number;
}

const { width: screenWidth } = Dimensions.get('window');

export default function Dashboard() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    outOfStock: 0,
    lowStock: 0,
    totalDepartments: 0,
    totalMovements: 0,
    recentActivity: 0
  });
  const [previousStats, setPreviousStats] = useState<DashboardStats>({
    totalProducts: 0,
    outOfStock: 0,
    lowStock: 0,
    totalDepartments: 0,
    totalMovements: 0,
    recentActivity: 0
  });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [outOfStockProducts, setOutOfStockProducts] = useState<DashboardProduct[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<DashboardProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayDate, setTodayDate] = useState('');
  const [showDepartmentsModal, setShowDepartmentsModal] = useState(false);

  const getTodayDate = () => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    };
    return today.toLocaleDateString('en-US', options);
  };

  // Calculate percentage change and trend
  const calculateChange = (current: number, previous: number): { change: string; trend: 'up' | 'down' | 'neutral' } => {
    if (previous === 0) {
      return { change: current > 0 ? '+100%' : '0%', trend: current > 0 ? 'up' : 'neutral' };
    }
    
    const change = ((current - previous) / previous) * 100;
    
    if (change === 0) return { change: '0%', trend: 'neutral' };
    return { 
      change: `${change > 0 ? '+' : ''}${Math.round(change)}%`,
      trend: change > 0 ? 'up' : 'down'
    };
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setTodayDate(getTodayDate());
      
      // Store current stats as previous before updating
      setPreviousStats({ ...stats });
      
      // Load all data in parallel
      const [statsResponse, outOfStockResponse, lowStockResponse, departmentsResponse] = await Promise.all([
        getDashboardStats('daily'),
        getOutOfStockProducts(),
        getLowStockProducts(10),
        departmentService.getDepartments()
      ]);
      
      console.log('📊 Dashboard data loaded:', {
        stats: statsResponse.data,
        outOfStock: outOfStockResponse.data?.length,
        lowStock: lowStockResponse.data?.length,
        departments: departmentsResponse.length
      });

      // Update stats
      if (statsResponse.success) {
        setStats(prev => ({
          ...prev,
          ...statsResponse.data,
          totalDepartments: departmentsResponse.length
        }));
      } else {
        console.warn('Failed to load stats:', statsResponse.message);
      }

      // Update products
      if (outOfStockResponse.success) {
        setOutOfStockProducts(outOfStockResponse.data || []);
      } else {
        console.warn('Failed to load out of stock products:', outOfStockResponse.message);
      }

      if (lowStockResponse.success) {
        setLowStockProducts(lowStockResponse.data || []);
      } else {
        console.warn('Failed to load low stock products:', lowStockResponse.message);
      }

      // Update departments
      setDepartments(departmentsResponse.slice(0, 4));
      setAllDepartments(departmentsResponse);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleDepartmentsUpdate = () => {
    // Refresh departments data when modal updates occur
    loadDashboardData();
  };

  // Calculate stats with trends
  const statItems: StatItem[] = [
    { 
      label: "Total Products", 
      value: stats.totalProducts, 
      color: "#6366F1", 
      icon: "cube-outline",
      ...calculateChange(stats.totalProducts, previousStats.totalProducts)
    },
    { 
      label: "Out of Stock", 
      value: stats.outOfStock, 
      color: "#EF4444", 
      icon: "alert-circle-outline",
      ...calculateChange(stats.outOfStock, previousStats.outOfStock)
    },
    { 
      label: "Low Stock", 
      value: stats.lowStock, 
      color: "#F59E0B", 
      icon: "warning-outline",
      ...calculateChange(stats.lowStock, previousStats.lowStock)
    },
    { 
      label: "Departments", 
      value: stats.totalDepartments, 
      color: "#10B981", 
      icon: "business-outline",
      ...calculateChange(stats.totalDepartments, previousStats.totalDepartments)
    }
  ];

  const StatCard = ({ item }: { item: StatItem }) => {
    const trendIcon = item.trend === 'up' ? 'trending-up' : item.trend === 'down' ? 'trending-down' : 'remove';
    const trendColor = item.trend === 'up' ? '#10B981' : item.trend === 'down' ? '#EF4444' : '#6B7280';
    
    return (
      <View style={[styles.statCard, { backgroundColor: item.color }]}>
        <View style={styles.statHeader}>
          <View style={styles.statIconContainer}>
            <Ionicons name={item.icon as any} size={24} color="#FFFFFF" />
          </View>
          <View style={[styles.trendBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Ionicons name={trendIcon as any} size={12} color="#FFFFFF" />
            <Text style={styles.trendText}>{item.change}</Text>
          </View>
        </View>
        <Text style={styles.statValue}>{item.value}</Text>
        <Text style={styles.statLabel}>{item.label}</Text>
      </View>
    );
  };

  const DepartmentCard = ({ department }: { department: Department }) => (
    <TouchableOpacity 
      style={[styles.departmentCard, { backgroundColor: isDarkMode ? "#1F2937" : "#FFFFFF" }]}
      onPress={() => router.push({
        pathname: "/departments/department-details" as any,
        params: { 
          id: department.id,
          name: department.name,
          description: department.description,
          icon: department.icon,
          color: department.color
        }
      })}
    >
      <View style={[styles.departmentIcon, { backgroundColor: department.color }]}>
        <Text style={styles.departmentEmoji}>{department.icon}</Text>
      </View>
      <View style={styles.departmentInfo}>
        <Text style={[styles.departmentName, { color: isDarkMode ? "#F9FAFB" : "#111827" }]}>
          {department.name}
        </Text>
        <Text style={[styles.departmentDescription, { color: isDarkMode ? "#9CA3AF" : "#6B7280" }]} numberOfLines={2}>
          {department.description || 'No description'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={isDarkMode ? "#4B5563" : "#9CA3AF"} />
    </TouchableOpacity>
  );

  const QuickAction = ({ icon, label, onPress, color }: { icon: string; label: string; onPress: () => void; color: string }) => (
    <TouchableOpacity 
      style={[styles.quickAction, { backgroundColor: isDarkMode ? "#1F2937" : "#FFFFFF" }]} 
      onPress={onPress}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
        <Text style={styles.quickActionEmoji}>{icon}</Text>
      </View>
      <Text style={[styles.quickActionLabel, { color: isDarkMode ? "#F9FAFB" : "#111827" }]}>{label}</Text>
    </TouchableOpacity>
  );

  // Updated ProductItem - NOT touchable
  const ProductItem = ({ product }: { product: DashboardProduct }) => (
    <View style={[styles.productItem, { backgroundColor: isDarkMode ? "#1F2937" : "#FFFFFF" }]}>
      <View style={styles.productInfo}>
        <Text style={[styles.productName, { color: isDarkMode ? "#F9FAFB" : "#111827" }]}>
          {product.name}
        </Text>
        <Text style={[styles.productId, { color: isDarkMode ? "#9CA3AF" : "#6B7280" }]}>#{product.id}</Text>
      </View>
      <View style={styles.productStock}>
        <View style={[
          styles.stockIndicator,
          { 
            backgroundColor: product.alertLevel === 'Out of Stock' ? '#EF4444' : 
                           product.alertLevel === 'Low Stock' ? '#F59E0B' : '#10B981'
          }
        ]} />
        <View style={styles.stockInfo}>
          <Text style={[
            styles.stockValue,
            { color: product.alertLevel === 'Out of Stock' ? '#EF4444' : 
                    product.alertLevel === 'Low Stock' ? '#F59E0B' : '#10B981' }
          ]}>
            {product.currentStock}
          </Text>
          <Text style={[styles.stockLabel, { color: isDarkMode ? "#9CA3AF" : "#6B7280" }]}>
            {product.unit || 'units'}
          </Text>
        </View>
      </View>
    </View>
  );

  const styles = getStyles(isDarkMode);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={[styles.loadingText, { color: isDarkMode ? "#F9FAFB" : "#111827" }]}>
          Loading dashboard...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#6366F1"]}
            tintColor="#6366F1"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Dashboard</Text>
            <Text style={styles.date}>{todayDate}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={[styles.headerButton, { backgroundColor: isDarkMode ? "#374151" : "#E5E7EB" }]}>
              <Ionicons name="search" size={20} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.headerButton, { backgroundColor: isDarkMode ? "#374151" : "#E5E7EB" }]}>
              <Ionicons name="notifications-outline" size={20} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {statItems.map((item) => (
            <StatCard key={item.label} item={item} />
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? "#F9FAFB" : "#111827" }]}>
            Quick Actions
          </Text>
          <View style={styles.quickActionsGrid}>
            <QuickAction 
              icon="📦" 
              label="Add Product" 
              onPress={() => router.push('/details/add-product' as any)}
              color="#6366F1"
            />
            <QuickAction 
              icon="📊" 
              label="Analytics" 
              onPress={() => router.push('/analytics' as any)}
              color="#10B981"
            />
            <QuickAction 
              icon="🏢" 
              label="Departments" 
              onPress={() => setShowDepartmentsModal(true)}
              color="#F59E0B"
            />
            <QuickAction 
              icon="📋" 
              label="Reports" 
              onPress={() => router.push('/reports' as any)}
              color="#EF4444"
            />
          </View>
        </View>

        {/* Departments Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? "#F9FAFB" : "#111827" }]}>
              Departments
            </Text>
            {allDepartments.length > 0 && (
              <TouchableOpacity 
                style={styles.seeAllButton}
                onPress={() => setShowDepartmentsModal(true)}
              >
                <Text style={styles.seeAllText}>View All</Text>
                <Ionicons name="chevron-forward" size={16} color="#6366F1" />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.departmentsList}>
            {departments.length > 0 ? (
              departments.map((department) => (
                <DepartmentCard key={department.id} department={department} />
              ))
            ) : (
              <View style={[styles.emptyState, { backgroundColor: isDarkMode ? "#1F2937" : "#FFFFFF" }]}>
                <Ionicons name="business-outline" size={48} color={isDarkMode ? "#4B5563" : "#9CA3AF"} />
                <Text style={[styles.emptyTitle, { color: isDarkMode ? "#F9FAFB" : "#111827" }]}>
                  No Departments
                </Text>
                <Text style={[styles.emptyDescription, { color: isDarkMode ? "#9CA3AF" : "#6B7280" }]}>
                  Create your first department to organize products
                </Text>
                <TouchableOpacity 
                  style={[styles.emptyButton, { backgroundColor: "#6366F1" }]}
                  onPress={() => router.push('/details/create-department' as any)}
                >
                  <Text style={styles.emptyButtonText}>Create Department</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Stock Alerts */}
{(outOfStockProducts.length > 0 || lowStockProducts.length > 0) && (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: isDarkMode ? "#F9FAFB" : "#111827" }]}>
        Stock Alerts
      </Text>
      <TouchableOpacity 
        style={styles.seeAllButton}
        onPress={() => router.push('/ProductsScreen' as any)}
      >
        <Text style={styles.seeAllText}>See All</Text>
        <Ionicons name="chevron-forward" size={16} color="#6366F1" />
      </TouchableOpacity>
    </View>
    
    {/* Out of Stock Products */}
    {outOfStockProducts.length > 0 && (
      <View style={styles.alertSection}>
        <View style={styles.alertHeader}>
          <View style={[styles.alertDot, { backgroundColor: '#EF4444' }]} />
          <Text style={[styles.alertTitle, { color: isDarkMode ? "#F9FAFB" : "#111827" }]}>
            Out of Stock ({outOfStockProducts.length})
          </Text>
        </View>
        <View style={[styles.productsList, { backgroundColor: isDarkMode ? "#1F2937" : "#FFFFFF" }]}>
          {outOfStockProducts.slice(0, 3).map((product) => (
            <ProductItem key={product.id} product={product} />
          ))}
        </View>
      </View>
    )}

    {/* Low Stock Products */}
    {lowStockProducts.length > 0 && (
      <View style={styles.alertSection}>
        <View style={styles.alertHeader}>
          <View style={[styles.alertDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={[styles.alertTitle, { color: isDarkMode ? "#F9FAFB" : "#111827" }]}>
            Low Stock ({lowStockProducts.length})
          </Text>
        </View>
        <View style={[styles.productsList, { backgroundColor: isDarkMode ? "#1F2937" : "#FFFFFF" }]}>
          {lowStockProducts.slice(0, 3).map((product) => (
            <ProductItem key={product.id} product={product} />
          ))}
        </View>
      </View>
    )}
  </View>
)}

{/* All Stock Good Message */}
{outOfStockProducts.length === 0 && lowStockProducts.length === 0 && (
  <View style={styles.section}>
    <View style={[styles.allGoodCard, { backgroundColor: isDarkMode ? "#1F2937" : "#FFFFFF" }]}>
      <Ionicons name="checkmark-circle" size={48} color="#10B981" />
      <Text style={[styles.allGoodTitle, { color: isDarkMode ? "#F9FAFB" : "#111827" }]}>
        All Stock Levels Good
      </Text>
      <Text style={[styles.allGoodDescription, { color: isDarkMode ? "#9CA3AF" : "#6B7280" }]}>
        All products are properly stocked and ready for use
      </Text>
    </View>
  </View>
)}
      </ScrollView>

      {/* Department Modal */}
      <DepartmentModal
        visible={showDepartmentsModal}
        onClose={() => setShowDepartmentsModal(false)}
        departments={allDepartments}
        onDepartmentsUpdate={handleDepartmentsUpdate}
      />
    </View>
  );
}

const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: isDarkMode ? "#111827" : "#F9FAFB",
    paddingTop: 50,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 10,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '800',
    color: isDarkMode ? "#F9FAFB" : "#111827",
    marginBottom: 4,
  },
  date: {
    fontSize: 16,
    color: isDarkMode ? "#6B7280" : "#9CA3AF",
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    width: (screenWidth - 72) / 2,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: "#6366F1",
    marginRight: 4,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? "#374151" : "#E5E7EB",
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionEmoji: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  departmentsList: {
    gap: 12,
  },
  departmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? "#374151" : "#E5E7EB",
  },
  departmentIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  departmentEmoji: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  departmentInfo: {
    flex: 1,
  },
  departmentName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  departmentDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: isDarkMode ? "#374151" : "#E5E7EB",
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  alertSection: {
    marginBottom: 20,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  productsList: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? "#374151" : "#E5E7EB",
    overflow: 'hidden',
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#374151" : "#F3F4F6",
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  productId: {
    fontSize: 12,
    fontWeight: '500',
  },
  productStock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stockIndicator: {
    width: 4,
    height: 32,
    borderRadius: 2,
  },
  stockInfo: {
    alignItems: 'flex-end',
  },
  stockValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  stockLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  allGoodCard: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? "#374151" : "#E5E7EB",
  },
  allGoodTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  allGoodDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
});