import { Ionicons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  const [searchQuery, setSearchQuery] = useState('');

  const getTodayDate = () => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    };
    return today.toLocaleDateString('en-US', options);
  };

  // Calculate percentage change between current and previous values
  const calculateChange = (current: number, previous: number): string => {
    if (previous === 0) {
      return current > 0 ? '+100%' : '0%';
    }
    
    const change = ((current - previous) / previous) * 100;
    
    if (change === 0) return '0%';
    return `${change > 0 ? '+' : ''}${Math.round(change)}%`;
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

  const filteredDepartments = allDepartments.filter(dept =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dept.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate real percentage changes based on previous and current stats
  const statItems: StatItem[] = [
    { 
      label: "Total Products", 
      value: stats.totalProducts, 
      color: "#8B5CF6", 
      icon: "cube-outline",
      change: calculateChange(stats.totalProducts, previousStats.totalProducts)
    },
    { 
      label: "Out of Stock", 
      value: stats.outOfStock, 
      color: "#EF4444", 
      icon: "alert-circle-outline",
      change: calculateChange(stats.outOfStock, previousStats.outOfStock)
    },
    { 
      label: "Low Stock", 
      value: stats.lowStock, 
      color: "#F59E0B", 
      icon: "warning-outline",
      change: calculateChange(stats.lowStock, previousStats.lowStock)
    },
    { 
      label: "Departments", 
      value: stats.totalDepartments, 
      color: "#3B82F6", 
      icon: "business-outline",
      change: calculateChange(stats.totalDepartments, previousStats.totalDepartments)
    }
  ];

  const StatCard = ({ item }: { item: StatItem }) => {
    const isPositive = !item.change.includes('-') && item.change !== '0%';
    const changeColor = isPositive ? '#10B981' : '#EF4444';
    
    return (
      <View style={[styles.statCard, { backgroundColor: isDarkMode ? "#1E293B" : "#FFFFFF" }]}>
        <View style={styles.statHeader}>
          <View style={[styles.statIconContainer, { backgroundColor: item.color + '20' }]}>
            <Ionicons name={item.icon as any} size={24} color={item.color} />
          </View>
          <View style={[styles.changeBadge, { backgroundColor: changeColor + '20' }]}>
            <Text style={[styles.changeText, { color: changeColor }]}>
              {item.change}
            </Text>
          </View>
        </View>
        <Text style={[styles.statValue, { color: isDarkMode ? "#FFFFFF" : "#1E293B" }]}>
          {item.value}
        </Text>
        <Text style={[styles.statLabel, { color: isDarkMode ? "#94A3B8" : "#64748B" }]}>{item.label}</Text>
      </View>
    );
  };

  const DepartmentCard = ({ department }: { department: Department }) => (
    <TouchableOpacity 
      style={[styles.departmentCard, { backgroundColor: isDarkMode ? "#1E293B" : "#FFFFFF" }]}
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
        <Text style={[styles.departmentName, { color: isDarkMode ? "#FFFFFF" : "#1E293B" }]}>
          {department.name}
        </Text>
        <Text style={[styles.departmentDescription, { color: isDarkMode ? "#94A3B8" : "#64748B" }]} numberOfLines={2}>
          {department.description || 'No description'}
        </Text>
      </View>
      <View style={[styles.chevronContainer, { backgroundColor: isDarkMode ? "#334155" : "#F1F5F9" }]}>
        <Ionicons name="chevron-forward" size={16} color={isDarkMode ? "#CBD5E1" : "#475569"} />
      </View>
    </TouchableOpacity>
  );

  const QuickAction = ({ icon, label, onPress, color }: { icon: string; label: string; onPress: () => void; color: string }) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: color + '20' }]}>
        <Text style={[styles.quickActionEmoji, { color }]}>{icon}</Text>
      </View>
      <Text style={[styles.quickActionLabel, { color: isDarkMode ? "#FFFFFF" : "#1E293B" }]}>{label}</Text>
    </TouchableOpacity>
  );

  const ProductItem = ({ product }: { product: DashboardProduct }) => (
    <TouchableOpacity 
      style={[styles.productItem, { backgroundColor: isDarkMode ? "#1E293B" : "#FFFFFF" }]}
      onPress={() => router.push({
        pathname: "/details/product" as any,
        params: { id: product.id }
      })}
    >
      <View style={styles.productMain}>
        <View style={[styles.productStatus, { 
          backgroundColor: product.alertLevel === 'Out of Stock' ? '#EF4444' : '#F59E0B' 
        }]} />
        <View style={styles.productInfo}>
          <Text style={[styles.productName, { color: isDarkMode ? "#FFFFFF" : "#1E293B" }]}>
            {product.name}
          </Text>
          <Text style={[styles.productId, { color: isDarkMode ? "#94A3B8" : "#64748B" }]}>#{product.id}</Text>
        </View>
      </View>
      <View style={styles.productStock}>
        <View style={[styles.stockBadge, { 
          backgroundColor: product.alertLevel === 'Out of Stock' ? '#EF4444' + '20' : '#F59E0B' + '20' 
        }]}>
          <Text style={[styles.stockValue, { 
            color: product.alertLevel === 'Out of Stock' ? '#EF4444' : '#F59E0B' 
          }]}>
            {product.currentStock}
          </Text>
        </View>
        <Text style={[styles.stockLabel, { color: isDarkMode ? "#94A3B8" : "#64748B" }]}>
          {product.unit || 'units'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const DepartmentsModal = () => (
    <Modal
      visible={showDepartmentsModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowDepartmentsModal(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: isDarkMode ? "#0F172A" : "#F8FAFC" }]}>
        <View style={styles.modalHeader}>
          <View>
            <Text style={[styles.modalTitle, { color: isDarkMode ? "#FFFFFF" : "#1E293B" }]}>
              All Departments
            </Text>
            <Text style={[styles.modalSubtitle, { color: isDarkMode ? "#94A3B8" : "#64748B" }]}>
              {allDepartments.length} departments
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.closeButton, { backgroundColor: isDarkMode ? "#334155" : "#E2E8F0" }]}
            onPress={() => setShowDepartmentsModal(false)}
          >
            <Ionicons name="close" size={20} color={isDarkMode ? "#CBD5E1" : "#475569"} />
          </TouchableOpacity>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: isDarkMode ? "#1E293B" : "#FFFFFF" }]}>
          <Ionicons name="search" size={20} color={isDarkMode ? "#94A3B8" : "#64748B"} />
          <TextInput
            style={[styles.searchInput, { color: isDarkMode ? "#FFFFFF" : "#1E293B" }]}
            placeholder="Search departments..."
            placeholderTextColor={isDarkMode ? "#64748B" : "#94A3B8"}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <FlatList
          data={filteredDepartments}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.modalDepartmentItem, { backgroundColor: isDarkMode ? "#1E293B" : "#FFFFFF" }]}
              onPress={() => {
                setShowDepartmentsModal(false);
                router.push({
                  pathname: "/departments/department-details" as any,
                  params: { 
                    id: item.id,
                    name: item.name,
                    description: item.description,
                    icon: item.icon,
                    color: item.color
                  }
                });
              }}
            >
              <View style={[styles.modalDepartmentIcon, { backgroundColor: item.color }]}>
                <Text style={styles.modalDepartmentEmoji}>{item.icon}</Text>
              </View>
              <View style={styles.modalDepartmentContent}>
                <Text style={[styles.modalDepartmentName, { color: isDarkMode ? "#FFFFFF" : "#1E293B" }]}>
                  {item.name}
                </Text>
                <Text style={[styles.modalDepartmentDescription, { color: isDarkMode ? "#94A3B8" : "#64748B" }]}>
                  {item.description || 'No description available'}
                </Text>
              </View>
              <View style={[styles.modalChevron, { backgroundColor: isDarkMode ? "#334155" : "#F1F5F9" }]}>
                <Ionicons name="chevron-forward" size={16} color={isDarkMode ? "#CBD5E1" : "#475569"} />
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.modalListContent}
        />
      </View>
    </Modal>
  );

  const styles = getStyles(isDarkMode);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={[styles.loadingText, { color: isDarkMode ? "#FFFFFF" : "#1E293B" }]}>
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
            colors={["#3B82F6"]}
            tintColor="#3B82F6"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.greeting}>Welcome back! 👋</Text>
            <Text style={styles.date}>{todayDate}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={[styles.headerButton, { backgroundColor: isDarkMode ? "#334155" : "#E2E8F0" }]}>
              <Ionicons name="search" size={20} color={isDarkMode ? "#CBD5E1" : "#475569"} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.headerButton, { backgroundColor: isDarkMode ? "#334155" : "#E2E8F0" }]}>
              <Ionicons name="notifications-outline" size={20} color={isDarkMode ? "#CBD5E1" : "#475569"} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsSection}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? "#FFFFFF" : "#1E293B" }]}>
            Overview
          </Text>
          <View style={styles.statsGrid}>
            {statItems.map((item) => (
              <StatCard key={item.label} item={item} />
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? "#FFFFFF" : "#1E293B" }]}>
            Quick Actions
          </Text>
          <View style={styles.quickActionsGrid}>
            <QuickAction 
              icon="📦" 
              label="Add Product" 
              onPress={() => router.push('/details/add-product' as any)}
              color="#8B5CF6"
            />
            <QuickAction 
              icon="📊" 
              label="Analytics" 
              onPress={() => router.push('/analytics' as any)}
              color="#3B82F6"
            />
            <QuickAction 
              icon="🏢" 
              label="Departments" 
              onPress={() => setShowDepartmentsModal(true)}
              color="#10B981"
            />
            <QuickAction 
              icon="📋" 
              label="History" 
              onPress={() => router.push('/(tabs)/history' as any)}
              color="#F59E0B"
            />
          </View>
        </View>

        {/* Departments Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? "#FFFFFF" : "#1E293B" }]}>
              Departments
            </Text>
            {allDepartments.length > 0 && (
              <TouchableOpacity 
                style={styles.seeAllButton}
                onPress={() => setShowDepartmentsModal(true)}
              >
                <Text style={styles.seeAllText}>View All</Text>
                <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.departmentsList}>
            {departments.length > 0 ? (
              departments.map((department) => (
                <DepartmentCard key={department.id} department={department} />
              ))
            ) : (
              <View style={[styles.emptyState, { backgroundColor: isDarkMode ? "#1E293B" : "#FFFFFF" }]}>
                <View style={[styles.emptyIcon, { backgroundColor: isDarkMode ? "#334155" : "#F1F5F9" }]}>
                  <Ionicons name="business-outline" size={32} color={isDarkMode ? "#64748B" : "#94A3B8"} />
                </View>
                <Text style={[styles.emptyTitle, { color: isDarkMode ? "#FFFFFF" : "#1E293B" }]}>
                  No Departments Yet
                </Text>
                <Text style={[styles.emptyDescription, { color: isDarkMode ? "#94A3B8" : "#64748B" }]}>
                  Create your first department to organize your products
                </Text>
                <TouchableOpacity 
                  style={[styles.emptyButton, { backgroundColor: "#3B82F6" }]}
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
            <Text style={[styles.sectionTitle, { color: isDarkMode ? "#FFFFFF" : "#1E293B" }]}>
              Stock Alerts
            </Text>
            
            {/* Out of Stock Products */}
            {outOfStockProducts.length > 0 && (
              <View style={styles.alertSection}>
                <View style={styles.alertHeader}>
                  <View style={[styles.alertIcon, { backgroundColor: '#EF4444' }]}>
                    <Ionicons name="alert-circle" size={16} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.alertTitle, { color: isDarkMode ? "#FFFFFF" : "#1E293B" }]}>
                    Out of Stock ({outOfStockProducts.length})
                  </Text>
                </View>
                <View style={[styles.productsList, { backgroundColor: isDarkMode ? "#1E293B" : "#FFFFFF" }]}>
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
                  <View style={[styles.alertIcon, { backgroundColor: '#F59E0B' }]}>
                    <Ionicons name="warning" size={16} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.alertTitle, { color: isDarkMode ? "#FFFFFF" : "#1E293B" }]}>
                    Low Stock ({lowStockProducts.length})
                  </Text>
                </View>
                <View style={[styles.productsList, { backgroundColor: isDarkMode ? "#1E293B" : "#FFFFFF" }]}>
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
            <View style={[styles.allGoodCard, { backgroundColor: isDarkMode ? "#1E293B" : "#FFFFFF" }]}>
              <View style={[styles.allGoodIcon, { backgroundColor: '#10B981' + '20' }]}>
                <Ionicons name="checkmark-circle" size={32} color="#10B981" />
              </View>
              <Text style={[styles.allGoodTitle, { color: isDarkMode ? "#FFFFFF" : "#1E293B" }]}>
                All Products Stocked
              </Text>
              <Text style={[styles.allGoodDescription, { color: isDarkMode ? "#94A3B8" : "#64748B" }]}>
                Great! All your products are properly stocked and ready for use.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <DepartmentsModal />
    </View>
  );
}

