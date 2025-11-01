import DepartmentModal from '@/components/departmentModal';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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
  gradient: string[];
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
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [outOfStockProducts, setOutOfStockProducts] = useState<DashboardProduct[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<DashboardProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayDate, setTodayDate] = useState('');
  const [showDepartmentsModal, setShowDepartmentsModal] = useState(false);
  
  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  const getTodayDate = () => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    };
    return today.toLocaleDateString('en-US', options);
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setTodayDate(getTodayDate());
      
      // Load all data in parallel
      const [statsResponse, outOfStockResponse, lowStockResponse, departmentsResponse] = await Promise.all([
        getDashboardStats('daily'),
        getOutOfStockProducts(),
        getLowStockProducts(10),
        departmentService.getDepartments()
      ]);

      // Update stats
      if (statsResponse.success) {
        setStats(prev => ({
          ...prev,
          ...statsResponse.data,
          totalDepartments: departmentsResponse.length
        }));
      }

      // Update products
      if (outOfStockResponse.success) {
        setOutOfStockProducts(outOfStockResponse.data || []);
      }

      if (lowStockResponse.success) {
        setLowStockProducts(lowStockResponse.data || []);
      }

      // Update departments
      setDepartments(departmentsResponse.slice(0, 4));
      setAllDepartments(departmentsResponse);
      
      // Animate content in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        })
      ]).start();
      
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

  // Use useFocusEffect to reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Dashboard focused - reloading data');
      loadDashboardData();
    }, [])
  );

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleDepartmentsUpdate = () => {
    loadDashboardData();
  };

  // Modern gradient colors for stats
  const statItems: StatItem[] = [
    { 
      label: "Total Products", 
      value: stats.totalProducts, 
      color: "#6366F1", 
      icon: "cube-outline",
      gradient: ['#6366F1', '#8B5CF6']
    },
    { 
      label: "Out of Stock", 
      value: stats.outOfStock, 
      color: "#EF4444", 
      icon: "alert-circle-outline",
      gradient: ['#EF4444', '#F97316']
    },
    { 
      label: "Low Stock", 
      value: stats.lowStock, 
      color: "#F59E0B", 
      icon: "warning-outline",
      gradient: ['#F59E0B', '#EAB308']
    },
    { 
      label: "Departments", 
      value: stats.totalDepartments, 
      color: "#10B981", 
      icon: "business-outline",
      gradient: ['#10B981', '#22C55E']
    }
  ];

  const StatCard = ({ item, index }: { item: StatItem; index: number }) => {
    const scaleAnim = useState(new Animated.Value(0.9))[0];
    
    useEffect(() => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay: index * 100,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View 
        style={[
          styles.statCard,
          { 
            transform: [{ scale: scaleAnim }],
            backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
          }
        ]}
      >
        <View style={styles.statHeader}>
          <View style={[styles.statIconContainer, { backgroundColor: item.color + '20' }]}>
            <Ionicons name={item.icon as any} size={20} color={item.color} />
          </View>
          <View style={[styles.pulseDot, { backgroundColor: item.color }]} />
        </View>
        <Text style={[styles.statValue, { color: isDarkMode ? "#F9FAFB" : "#111827" }]}>
          {item.value}
        </Text>
        <Text style={[styles.statLabel, { color: isDarkMode ? "#9CA3AF" : "#6B7280" }]}>
          {item.label}
        </Text>
        <View style={[styles.statGradient, { backgroundColor: item.color + '20' }]} />
      </Animated.View>
    );
  };

  // Updated DepartmentCard - NOT clickable
  const DepartmentCard = ({ department, index }: { department: Department; index: number }) => {
    const slideAnim = useState(new Animated.Value(50))[0];
    const fadeAnim = useState(new Animated.Value(0))[0];

    useEffect(() => {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          delay: index * 100,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          delay: index * 100,
          useNativeDriver: true,
        })
      ]).start();
    }, []);

    return (
      <Animated.View 
        style={[
          styles.departmentCard, 
          { 
            backgroundColor: isDarkMode ? "#1F2937" : "#FFFFFF",
            transform: [{ translateX: slideAnim }],
            opacity: fadeAnim
          }
        ]}
      >
        <View style={[styles.departmentIcon, { backgroundColor: department.color }]}>
          <Text style={styles.departmentEmoji}>{department.icon}</Text>
        </View>
        <View style={styles.departmentInfo}>
          <Text style={[styles.departmentName, { color: isDarkMode ? "#F9FAFB" : "#111827" }]}>
            {department.name}
          </Text>
          <Text style={[styles.departmentDescription, { color: isDarkMode ? "#9CA3AF" : "#6B7280" }]} numberOfLines={2}>
            {department.description || 'No description available'}
          </Text>
        </View>
        <View style={[styles.departmentStatus, { backgroundColor: department.color + '20' }]}>
          <Ionicons name="ellipse" size={8} color={department.color} />
          <Text style={[styles.departmentStatusText, { color: department.color }]}>
            Active
          </Text>
        </View>
      </Animated.View>
    );
  };

  const QuickAction = ({ icon, label, onPress, color, index }: { icon: string; label: string; onPress: () => void; color: string; index: number }) => {
    const scaleAnim = useState(new Animated.Value(0))[0];
    const pressAnim = useState(new Animated.Value(1))[0];
    
    useEffect(() => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay: index * 80,
        useNativeDriver: true,
      }).start();
    }, []);

    const handlePressIn = () => {
      Animated.spring(pressAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(pressAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View 
        style={[
          styles.quickActionWrapper,
          { 
            transform: [{ scale: scaleAnim }, { scale: pressAnim }],
            width: (screenWidth - 60) / 2 // Calculate width for 2 columns
          }
        ]}
      >
        <TouchableOpacity 
          style={[styles.quickAction, { backgroundColor: isDarkMode ? "#1F2937" : "#FFFFFF" }]} 
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.8}
        >
          <View style={styles.quickActionContent}>
            <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
              <Text style={styles.quickActionEmoji}>{icon}</Text>
            </View>
            <Text style={[styles.quickActionLabel, { color: isDarkMode ? "#F9FAFB" : "#111827" }]}>
              {label}
            </Text>
          </View>
          <View style={[styles.quickActionArrow, { backgroundColor: color + '20' }]}>
            <Ionicons name="arrow-forward" size={16} color={color} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const ProductItem = ({ product, index }: { product: DashboardProduct; index: number }) => {
    const slideAnim = useState(new Animated.Value(20))[0];
    const fadeAnim = useState(new Animated.Value(0))[0];

    useEffect(() => {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          delay: index * 60,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          delay: index * 60,
          useNativeDriver: true,
        })
      ]).start();
    }, []);

    const getStatusColor = () => {
      return product.alertLevel === 'Out of Stock' ? '#EF4444' : 
             product.alertLevel === 'Low Stock' ? '#F59E0B' : '#10B981';
    };

    return (
      <Animated.View 
        style={[
          styles.productItem, 
          { 
            backgroundColor: isDarkMode ? "#1F2937" : "#FFFFFF",
            transform: [{ translateY: slideAnim }],
            opacity: fadeAnim
          }
        ]}
      >
        <View style={styles.productInfo}>
          <Text style={[styles.productName, { color: isDarkMode ? "#F9FAFB" : "#111827" }]}>
            {product.name}
          </Text>
          <Text style={[styles.productId, { color: isDarkMode ? "#9CA3AF" : "#6B7280" }]}>
            #{product.id}
          </Text>
        </View>
        <View style={styles.productStock}>
          <View style={[
            styles.stockBadge,
            { backgroundColor: getStatusColor() + '20' }
          ]}>
            <Ionicons 
              name={product.alertLevel === 'Out of Stock' ? "close-circle" : "warning"} 
              size={16} 
              color={getStatusColor()} 
            />
            <Text style={[styles.stockValue, { color: getStatusColor() }]}>
              {product.currentStock}
            </Text>
            <Text style={[styles.stockLabel, { color: isDarkMode ? "#9CA3AF" : "#6B7280" }]}>
              {product.unit || 'units'}
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  const quickActions = [
    { 
      icon: "📦", 
      label: "Add Product", 
      onPress: () => router.push('/details/add-product' as any),
      color: "#F59E0B"
    },
    { 
      icon: "🗂️", 
      label: "Add Category", 
      onPress: () => router.push('/details/create-category' as any),
      color: "#106ab9ff"
    },
    { 
      icon: "🔄", 
      label: "Stock Movement", 
      onPress: () => router.push('/details/stock-movement' as any),
      color: "#6366F1"
    },
    { 
      icon: "🏢", 
      label: "Add Department", 
      onPress: () => router.push('/details/create-department' as any),
      color: "#EF4444"
    }
  ];

  const styles = getStyles(isDarkMode);

  return (
    <View style={styles.container}>
      {/* Loading Indicator at Top */}
      {loading && (
        <View style={styles.topLoadingContainer}>
          <ActivityIndicator size="small" color="#6366F1" />
          <Text style={[styles.topLoadingText, { color: isDarkMode ? "#F9FAFB" : "#111827" }]}>
            Loading dashboard...
          </Text>
        </View>
      )}
      
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
        <Animated.View 
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }}
        >
          {/* Modern Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Welcome back! 👋</Text>
              <Text style={styles.date}>{todayDate}</Text>
            </View>
            {/* Logo Placeholder */}