const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: isDarkMode ? "#0F172A" : "#F8FAFC",
    paddingTop: 50,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
    marginTop: 10,
  },
  headerContent: {
    flex: 1,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: isDarkMode ? "#FFFFFF" : "#1E293B",
    marginBottom: 4,
  },
  date: {
    fontSize: 16,
    color: isDarkMode ? "#94A3B8" : "#64748B",
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#E2E8F0",
  },
  statsSection: {
    marginBottom: 32,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  statCard: {
    width: (screenWidth - 64) / 2 - 6,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#E2E8F0",
    shadowColor: isDarkMode ? "#000" : "#1E293B",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
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
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 22,
    fontWeight: '700',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: "#3B82F6",
    marginRight: 4,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  quickActionEmoji: {
    fontSize: 24,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
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
    borderColor: isDarkMode ? "#334155" : "#E2E8F0",
    shadowColor: isDarkMode ? "#000" : "#1E293B",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  departmentIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  departmentEmoji: {
    fontSize: 22,
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
  chevronContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: isDarkMode ? "#334155" : "#E2E8F0",
    borderStyle: 'dashed',
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    paddingHorizontal: 24,
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
  alertIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  productsList: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#E2E8F0",
    overflow: 'hidden',
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#F1F5F9",
  },
  productMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  productStatus: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 16,
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
    alignItems: 'flex-end',
  },
  stockBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 4,
  },
  stockValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  stockLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  allGoodCard: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#E2E8F0",
  },
  allGoodIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  allGoodTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
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
  // Modal Styles
  modalContainer: {
    flex: 1,
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#E2E8F0",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#E2E8F0",
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  modalListContent: {
    padding: 20,
  },
  modalDepartmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#E2E8F0",
  },
  modalDepartmentIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  modalDepartmentEmoji: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  modalDepartmentContent: {
    flex: 1,
  },
  modalDepartmentName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalDepartmentDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  modalChevron: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});