<View style={styles.logoContainer}>
  <Image 
    source={require('../../assets/images/mlogo.jpeg')} // or your logo path
    style={styles.logoImage}
    resizeMode="contain"
  />
</View>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {statItems.map((item, index) => (
              <StatCard key={item.label} item={item} index={index} />
            ))}
          </View>

          {/* Quick Actions - Fixed Design */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? "#F9FAFB" : "#111827" }]}>
              Quick Actions
            </Text>
            <View style={styles.quickActionsGrid}>
              {quickActions.map((action, index) => (
                <QuickAction 
                  key={action.label}
                  icon={action.icon} 
                  label={action.label} 
                  onPress={action.onPress}
                  color={action.color}
                  index={index}
                />
              ))}
            </View>
          </View>

          {/* Stock Alerts */}
          {(outOfStockProducts.length > 0 || lowStockProducts.length > 0) && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: isDarkMode ? "#F9FAFB" : "#111827" }]}>
                  📊 Stock Alerts
                </Text>
                <TouchableOpacity 
                  style={styles.seeAllButton}
                  onPress={() => router.push('/ProductsScreen' as any)}
                >
                  <Text style={styles.seeAllText}>View All</Text>
                  <Ionicons name="chevron-forward" size={16} color="#6366F1" />
                </TouchableOpacity>
              </View>
              
              {outOfStockProducts.length > 0 && (
                <View style={styles.alertSection}>
                  <View style={styles.alertHeader}>
                    <View style={[styles.alertIcon, { backgroundColor: '#EF4444' }]}>
                      <Ionicons name="close-circle" size={16} color="#FFFFFF" />
                    </View>
                    <Text style={[styles.alertTitle, { color: isDarkMode ? "#F9FAFB" : "#111827" }]}>
                      Out of Stock ({outOfStockProducts.length})
                    </Text>
                  </View>
                  <View style={[styles.productsList, { backgroundColor: isDarkMode ? "#1F2937" : "#FFFFFF" }]}>
                    {outOfStockProducts.slice(0, 3).map((product, index) => (
                      <ProductItem key={product.id} product={product} index={index} />
                    ))}
                  </View>
                </View>
              )}

              {lowStockProducts.length > 0 && (
                <View style={styles.alertSection}>
                  <View style={styles.alertHeader}>
                    <View style={[styles.alertIcon, { backgroundColor: '#F59E0B' }]}>
                      <Ionicons name="warning" size={16} color="#FFFFFF" />
                    </View>
                    <Text style={[styles.alertTitle, { color: isDarkMode ? "#F9FAFB" : "#111827" }]}>
                      Low Stock ({lowStockProducts.length})
                    </Text>
                  </View>
                  <View style={[styles.productsList, { backgroundColor: isDarkMode ? "#1F2937" : "#FFFFFF" }]}>
                    {lowStockProducts.slice(0, 3).map((product, index) => (
                      <ProductItem key={product.id} product={product} index={index} />
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
                <View style={styles.allGoodIcon}>
                  <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                </View>
                <Text style={[styles.allGoodTitle, { color: isDarkMode ? "#F9FAFB" : "#111827" }]}>
                  All Stock Levels Good! 🎉
                </Text>
                <Text style={[styles.allGoodDescription, { color: isDarkMode ? "#9CA3AF" : "#6B7280" }]}>
                  All products are properly stocked and ready for use
                </Text>
              </View>
            </View>
          )}

          {/* Departments Section - Last & Non-clickable */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: isDarkMode ? "#F9FAFB" : "#111827" }]}>
                🏢 Departments
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
                departments.map((department, index) => (
                  <DepartmentCard key={department.id} department={department} index={index} />
                ))
              ) : (
                <View style={[styles.emptyState, { backgroundColor: isDarkMode ? "#1F2937" : "#FFFFFF" }]}>
                  <Ionicons name="business-outline" size={48} color={isDarkMode ? "#4B5563" : "#9CA3AF"} />
                  <Text style={[styles.emptyTitle, { color: isDarkMode ? "#F9FAFB" : "#111827" }]}>
                    No Departments Yet
                  </Text>
                  <Text style={[styles.emptyDescription, { color: isDarkMode ? "#9CA3AF" : "#6B7280" }]}>
                    Create your first department to organize products efficiently
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
        </Animated.View>
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
    backgroundColor: isDarkMode ? "#121212" : "#F9FAFB",
    paddingTop: 60,
    paddingBottom: 50,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  // Top Loading Indicator
  topLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: isDarkMode ? "#1F2937" : "#E5E7EB",
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#374151" : "#D1D5DB",
  },
  topLoadingText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 10,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: isDarkMode ? "#F9FAFB" : "#111827",
    marginBottom: 4,
  },
  date: {
    fontSize: 16,
    color: isDarkMode ? "#6B7280" : "#9CA3AF",
    fontWeight: '500',
  },
  // Logo Container
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 20,
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
      height: 12,
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  statGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: "#6366F1",
    marginRight: 4,
  },
  // Fixed Quick Actions Styles
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  quickActionWrapper: {
    marginBottom: 12,
  },
  quickAction: {
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
    minHeight: 100,
    justifyContent: 'space-between',
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionEmoji: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  quickActionLabel: {
    fontSize: 14,
    fontWeight: '600',
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  quickActionArrow: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  departmentsList: {
    gap: 12,
  },
  departmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
  departmentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  departmentStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
  alertIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    alignItems: 'flex-end',
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  stockValue: {
    fontSize: 14,
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  allGoodIcon: {
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
  // Remove old loading container styles
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },

  logoImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  // OR for the icon/text version:


});